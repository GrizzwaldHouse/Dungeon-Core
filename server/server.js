// server.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Keep multiplayer room state and collision authoritative across concurrent sockets.

'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const { serveClient } = require('./static-client');
const { selectAttackTarget } = require('./combat-target');
const { Server } = require('socket.io');
const { TICK_HZ, TICK_MS, createServerConfig } = require('./config/game-parameters');
const { createIntroVote, completeIntroVote, castIntroSkipVote, reconcileIntroVote,
  publicIntroVote } = require('./intro-vote');
const { startFloorTwo, stepFloorTwo, publicFloorTwo, floorTwoComplete } = require('./floor-two');
const { createFloorThreeState, stepFloorThree, claimFloorThreeResource,
  enterFloorThreeRest, publicFloorThree } = require('./floor-three');
const { startDeepwood, stepDeepwood, publicDeepwood, deepwoodComplete,
  deepwoodWarnings } = require('./deepwood');
const { startFloorFour, stepFloorFour, publicFloorFour, floorFourComplete } = require('./floor-four');
const { startFloorFive, stepFloorFive, publicFloorFive, floorFiveComplete } = require('./floor-five');
const {
  ACTION_ID_PATTERN, TRAP_WARNING_TICKS, TRAP_ACTIVE_TICKS, TRAP_DAMAGE,
  RUSH_DURATION_TICKS, RUSH_DAMAGE_BASIS_POINTS, createRun, currentPortal,
  routeDestination, requiredObjectiveComplete, explorationBasisPoints,
  publicRun, calculateAwards
} = require('./dungeon-run');

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 symbols
const ROOM_CODE_LENGTH = 4;
const PROTOCOL_VERSION = 1;

const ROOM_PHASES = Object.freeze({ LOBBY: 'LOBBY', RUNNING: 'RUNNING', COMPLETED: 'COMPLETED', FAILED: 'FAILED', CLOSED: 'CLOSED' });
const MOCK_PLAYER_NAMES = Object.freeze(['Mock Ember', 'Mock Moss', 'Mock Vale', 'Mock Rune', 'Mock Ash']);
const MOCK_OPENING_GRACE_MS = 3200;
const MOCK_SHARED_ATTACK_COOLDOWN_MS = 1200;
const MOCK_ATTACK_DAMAGE = 8;
const MOCK_SPAWNS = Object.freeze([
  Object.freeze({ x: 4, y: 0, z: 0 }),
  Object.freeze({ x: 0, y: 0, z: 4 }),
  Object.freeze({ x: 4, y: 0, z: 4 }),
  Object.freeze({ x: 4, y: 0, z: -4 }),
  Object.freeze({ x: 0, y: 0, z: -4 })
]);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizeRoomCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function normalizeDisplayName(value, maxLength) {
  if (typeof value !== 'string') return null;
  const name = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
  return name.length ? name : null;
}

function pointInsideAabb(point, box, padding = 0) {
  return point.x >= box.min.x - padding && point.x <= box.max.x + padding &&
    point.y >= box.min.y - padding && point.y <= box.max.y + padding &&
    point.z >= box.min.z - padding && point.z <= box.max.z + padding;
}

function sphereIntersectsAabb(position, radius, box) {
  const x = clamp(position.x, box.min.x, box.max.x);
  const y = clamp(position.y, box.min.y, box.max.y);
  const z = clamp(position.z, box.min.z, box.max.z);
  const dx = position.x - x;
  const dy = position.y - y;
  const dz = position.z - z;
  return dx * dx + dy * dy + dz * dz < radius * radius;
}

function segmentIntersectsAabb(from, to, box) {
  let near = 0;
  let far = 1;
  for (const axis of ['x', 'z']) {
    const delta = to[axis] - from[axis];
    if (Math.abs(delta) < 1e-9) {
      if (from[axis] >= box.min[axis] && from[axis] <= box.max[axis]) continue;
      return false;
    }
    const first = (box.min[axis] - from[axis]) / delta;
    const second = (box.max[axis] - from[axis]) / delta;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return false;
  }
  return far >= 0 && near <= 1 && box.min.y <= 1 && box.max.y >= 0;
}

function copyVector(vector) {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function safeAck(ack, body) {
  if (typeof ack === 'function') {
    try { ack(body); } catch {
      // Client acknowledgements can fail at the transport boundary.
    }
  }
}

function makeRoomCode(roomsByCode) {
  // 32^4 = 1,048,576 codes. Bound retries, then fail closed under saturation.
  for (let attempt = 0; attempt < 64; attempt += 1) {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
      code += ROOM_CODE_ALPHABET[crypto.randomInt(0, ROOM_CODE_ALPHABET.length)];
    }
    if (!roomsByCode.has(code)) return code;
  }
  throw new Error('Unable to allocate a unique room code');
}

function makeToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function tokenDigest(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createGameServer(options = {}) {
  const config = createServerConfig(options);
  const publicBoundaryRejections = { roomAttempts: 0, roomCapacity: 0, socketRequests: 0 };
  const configuredOrigins = (Array.isArray(config.corsOrigin) ? config.corsOrigin :
    String(config.corsOrigin).split(',')).map((origin) => origin.trim());
  for (const origin of configuredOrigins) {
    if (origin === '*') continue;
    let parsed;
    try { parsed = new URL(origin); } catch { throw new TypeError('corsOrigin must contain HTTP(S) origins'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new TypeError('corsOrigin must contain exact HTTP(S) origins without paths');
    }
  }
  if (configuredOrigins.includes('*') && configuredOrigins.length !== 1) {
    throw new TypeError('corsOrigin wildcard cannot be combined with explicit origins');
  }

  function allowedSocketOrigin(request) {
    const origin = request.headers.origin;
    // Native probes do not send Origin. This is browser isolation, not client authentication.
    if (origin === undefined) return true;
    let parsed;
    try { parsed = new URL(origin); } catch { return false; }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) return false;
    if (!configuredOrigins.includes('*')) return configuredOrigins.includes(origin);
    // Never use arbitrary X-Forwarded-Host or X-Forwarded-For to grant access.
    return parsed.host.toLowerCase() === String(request.headers.host || '').toLowerCase();
  }

  const server = options.httpServer || http.createServer((request, response) => {
    if (request.url === '/healthz') {
      response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ ok: true, tickHz: TICK_HZ, rooms: roomsByCode.size }));
      return;
    }
    serveClient(request, response);
  });

  const io = options.io || new Server(server, {
    cors: { origin: configuredOrigins.includes('*') ? '*' : configuredOrigins, methods: ['GET', 'POST'] },
    allowRequest: (request, done) => {
      const allowed = allowedSocketOrigin(request) && (io.engine?.clientsCount ?? 0) < config.maxConnections;
      if (!allowed) publicBoundaryRejections.socketRequests += 1;
      done(null, allowed);
    },
    maxHttpBufferSize: config.maxPayloadBytes,
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
    connectionStateRecovery: { maxDisconnectionDuration: config.disconnectGraceMs, skipMiddlewares: false }
  });
  // allowRequest covers initial handshakes. Check subsequent polling and upgrade requests too,
  // so an existing Engine.IO session ID cannot bypass the browser origin boundary.
  io.engine?.use((request, _response, next) => {
    if (request._query?.sid && !allowedSocketOrigin(request)) {
      publicBoundaryRejections.socketRequests += 1;
      return next(new Error('Forbidden origin'));
    }
    next();
  });

  // `roomsByCode` is the join-code index. `roomsById` is the authoritative
  // aggregate index. `socketToPlayer` prevents a socket from controlling two
  // player records and lets disconnect handling find the owning room quickly.
  const roomsByCode = new Map();
  const roomsById = new Map();
  const socketToPlayer = new Map();
  const roomAttemptBudgets = new WeakMap();
  const aggregateRoomAttempts = { startedAt: performance.now(), count: 0 };
  let serverTick = 0;
  let closed = false;
  let nextDeadline = performance.now() + config.tickMs;
  let schedulerTimer = null;
  const metrics = {
    schedulerTicks: 0,
    roomTicks: 0,
    snapshotsBroadcast: 0,
    inputRejections: 0,
    inputRejectionsByReason: Object.create(null),
    recentTickDurationsMs: [],
    recentScheduleLatenessMs: []
  };

  function addMetricSample(samples, value) {
    samples.push(value);
    if (samples.length > config.metricSampleLimit) samples.shift();
  }

  function rejectInput(ack, error) {
    metrics.inputRejections += 1;
    metrics.inputRejectionsByReason[error] = (metrics.inputRejectionsByReason[error] || 0) + 1;
    safeAck(ack, { ok: false, error });
  }

  function activePlayerCount(room) {
    let count = 0;
    for (const player of room.players.values()) if (player.connection !== 'REMOVED') count += 1;
    return count;
  }

  function roomForSocket(socket) {
    const binding = socketToPlayer.get(socket.id);
    if (!binding) return null;
    const room = roomsById.get(binding.roomId);
    const player = room && room.players.get(binding.playerId);
    if (!room || !player || player.connection !== 'CONNECTED' || player.socketId !== socket.id || player.sessionEpoch !== binding.sessionEpoch) return null;
    return { room, player };
  }

  function publicPlayer(player) {
    return {
      playerId: player.playerId,
      displayName: player.displayName,
      connection: player.connection,
      transform: { position: copyVector(player.transform.position), rotation: copyVector(player.transform.rotation) },
      health: { current: player.health.current, max: player.health.max },
      metrics: { ...player.metrics },
      xp: { ...player.xp },
      inventory: { ...player.inventory },
      statusEffects: player.statusEffects.map((effect) => ({ ...effect })),
      bot: player.bot ? { intent: player.bot.intent, targetId: player.bot.targetId } : null,
      lastInputSeq: player.input.lastSeq,
      discoveredNodeIds: [...player.discoveredNodeIds]
    };
  }

  function publicEnemy(enemy) {
    return {
      enemyId: enemy.enemyId,
      kind: enemy.kind,
      state: enemy.health.current > 0 ? 'ACTIVE' : 'DEFEATED',
      transform: { position: copyVector(enemy.transform.position), rotation: copyVector(enemy.transform.rotation) },
      health: { current: enemy.health.current, max: enemy.health.max }
    };
  }

  function makeSnapshot(room) {
    const players = {};
    const enemies = {};
    for (const [playerId, player] of room.players) {
      if (player.connection !== 'REMOVED') players[playerId] = publicPlayer(player);
    }
    for (const [enemyId, enemy] of room.enemies) enemies[enemyId] = publicEnemy(enemy);
    return {
      protocolVersion: PROTOCOL_VERSION,
      roomCode: room.code,
      roomId: room.roomId,
      phase: room.phase,
      results: room.results ? structuredClone(room.results) : null,
      hostPlayerId: [...room.players.values()].find((candidate) => candidate.connection !== 'REMOVED')?.playerId ?? null,
      tick: room.tick,
      revision: room.revision,
      intro: publicIntroVote(room.intro, room.players),
      revealedNodeIds: [...room.revealedNodeIds],
      players,
      enemies,
      items: [...room.items.values()].filter((item) => !item.hidden ||
        room.floorThree?.discoveredNodeIds.includes(item.id)).map((item) => ({ id: item.id, kind: item.kind,
        position: copyVector(item.position), claimedBy: [...item.claimedBy] })),
      warnings: [...(room.run?.stage === 'DEEPWOOD' ? deepwoodWarnings(room) : []),
        room.run?.stage === 'FLOOR_TWO' ? room.floorTwo?.warning :
        room.run?.stage === 'FLOOR_FOUR' ? room.floorFour?.warning :
          room.run?.stage === 'FLOOR_FIVE' ? room.floorFive?.warning : null].filter(Boolean)
        .map((warning) => ({ id: warning.id || `warning-${warning.kind}`, kind: warning.kind,
          position: copyVector(warning.position), radius: warning.radius ||
            (warning.kind === 'HEX_BLAST' ? 2.5 : warning.kind === 'RUNE_TRAP' ? 2.2 : 1.2),
          endsAtTick: warning.endsAtTick })),
      encounter: room.run?.stage === 'FLOOR_TWO' ? publicFloorTwo(room) :
        room.run?.stage === 'FLOOR_THREE' && room.floorThree ? publicFloorThree(room.floorThree) :
          room.run?.stage === 'DEEPWOOD' ? publicDeepwood(room) :
          room.run?.stage === 'FLOOR_FOUR' ? publicFloorFour(room) :
            room.run?.stage === 'FLOOR_FIVE' ? publicFloorFive(room) : null,
      ...publicRun(room)
    };
  }

  function emitSnapshot(room) {
    if (room.phase === ROOM_PHASES.CLOSED) return;
    room.revision += 1;
    metrics.snapshotsBroadcast += 1;
    io.to(room.code).emit('room:snapshot', makeSnapshot(room));
  }

  function emitRoster(room, eventName, player) {
    io.to(room.code).emit(eventName, {
      protocolVersion: PROTOCOL_VERSION,
      roomCode: room.code,
      tick: room.tick,
      revision: room.revision,
      player: publicPlayer(player)
    });
  }

  function emitIntroUpdate(room) {
    io.to(room.code).emit('intro:updated', {
      protocolVersion: PROTOCOL_VERSION,
      roomCode: room.code,
      tick: room.tick,
      revision: room.revision,
      intro: publicIntroVote(room.intro, room.players)
    });
  }

  function reconcileRoomIntro(room) {
    const result = reconcileIntroVote(room.intro, room.players, room.tick);
    if (result.changed) {
      room.revision += 1;
      emitIntroUpdate(room);
    }
    return result;
  }

  // Why: Each new down raises bounded dungeon pressure exactly once, including damage from traps and bosses.
  // Input: A trusted room/player after authoritative damage has reduced health to zero.
  // Output: At most one threat increment and a room-scoped event; repeat damage cannot stack it.
  function markPlayerDown(room, player) {
    if (player.health.current > 0 || player.downedAtTick !== null) return;
    player.downedAtTick = room.tick;
    if (room.run) room.run.threatStacks = Math.min(5, room.run.threatStacks + 1);
    room.revision += 1;
    io.to(room.code).emit('player:downed', { protocolVersion: PROTOCOL_VERSION, roomCode: room.code,
      tick: room.tick, revision: room.revision, playerId: player.playerId,
      threatStacks: room.run?.threatStacks ?? 0 });
  }

  // Why: A finished party needs a clear loss state instead of a room that ticks forever without actors.
  // Input: Trusted players after all damage for the current room tick.
  // Output: One failed-run transition when every remaining human explorer is down.
  function checkPartyWipe(room) {
    if (room.phase !== ROOM_PHASES.RUNNING) return;
    const humans = [...room.players.values()].filter((player) => player.connection !== 'BOT' && player.connection !== 'REMOVED');
    if (!humans.length || humans.some((player) => player.health.current > 0)) return;
    room.phase = ROOM_PHASES.FAILED;
    room.completedAt = Date.now();
    room.revision += 1;
    io.to(room.code).emit('run:failed', { protocolVersion: PROTOCOL_VERSION, roomCode: room.code,
      tick: room.tick, revision: room.revision, floorIndex: room.run?.floorIndex ?? 0 });
    emitSnapshot(room);
  }

  function disposeRoom(room, reason) {
    if (!room || room.phase === ROOM_PHASES.CLOSED) return;
    room.phase = ROOM_PHASES.CLOSED;
    room.closedAt = Date.now();
    roomsByCode.delete(room.code);
    roomsById.delete(room.roomId);
    for (const player of room.players.values()) {
      if (player.socketId) socketToPlayer.delete(player.socketId);
      if (player.reconnectDigest) reconnectIndex.delete(player.reconnectDigest);
    }
    io.to(room.code).emit('room:closed', { protocolVersion: PROTOCOL_VERSION, roomCode: room.code, reason });
    io.in(room.code).socketsLeave(room.code);
  }

  const reconnectIndex = new Map(); // digest -> { roomId, playerId }

  function createPlayer(displayName, socket, initialPosition = { x: 0, y: 0, z: 0 }, bot = null) {
    const isBot = bot !== null;
    const playerId = randomId(isBot ? 'bot' : 'p');
    const reconnectToken = isBot ? null : makeToken();
    const digest = reconnectToken ? tokenDigest(reconnectToken) : null;
    return {
      player: {
        playerId,
        displayName,
        socketId: isBot ? null : socket.id,
        sessionEpoch: 1,
        connection: isBot ? 'BOT' : 'CONNECTED',
        transform: { position: copyVector(initialPosition), rotation: { x: 0, y: 0, z: 0 } },
        health: { current: config.maxHealth, max: config.maxHealth },
        metrics: { damageDealt: 0, nodesDiscovered: 0, portalsSolved: 0, trapsDisarmed: 0, supportActions: 0 },
        xp: { base: 0, bonus: 0, total: 0 },
        inventory: { healingCharges: 0, riches: 0 },
        downedAtTick: null,
        statusEffects: [],
        discoveredNodeIds: new Set(),
        input: { x: 0, z: 0, rotationY: 0, lastSeq: -1, lastReceivedAt: 0, recentTimes: [] },
        combat: { nextAttackAt: 0, recentActions: new Map() },
        portal: { recentActions: new Map() },
        trap: { recentActions: new Map() },
        item: { recentActions: new Map() },
        revive: { recentActions: new Map() },
        recovery: { nextAllowedTick: 0 },
        reconnectDigest: digest,
        disconnectedAt: null,
        removeAt: null,
        bot
      },
      reconnectToken
    };
  }

  function createMockPlayer(index) {
    const spawn = MOCK_SPAWNS[index % MOCK_SPAWNS.length];
    const created = createPlayer(MOCK_PLAYER_NAMES[index % MOCK_PLAYER_NAMES.length], null, spawn, {
      index, intent: 'PATROL', targetId: null, waypointIndex: index, nextDecisionTick: 0
    });
    created.player.inventory.healingCharges = 2;
    return created;
  }

  function attachSocket(room, player, socket, reconnectToken = null) {
    if (player.socketId) socketToPlayer.delete(player.socketId);
    player.socketId = socket.id;
    player.sessionEpoch += 1;
    player.connection = 'CONNECTED';
    player.disconnectedAt = null;
    player.removeAt = null;
    player.input.x = 0;
    player.input.z = 0;
    player.input.lastReceivedAt = performance.now();
    const binding = { roomId: room.roomId, playerId: player.playerId, sessionEpoch: player.sessionEpoch };
    socketToPlayer.set(socket.id, binding);
    socket.join(room.code);
    if (reconnectToken) {
      const oldDigest = player.reconnectDigest;
      if (oldDigest) reconnectIndex.delete(oldDigest);
      player.reconnectDigest = tokenDigest(reconnectToken);
    }
    if (player.reconnectDigest) reconnectIndex.set(player.reconnectDigest, { roomId: room.roomId, playerId: player.playerId });
  }

  function createRoom(socket, payload, ack) {
    const displayName = normalizeDisplayName(payload && payload.displayName, config.maxDisplayNameLength);
    if (!displayName) return safeAck(ack, { ok: false, error: 'INVALID_DISPLAY_NAME' });
    if (socketToPlayer.has(socket.id)) return safeAck(ack, { ok: false, error: 'ALREADY_IN_ROOM' });
    if (roomsByCode.size >= config.maxRooms) {
      publicBoundaryRejections.roomCapacity += 1;
      return safeAck(ack, { ok: false, error: 'SERVER_ROOM_CAPACITY' });
    }

    let code;
    try { code = makeRoomCode(roomsByCode); } catch { return safeAck(ack, { ok: false, error: 'ROOM_CODE_CAPACITY' }); }
    const roomId = randomId('room');
    const room = {
      roomId,
      code,
      phase: ROOM_PHASES.LOBBY,
      createdAt: Date.now(),
      expiresAt: Date.now() + config.roomCodeTtlMs,
      revision: 0,
      tick: serverTick,
      players: new Map(),
      enemies: new Map(),
      items: new Map(),
      layoutWorld: config.world,
      world: config.world,
      obstacles: config.world.obstacles,
      discoveryNodes: config.world.discoveryNodes,
      revealedNodeIds: new Set(),
      lastActivityAt: Date.now(),
      nextIdleCheckAt: 0,
      run: null,
      intro: createIntroVote(serverTick),
      pendingPortalActions: [],
      completedAt: null
    };
    const created = createPlayer(displayName, socket, { x: 0, y: 0, z: 0 });
    room.players.set(created.player.playerId, created.player);
    roomsByCode.set(code, room);
    roomsById.set(roomId, room);
    attachSocket(room, created.player, socket);
    emitSnapshot(room);
    safeAck(ack, {
      ok: true,
      roomCode: code,
      playerId: created.player.playerId,
      reconnectToken: created.reconnectToken,
      snapshot: makeSnapshot(room)
    });
  }

  function joinRoom(socket, payload, ack) {
    const code = normalizeRoomCode(payload && payload.roomCode);
    const displayName = normalizeDisplayName(payload && payload.displayName, config.maxDisplayNameLength);
    if (!/^[A-HJ-NP-Z2-9]{4}$/.test(code)) return safeAck(ack, { ok: false, error: 'ROOM_NOT_FOUND' });
    if (!displayName) return safeAck(ack, { ok: false, error: 'INVALID_DISPLAY_NAME' });
    if (socketToPlayer.has(socket.id)) return safeAck(ack, { ok: false, error: 'ALREADY_IN_ROOM' });
    const room = roomsByCode.get(code);
    if (!room || room.expiresAt <= Date.now() || room.phase !== ROOM_PHASES.LOBBY) return safeAck(ack, { ok: false, error: 'ROOM_NOT_FOUND' });
    if (activePlayerCount(room) >= config.maxPlayers) return safeAck(ack, { ok: false, error: 'ROOM_FULL' });

    const created = createPlayer(displayName, socket, { x: 0, y: 0, z: 0 });
    room.players.set(created.player.playerId, created.player);
    room.lastActivityAt = Date.now();
    attachSocket(room, created.player, socket);
    emitRoster(room, 'player:joined', created.player);
    emitSnapshot(room);
    safeAck(ack, {
      ok: true,
      roomCode: room.code,
      playerId: created.player.playerId,
      reconnectToken: created.reconnectToken,
      snapshot: makeSnapshot(room)
    });
  }

  function rejoinRoom(socket, payload, ack) {
    const code = normalizeRoomCode(payload && payload.roomCode);
    const token = payload && payload.reconnectToken;
    if (!/^[A-HJ-NP-Z2-9]{4}$/.test(code) || typeof token !== 'string' || token.length < 32 || token.length > 128) {
      return safeAck(ack, { ok: false, error: 'INVALID_REJOIN' });
    }
    if (socketToPlayer.has(socket.id)) return safeAck(ack, { ok: false, error: 'ALREADY_IN_ROOM' });
    const digest = tokenDigest(token);
    const binding = reconnectIndex.get(digest);
    const room = binding && roomsById.get(binding.roomId);
    const player = room && room.players.get(binding.playerId);
    if (!room || room.code !== code || !player || player.connection !== 'DISCONNECTED' || player.removeAt <= Date.now()) {
      return safeAck(ack, { ok: false, error: 'INVALID_REJOIN' });
    }

    const nextToken = makeToken();
    attachSocket(room, player, socket, nextToken);
    room.lastActivityAt = Date.now();
    room.revision += 1;
    emitRoster(room, 'player:reconnected', player);
    safeAck(ack, { ok: true, roomCode: room.code, playerId: player.playerId, reconnectToken: nextToken, snapshot: makeSnapshot(room) });
    emitSnapshot(room);
  }

  function startRoom(socket, payload, ack) {
    const found = roomForSocket(socket);
    if (!found) return safeAck(ack, { ok: false, error: 'NOT_IN_ROOM' });
    const { room, player } = found;
    if (room.phase !== ROOM_PHASES.LOBBY) return safeAck(ack, { ok: false, error: 'INVALID_PHASE' });
    const host = [...room.players.values()].find((candidate) => candidate.connection !== 'REMOVED');
    if (player.playerId !== host?.playerId) return safeAck(ack, { ok: false, error: 'HOST_ONLY' });
    const activeCount = [...room.players.values()].filter((candidate) => candidate.connection === 'CONNECTED' || candidate.connection === 'BOT').length;
    if (activeCount < config.minPlayers) return safeAck(ack, { ok: false, error: 'NOT_ENOUGH_PLAYERS' });
    const introChanged = completeIntroVote(room.intro, room.players, room.tick, 'ROOM_STARTED').changed;
    room.phase = ROOM_PHASES.RUNNING;
    room.run = createRun(room.world, room.tick);
    room.nextMockAttackAt = performance.now() + MOCK_OPENING_GRACE_MS;
    const enemyId = randomId('enemy');
    room.enemies.set(enemyId, {
      enemyId,
      kind: 'SENTINEL',
      transform: { position: enemySpawn(room), rotation: { x: 0, y: 0, z: 0 } },
      health: { current: config.combat.enemyMaxHealth, max: config.combat.enemyMaxHealth },
      nextAttackAt: 0
    });
    room.revision += 1;
    if (introChanged) emitIntroUpdate(room);
    io.to(room.code).emit('run:started', { protocolVersion: PROTOCOL_VERSION, roomCode: room.code, tick: room.tick, revision: room.revision });
    emitSnapshot(room);
    safeAck(ack, { ok: true, revision: room.revision });
  }

  function addMockPlayers(socket, payload, ack) {
    const found = roomForSocket(socket);
    if (!found) return safeAck(ack, { ok: false, error: 'NOT_IN_ROOM' });
    const { room, player } = found;
    if (room.phase !== ROOM_PHASES.LOBBY) return safeAck(ack, { ok: false, error: 'INVALID_PHASE' });
    const host = [...room.players.values()].find((candidate) => candidate.connection !== 'REMOVED');
    if (player.playerId !== host?.playerId) return safeAck(ack, { ok: false, error: 'HOST_ONLY' });
    const requested = payload?.count === undefined ? 4 : payload.count;
    if (!Number.isSafeInteger(requested) || requested < 1 || requested > config.maxPlayers) {
      return safeAck(ack, { ok: false, error: 'INVALID_MOCK_COUNT' });
    }
    const remaining = config.maxPlayers - activePlayerCount(room);
    const count = Math.min(requested, remaining);
    if (count < 1) return safeAck(ack, { ok: false, error: 'ROOM_FULL' });
    let mockIndex = [...room.players.values()].filter((candidate) => candidate.connection === 'BOT').length;
    for (let index = 0; index < count; index += 1) {
      const created = createMockPlayer(mockIndex++);
      room.players.set(created.player.playerId, created.player);
      emitRoster(room, 'player:joined', created.player);
    }
    room.lastActivityAt = Date.now();
    emitSnapshot(room);
    safeAck(ack, { ok: true, added: count, snapshot: makeSnapshot(room) });
  }

  function voteToSkipIntro(socket, payload, ack) {
    const found = roomForSocket(socket);
    if (!found) return safeAck(ack, { ok: false, error: 'NOT_IN_ROOM' });
    const { room, player } = found;
    const actionId = payload?.actionId;
    if (!isRecord(payload) || typeof actionId !== 'string' || !ACTION_ID_PATTERN.test(actionId)) {
      return safeAck(ack, { ok: false, error: 'INVALID_INTRO_VOTE' });
    }
    const result = castIntroSkipVote(room.intro, room.players, player.playerId, room.tick);
    if (!result.ok) return safeAck(ack, result);
    if (result.changed) {
      room.revision += 1;
      emitIntroUpdate(room);
      emitSnapshot(room);
    }
    safeAck(ack, {
      ok: true,
      actionId,
      duplicate: result.duplicate,
      completed: result.completed,
      intro: publicIntroVote(room.intro, room.players)
    });
  }

  function acceptInput(socket, payload, ack) {
    const found = roomForSocket(socket);
    if (!found || found.room.phase !== ROOM_PHASES.RUNNING) return rejectInput(ack, 'NOT_IN_RUNNING_ROOM');
    const { room, player } = found;
    if (!isRecord(payload) || !Number.isSafeInteger(payload.inputSeq) || !finiteNumber(payload.moveX) || !finiteNumber(payload.moveZ)) {
      return rejectInput(ack, 'INVALID_INPUT');
    }
    if (payload.inputSeq <= player.input.lastSeq) return rejectInput(ack, 'STALE_INPUT');
    const now = performance.now();
    const times = player.input.recentTimes.filter((time) => now - time < 1000);
    if (times.length >= config.inputRatePerSecond) return rejectInput(ack, 'INPUT_RATE_LIMITED');
    times.push(now);
    player.input.recentTimes = times;
    let x = clamp(payload.moveX, -config.maxInputMagnitude, config.maxInputMagnitude);
    let z = clamp(payload.moveZ, -config.maxInputMagnitude, config.maxInputMagnitude);
    const magnitude = Math.hypot(x, z);
    if (magnitude > 1) { x /= magnitude; z /= magnitude; }
    player.input.x = x;
    player.input.z = z;
    if (finiteNumber(payload.rotationY)) player.input.rotationY = clamp(payload.rotationY, -Math.PI * 100, Math.PI * 100);
    player.input.lastSeq = payload.inputSeq;
    player.input.lastReceivedAt = now;
    room.lastActivityAt = Date.now();
    safeAck(ack, { ok: true, inputSeq: payload.inputSeq });
  }

  // Why: A player pinned by a control or geometry fault needs a bounded recovery on the current floor.
  // Input: A socket-bound human in a running room; no client position or destination is trusted.
  // Output: Server-selected safe start position, or a cooldown/state error without changing the run.
  function recoverPosition(socket, _payload, ack) {
    const found = roomForSocket(socket);
    if (!found || found.room.phase !== ROOM_PHASES.RUNNING) return safeAck(ack, { ok: false, error: 'NOT_IN_RUNNING_ROOM' });
    const { room, player } = found;
    if (player.connection !== 'CONNECTED' || player.health.current <= 0) {
      return safeAck(ack, { ok: false, error: 'PLAYER_UNAVAILABLE' });
    }
    if (room.tick < player.recovery.nextAllowedTick) return safeAck(ack, { ok: false, error: 'RECOVERY_COOLDOWN' });
    const position = safePartyPosition(room, { x: 0, y: 0, z: 0 }, 0, room.world);
    if (!position) return safeAck(ack, { ok: false, error: 'NO_SAFE_SPAWN' });
    player.transform.position = { ...position };
    player.input.x = 0;
    player.input.z = 0;
    player.input.lastReceivedAt = 0;
    player.recovery.nextAllowedTick = room.tick + 30 * TICK_HZ;
    room.lastActivityAt = Date.now();
    emitSnapshot(room);
    safeAck(ack, { ok: true, floorIndex: room.run?.floorIndex ?? 0, spaceId: room.run?.currentSpaceId });
  }

  function validateInteract(socket, payload, ack) {
    const found = roomForSocket(socket);
    if (!found || found.room.phase !== ROOM_PHASES.RUNNING) return safeAck(ack, { ok: false, error: 'NOT_IN_RUNNING_ROOM' });
    const { room, player } = found;
    if (!isRecord(payload) || typeof payload.nodeId !== 'string' || payload.nodeId.length > 100) return safeAck(ack, { ok: false, error: 'INVALID_NODE' });
    const node = room.discoveryNodes.find((entry) => entry.id === payload.nodeId);
    if (!node) return safeAck(ack, { ok: false, error: 'NODE_NOT_FOUND' });
    const position = player.transform.position;
    const radius = config.playerRadius + 0.75;
    if (!pointInsideAabb(position, node.bounds, radius)) return safeAck(ack, { ok: false, error: 'OUT_OF_RANGE' });
    if (player.discoveredNodeIds.has(node.id)) return safeAck(ack, { ok: true, alreadyDiscovered: true, nodeId: node.id });
    if (player.discoveredNodeIds.size >= config.maxDiscoveredNodes) return safeAck(ack, { ok: false, error: 'DISCOVERY_LIMIT' });
    player.discoveredNodeIds.add(node.id);
    room.revealedNodeIds.add(node.id);
    player.metrics.nodesDiscovered += 1;
    room.revision += 1;
    io.to(room.code).emit('node:discovered', {
      protocolVersion: PROTOCOL_VERSION,
      roomCode: room.code,
      tick: room.tick,
      revision: room.revision,
      playerId: player.playerId,
      nodeId: node.id
    });
    safeAck(ack, { ok: true, nodeId: node.id, revision: room.revision });
  }

  // Why: Human and mock attacks must use one authoritative range, line-of-sight, damage, and event path.
  // Input: Trusted room/player state, monotonic clock, and optional validated action and target IDs.
  // Output: One bounded attack result; target intent never supplies authoritative geometry or damage.
  // Watch Out: Callers decide whether to emit an immediate snapshot because the fixed tick already emits one.
  function resolvePlayerAttack(room, player, now, actionId = null, immediateSnapshot = false, targetEnemyId) {
    let result;
    if (player.health.current <= 0) result = { ok: false, error: 'PLAYER_DOWN' };
    else if (now < player.combat.nextAttackAt) result = { ok: false, error: 'ATTACK_COOLDOWN' };
    else {
      const selection = selectAttackTarget(room, player, config.combat.playerAttackRangeMeters,
        (origin, position) => !room.obstacles.some((box) =>
          (!box.revealNodeId || !room.revealedNodeIds.has(box.revealNodeId)) &&
          segmentIntersectsAabb(origin, position, box)), targetEnemyId);
      const target = selection.target;
      if (!target) result = { ok: false, error: selection.error };
      else {
        const damage = Math.min(target.health.current,
          player.connection === 'BOT' ? Math.min(MOCK_ATTACK_DAMAGE, config.combat.playerAttackDamage) : config.combat.playerAttackDamage);
        target.health.current -= damage;
        player.metrics.damageDealt += damage;
        player.combat.nextAttackAt = now + config.combat.playerAttackCooldownMs;
        room.lastActivityAt = Date.now();
        room.revision += 1;
        result = { ok: true, ...(actionId ? { actionId } : {}), enemyId: target.enemyId,
          damage, remainingHealth: target.health.current, defeated: target.health.current === 0 };
        io.to(room.code).emit('combat:enemy-hit', {
          protocolVersion: PROTOCOL_VERSION, roomCode: room.code, tick: room.tick, revision: room.revision,
          enemyId: target.enemyId, attackerPlayerId: player.playerId,
          damage, currentHealth: target.health.current, defeated: result.defeated
        });
        if (immediateSnapshot) emitSnapshot(room);
      }
    }
    return result;
  }

  function attackEnemy(socket, payload, ack) {
    const found = roomForSocket(socket);
    if (!found || found.room.phase !== ROOM_PHASES.RUNNING) return safeAck(ack, { ok: false, error: 'NOT_IN_RUNNING_ROOM' });
    const { room, player } = found;
    const actionId = payload?.actionId;
    if (!isRecord(payload) || typeof actionId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(actionId)) {
      return safeAck(ack, { ok: false, error: 'INVALID_ACTION' });
    }
    const prior = player.combat.recentActions.get(actionId);
    if (prior) return safeAck(ack, prior);
    if (payload.targetEnemyId !== undefined && (typeof payload.targetEnemyId !== 'string' ||
      !/^[A-Za-z0-9_-]{1,80}$/.test(payload.targetEnemyId))) {
      return safeAck(ack, { ok: false, error: 'INVALID_TARGET' });
    }
    const result = resolvePlayerAttack(room, player, performance.now(), actionId, true, payload.targetEnemyId);
    player.combat.recentActions.set(actionId, result);
    if (player.combat.recentActions.size > 32) player.combat.recentActions.delete(player.combat.recentActions.keys().next().value);
    safeAck(ack, result);
  }

  // Why: Keep portal requests idempotent while the 30 Hz simulation decides their outcome.
  // Input: Untrusted portal ID and action ID from a socket-bound player.
  // Output: One acknowledgement after the next room tick, or an immediate validation error.
  // Watch Out: Duplicate requests share the same pending result and cannot enqueue a second transition.
  function queuePortalAction(socket, payload, ack) {
    const found = roomForSocket(socket);
    if (!found) return safeAck(ack, { ok: false, error: 'NOT_IN_ROOM' });
    const { room, player } = found;
    if (!isRecord(payload) || typeof payload.actionId !== 'string' || !ACTION_ID_PATTERN.test(payload.actionId) ||
      typeof payload.portalId !== 'string' || !/^[a-z0-9-]{1,40}$/.test(payload.portalId)) {
      return safeAck(ack, { ok: false, error: 'INVALID_PORTAL_ACTION' });
    }
    const prior = player.portal.recentActions.get(payload.actionId);
    if (prior) {
      if (prior.result) safeAck(ack, prior.result);
      else prior.callbacks.push(ack);
      return;
    }
    if (room.phase !== ROOM_PHASES.RUNNING || !room.run) return safeAck(ack, { ok: false, error: 'NOT_IN_RUNNING_ROOM' });
    if (room.pendingPortalActions.length >= 16) return safeAck(ack, { ok: false, error: 'PORTAL_BUSY' });
    const record = { result: null, callbacks: [ack] };
    player.portal.recentActions.set(payload.actionId, record);
    if (player.portal.recentActions.size > 32) player.portal.recentActions.delete(player.portal.recentActions.keys().next().value);
    room.pendingPortalActions.push({ playerId: player.playerId, sessionEpoch: player.sessionEpoch,
      actionId: payload.actionId, portalId: payload.portalId, record });
  }

  function safePartyPosition(room, preferred, offset, destinationWorld) {
    const radius = config.playerRadius;
    const { min, max } = destinationWorld.bounds;
    const candidates = [
      { x: preferred.x + offset, y: 0, z: preferred.z },
      preferred,
      { x: 0, y: 0, z: 0 },
      { x: preferred.x, y: 0, z: preferred.z + 2 },
      { x: preferred.x, y: 0, z: preferred.z - 2 }
    ];
    return candidates.find((position) => position.x >= min.x + radius && position.x <= max.x - radius &&
      position.z >= min.z + radius && position.z <= max.z - radius &&
      !destinationWorld.obstacles.some((box) => (!box.revealNodeId || !room.revealedNodeIds.has(box.revealNodeId)) &&
        sphereIntersectsAabb(position, radius, box))) || null;
  }

  function finishPortalAction(action, result) {
    action.record.result = result;
    for (const ack of action.record.callbacks) safeAck(ack, result);
    action.record.callbacks.length = 0;
  }

  // Why: Switching geometry and the whole party together prevents partial floor transfers.
  // Input: Trusted room, target space, and a server-selected landing point.
  // Output: True after all travelers have safe positions; false leaves the old floor intact.
  function transferParty(room, spaceId, landing) {
    const world = room.layoutWorld.spaces[spaceId] || room.layoutWorld;
    const travelers = [...room.players.values()].filter((candidate) => candidate.connection !== 'REMOVED');
    const landings = travelers.map((traveler, index) => safePartyPosition(room, landing,
      (index - (travelers.length - 1) / 2) * 0.9, world));
    if (landings.some((position) => position === null)) return false;
    room.world = world;
    room.obstacles = world.obstacles;
    room.discoveryNodes = world.discoveryNodes;
    travelers.forEach((traveler, index) => {
      traveler.transform.position = { ...landings[index] };
      traveler.input.x = 0;
      traveler.input.z = 0;
    });
    room.run.currentSpaceId = spaceId;
    room.run.spaceRevision += 1;
    room.run.trap = null;
    room.enemies.clear();
    room.items.clear();
    return true;
  }

  function awardFloor(room, floor) {
    if (room.run.floorAwards[floor]) return room.run.floorAwards[floor];
    const currentFloor = room.run.floorIndex;
    room.run.floorIndex = floor;
    const awards = calculateAwards(room);
    room.run.floorIndex = currentFloor;
    room.run.floorAwards[floor] = awards;
    room.run.awards = awards;
    for (const player of room.players.values()) room.run.metricBaselines[player.playerId] = { ...player.metrics };
    room.run.level += 1;
    io.to(room.code).emit('floor:completed', { protocolVersion: PROTOCOL_VERSION, roomCode: room.code,
      tick: room.tick, revision: ++room.revision, ...awards });
    return awards;
  }

  function emitStage(room, fromStage) {
    room.lastActivityAt = Date.now();
    room.revision += 1;
    io.to(room.code).emit('floor:transition', { protocolVersion: PROTOCOL_VERSION, roomCode: room.code,
      tick: room.tick, revision: room.revision, fromStage, toStage: room.run.stage,
      floorIndex: room.run.floorIndex, cycle: room.run.cycle });
    emitSnapshot(room);
  }

  function enterRest(room, nextFloor, fromStage) {
    if (!transferParty(room, 'amber-vault', { x: 0, y: 0, z: -7 })) return false;
    room.run.floorIndex = nextFloor;
    room.run.stage = 'REST';
    room.run.restPortal = { id: 'rest-exit', position: { x: 0, y: 0, z: 8 }, radius: 1.4 };
    room.items.set('rest-supply', { id: 'rest-supply', kind: 'HEALING_CHARGE',
      position: { x: 0, y: 0, z: -3 },
      eligiblePlayerIds: new Set([...room.players.values()].filter((p) => p.connection !== 'BOT' &&
        p.connection !== 'REMOVED').map((p) => p.playerId)), claimedBy: new Set() });
    for (const player of room.players.values()) {
      if (player.health.current > 0) player.health.current = Math.min(player.health.max, player.health.current + 25);
    }
    emitStage(room, fromStage);
    return true;
  }

  function restartStrongerCycle(room) {
    const travelers = [...room.players.values()].filter((p) => p.connection !== 'REMOVED');
    const landing = { x: 0, y: 0, z: 0 };
    const safe = travelers.every((p, index) => safePartyPosition(room, landing,
      (index - (travelers.length - 1) / 2) * 0.9, room.layoutWorld));
    if (!safe) return false;
    const prior = room.run;
    transferParty(room, 'entry', landing);
    room.run = createRun(room.layoutWorld, room.tick);
    room.run.cycle = prior.cycle + 1;
    room.run.level = prior.level;
    room.run.threatStacks = prior.threatStacks;
    room.run.metricBaselines = Object.fromEntries(travelers.map((p) => [p.playerId, { ...p.metrics }]));
    room.revealedNodeIds.clear();
    room.floorTwo = null;
    room.floorThree = null;
    room.deepwood = null;
    room.floorFour = null;
    room.floorFive = null;
    let banked = 0;
    for (const player of travelers) {
      player.inventory.riches = Math.floor(player.inventory.riches / 2);
      banked += player.inventory.riches;
      player.inventory.healingCharges = 0;
      player.health.current = player.health.max;
      player.downedAtTick = null;
      player.statusEffects = [];
      player.discoveredNodeIds.clear();
    }
    room.run.bankedRiches = banked;
    const multiplier = 1 + (room.run.cycle - 1) * 0.25 + room.run.threatStacks * 0.05;
    const health = Math.ceil(config.combat.enemyMaxHealth * multiplier);
    const enemyId = randomId('enemy');
    room.enemies.set(enemyId, { enemyId, kind: 'SENTINEL',
      transform: { position: enemySpawn(room), rotation: { x: 0, y: 0, z: 0 } },
      health: { current: health, max: health },
      attackDamage: Math.ceil(config.combat.enemyAttackDamage * multiplier), nextAttackAt: 0 });
    io.to(room.code).emit('run:cycle', { protocolVersion: PROTOCOL_VERSION, roomCode: room.code,
      tick: room.tick, revision: ++room.revision, cycle: room.run.cycle, bankedRiches: banked });
    emitStage(room, 'FLOOR_FIVE');
    return true;
  }

  function completeExpedition(room) {
    awardFloor(room, 5);
    room.phase = ROOM_PHASES.COMPLETED;
    room.completedAt = Date.now();
    room.results = {
      cycle: room.run.cycle,
      completedAtTick: room.tick,
      level: room.run.level,
      players: [...room.players.values()].filter((p) => p.connection !== 'REMOVED').map((p) => ({
        playerId: p.playerId, displayName: p.displayName, mock: p.connection === 'BOT',
        xp: { ...p.xp }, metrics: { ...p.metrics }, riches: p.inventory.riches
      }))
    };
    for (const player of room.players.values()) {
      player.input.x = 0;
      player.input.z = 0;
    }
    io.to(room.code).emit('run:completed', { protocolVersion: PROTOCOL_VERSION,
      roomCode: room.code, tick: room.tick, revision: ++room.revision });
    emitSnapshot(room);
    return true;
  }

  function continueCycle(socket, payload, ack) {
    const found = roomForSocket(socket);
    if (!found) return safeAck(ack, { ok: false, error: 'NOT_IN_ROOM' });
    const { room, player } = found;
    if (room.phase !== ROOM_PHASES.COMPLETED || !room.results) {
      return safeAck(ack, { ok: false, error: 'INVALID_PHASE' });
    }
    const host = [...room.players.values()].find((candidate) => candidate.connection !== 'REMOVED');
    if (host?.playerId !== player.playerId) return safeAck(ack, { ok: false, error: 'HOST_ONLY' });
    if (!isRecord(payload) || payload.completedCycle !== room.results.cycle) {
      return safeAck(ack, { ok: false, error: 'STALE_RESULTS' });
    }
    if (!restartStrongerCycle(room)) return safeAck(ack, { ok: false, error: 'NO_SAFE_SPAWN' });
    room.phase = ROOM_PHASES.RUNNING;
    room.completedAt = null;
    room.results = null;
    room.lastActivityAt = Date.now();
    emitSnapshot(room);
    safeAck(ack, { ok: true, cycle: room.run.cycle });
  }

  // Why: A single room tick must either move the entire party or leave it in the old space.
  // Input: Validated queued intents, current socket epochs, server geometry, and private route seed.
  // Output: One committed transition or an explicit rejection per action.
  // Watch Out: A disconnected initiator is rejected; disconnected grace members still travel with the party.
  function processPortalActions(room) {
    const pending = room.pendingPortalActions.splice(0);
    for (const action of pending) {
      const player = room.players.get(action.playerId);
      const portal = room.run && currentPortal(room.run);
      let result;
      if (room.phase !== ROOM_PHASES.RUNNING || !room.run) result = { ok: false, error: 'NOT_IN_RUNNING_ROOM' };
      else if (!player || player.connection !== 'CONNECTED' || player.sessionEpoch !== action.sessionEpoch) result = { ok: false, error: 'STALE_SESSION' };
      else if (player.health.current <= 0) result = { ok: false, error: 'PLAYER_DOWN' };
      else if (action.portalId !== portal.id) result = { ok: false, error: 'PORTAL_NOT_FOUND' };
      else if (Math.hypot(player.transform.position.x - portal.position.x,
        player.transform.position.z - portal.position.z) > portal.radius + config.playerRadius) {
        result = { ok: false, error: 'OUT_OF_RANGE' };
      } else if (portal.id === 'floor-exit' &&
        (!requiredObjectiveComplete(room) || (room.run.stage === 'FLOOR_ONE' && room.run.trap?.state !== 'CLEARED'))) {
        result = { ok: false, error: 'OBJECTIVES_INCOMPLETE' };
      } else if (portal.id === 'shift-gate') {
        const toSpaceId = routeDestination(room.run);
        const destinationWorld = room.layoutWorld.spaces[toSpaceId] || room.layoutWorld;
        const travelers = [...room.players.values()].filter((candidate) => candidate.connection !== 'REMOVED');
        const landings = travelers.map((traveler, index) => safePartyPosition(room, portal.position,
          (index - (travelers.length - 1) / 2) * 0.8, destinationWorld));
        if (landings.some((position) => position === null)) result = { ok: false, error: 'NO_SAFE_SPAWN' };
        else {
          const fromSpaceId = room.run.currentSpaceId;
          const skippedRequired = !requiredObjectiveComplete(room);
          const belowExplorationGate = explorationBasisPoints(room) < config.requiredExplorationBasisPoints;
          const penaltyTier = skippedRequired || belowExplorationGate ? 1 : 0;
          const penaltyExpiresAtTick = room.tick + Math.min(RUSH_DURATION_TICKS, config.maximumRushDurationTicks);
          travelers.forEach((traveler, index) => {
            traveler.transform.position = { ...landings[index] };
            traveler.input.x = 0;
            traveler.input.z = 0;
            if (penaltyTier > 0 && traveler.health.current > 0) {
              traveler.statusEffects.push({ kind: 'RUSH', tier: Math.min(penaltyTier, config.maximumPenaltyTier),
                expiresAtTick: penaltyExpiresAtTick, sourcePortalId: portal.id });
            }
          });
          room.world = destinationWorld;
          room.obstacles = destinationWorld.obstacles;
          room.discoveryNodes = destinationWorld.discoveryNodes;
          for (const enemy of room.enemies.values()) if (enemy.health.current > 0) enemy.transform.position = enemySpawn(room);
          room.run.currentSpaceId = toSpaceId;
          room.run.spaceRevision += 1;
          const spanX = room.world.bounds.max.x - room.world.bounds.min.x;
          const spanZ = room.world.bounds.max.z - room.world.bounds.min.z;
          room.run.trap = { id: 'vault-trap', state: 'TELEGRAPHED', position: { x: portal.position.x, y: 0,
            z: Math.min(portal.position.z + 3, (room.world.bounds.min.z + room.world.bounds.max.z) / 2 + spanZ * 0.1) },
          radius: Math.min(1.5, spanX / 6, spanZ / 6),
          telegraphEndsAtTick: room.tick + TRAP_WARNING_TICKS, clearsAtTick: null, disarmedBy: null };
          player.metrics.portalsSolved += 1;
          room.lastActivityAt = Date.now();
          room.revision += 1;
          result = { ok: true, actionId: action.actionId, portalId: portal.id, fromSpaceId,
            toSpaceId, penaltyTier, revision: room.revision, serverTick: room.tick };
          io.to(room.code).emit('portal:resolved', { protocolVersion: PROTOCOL_VERSION, roomCode: room.code,
            tick: room.tick, revision: room.revision, ...result });
          emitSnapshot(room);
        }
      } else {
        const fromStage = room.run.stage;
        let transferred = false;
        if (fromStage === 'FLOOR_ONE') {
          transferred = enterRest(room, 2, fromStage);
          if (transferred) awardFloor(room, 1);
        } else if (fromStage === 'REST') {
          const next = room.run.floorIndex;
          const destination = next === 2 ? 'violet-vault' : next === 3 ? 'amber-vault' : 'violet-vault';
          const before = { world: room.world, obstacles: room.obstacles, discoveryNodes: room.discoveryNodes,
            enemies: new Map(room.enemies), items: new Map(room.items),
            positions: new Map([...room.players].map(([id, member]) => [id, { ...member.transform.position }])),
            stage: room.run.stage, spaceId: room.run.currentSpaceId,
            spaceRevision: room.run.spaceRevision, trap: room.run.trap,
            floorTwo: room.floorTwo, floorThree: room.floorThree, deepwood: room.deepwood,
            floorFour: room.floorFour, floorFive: room.floorFive };
          transferred = transferParty(room, destination, { x: 0, y: 0, z: -7 });
          if (transferred) {
            try {
              room.run.stage = next === 2 ? 'FLOOR_TWO' : next === 3 ? 'FLOOR_THREE' :
                next === 4 ? 'DEEPWOOD' : 'FLOOR_FIVE';
              if (next === 2) startFloorTwo(room, room.tick);
              if (next === 3) {
                const playerIds = [...room.players.values()].filter((p) => p.connection !== 'BOT' &&
                  p.connection !== 'REMOVED').map((p) => p.playerId);
                room.floorThree = createFloorThreeState({ tick: room.tick, playerIds });
                room.items.set('supply-cache', { id: 'supply-cache', kind: 'HEALING_CHARGE',
                  position: { x: -5, y: 0, z: -2 }, eligiblePlayerIds: new Set(playerIds), claimedBy: new Set() });
                room.items.set('forgotten-cache', { id: 'forgotten-cache', kind: 'RICHES', hidden: true,
                  position: { x: 10, y: 0, z: 8 }, eligiblePlayerIds: new Set(playerIds), claimedBy: new Set() });
              }
              if (next === 4) startDeepwood(room, room.tick);
              if (next === 5) startFloorFive(room, room.tick);
              emitStage(room, fromStage);
            } catch (error) {
              room.world = before.world;
              room.obstacles = before.obstacles;
              room.discoveryNodes = before.discoveryNodes;
              room.enemies.clear();
              for (const [id, enemy] of before.enemies) room.enemies.set(id, enemy);
              room.items.clear();
              for (const [id, item] of before.items) room.items.set(id, item);
              for (const [id, position] of before.positions) room.players.get(id).transform.position = position;
              room.run.stage = before.stage;
              room.run.currentSpaceId = before.spaceId;
              room.run.spaceRevision = before.spaceRevision;
              room.run.trap = before.trap;
              room.floorTwo = before.floorTwo;
              room.floorThree = before.floorThree;
              room.deepwood = before.deepwood;
              room.floorFour = before.floorFour;
              room.floorFive = before.floorFive;
              transferred = false;
              result = { ok: false, error: 'FLOOR_UNAVAILABLE' };
            }
          }
        } else if (fromStage === 'FLOOR_TWO' && floorTwoComplete(room)) {
          transferred = enterRest(room, 3, fromStage);
          if (transferred) awardFloor(room, 2);
        } else if (fromStage === 'FLOOR_THREE' && room.floorThree?.phase === 'REST_AVAILABLE') {
          const entered = enterFloorThreeRest(room.floorThree,
            { playerId: player.playerId, actionId: action.actionId, tick: room.tick });
          if (entered.result.ok) {
            room.floorThree = entered.state;
            transferred = enterRest(room, 4, fromStage);
            if (transferred) awardFloor(room, 3);
          }
        } else if (fromStage === 'DEEPWOOD' && deepwoodComplete(room)) {
          const before = { world: room.world, obstacles: room.obstacles, discoveryNodes: room.discoveryNodes,
            enemies: new Map(room.enemies), items: new Map(room.items),
            positions: new Map([...room.players].map(([id, member]) => [id, { ...member.transform.position }])),
            stage: room.run.stage, spaceId: room.run.currentSpaceId, spaceRevision: room.run.spaceRevision,
            deepwood: room.deepwood };
          transferred = transferParty(room, 'amber-vault', { x: 0, y: 0, z: -7 });
          if (transferred) {
            try {
              room.run.stage = 'FLOOR_FOUR';
              startFloorFour(room, room.tick);
              emitStage(room, fromStage);
            } catch {
              room.world = before.world;
              room.obstacles = before.obstacles;
              room.discoveryNodes = before.discoveryNodes;
              room.enemies.clear();
              for (const [id, enemy] of before.enemies) room.enemies.set(id, enemy);
              room.items.clear();
              for (const [id, item] of before.items) room.items.set(id, item);
              for (const [id, position] of before.positions) room.players.get(id).transform.position = position;
              room.run.stage = before.stage;
              room.run.currentSpaceId = before.spaceId;
              room.run.spaceRevision = before.spaceRevision;
              room.deepwood = before.deepwood;
              transferred = false;
              result = { ok: false, error: 'FLOOR_UNAVAILABLE' };
            }
          }
        } else if (fromStage === 'FLOOR_FOUR' && floorFourComplete(room)) {
          transferred = enterRest(room, 5, fromStage);
          if (transferred) awardFloor(room, 4);
        } else if (fromStage === 'FLOOR_FIVE' && floorFiveComplete(room)) {
          transferred = completeExpedition(room);
        }
        result = transferred ? { ok: true, actionId: action.actionId, portalId: portal.id,
          fromStage, toStage: room.run.stage, revision: room.revision, serverTick: room.tick } :
          result || { ok: false, error: 'NO_SAFE_SPAWN' };
      }
      finishPortalAction(action, result);
    }
  }

  function stepTrap(room) {
    const trap = room.run?.trap;
    if (!trap) return;
    if (trap.state === 'TELEGRAPHED' && room.tick >= trap.telegraphEndsAtTick) {
      trap.state = 'ACTIVE';
      trap.clearsAtTick = room.tick + TRAP_ACTIVE_TICKS;
      for (const player of room.players.values()) {
        if (player.connection === 'REMOVED' || player.connection === 'DISCONNECTED' || player.health.current <= 0) continue;
        const distance = Math.hypot(player.transform.position.x - trap.position.x,
          player.transform.position.z - trap.position.z);
        if (distance > trap.radius + config.playerRadius) continue;
        const damage = Math.min(player.health.current, TRAP_DAMAGE);
        player.health.current -= damage;
        markPlayerDown(room, player);
        room.revision += 1;
        io.to(room.code).emit('combat:damage', { protocolVersion: PROTOCOL_VERSION, roomCode: room.code,
          tick: room.tick, revision: room.revision, playerId: player.playerId,
          sourceId: 'vault-trap', amount: damage, currentHealth: player.health.current });
      }
    } else if (trap.state === 'ACTIVE' && room.tick >= trap.clearsAtTick) trap.state = 'CLEARED';
  }

  // Why: A reachable warning window gives cooperation a server-verified alternative to taking trap damage.
  // Input: Untrusted action/trap IDs from a connected, living room member; client coordinates are ignored.
  // Output: One replay-safe result and at most one disarm credit, or a bounded validation error.
  // Watch Out: This single-threaded mutation is serialized with the next tick and survives a later disconnect.
  function disarmTrap(socket, payload, ack) {
    const found = roomForSocket(socket);
    if (!found) return safeAck(ack, { ok: false, error: 'NOT_IN_ROOM' });
    const { room, player } = found;
    if (!isRecord(payload) || typeof payload.actionId !== 'string' || !ACTION_ID_PATTERN.test(payload.actionId) ||
      payload.trapId !== 'vault-trap') return safeAck(ack, { ok: false, error: 'INVALID_TRAP_ACTION' });
    const prior = player.trap.recentActions.get(payload.actionId);
    if (prior) return safeAck(ack, prior);
    let result;
    const trap = room.run?.trap;
    if (room.phase !== ROOM_PHASES.RUNNING || !trap) result = { ok: false, error: 'NOT_IN_RUNNING_ROOM' };
    else if (player.health.current <= 0) result = { ok: false, error: 'PLAYER_DOWN' };
    else if (trap.state === 'CLEARED') result = { ok: false, error: 'TRAP_ALREADY_CLEARED' };
    else if (Math.hypot(player.transform.position.x - trap.position.x,
      player.transform.position.z - trap.position.z) > trap.radius + config.playerRadius + 0.75 ||
      room.obstacles.some((box) => (!box.revealNodeId || !room.revealedNodeIds.has(box.revealNodeId)) &&
        segmentIntersectsAabb(player.transform.position, trap.position, box))) {
      result = { ok: false, error: 'OUT_OF_RANGE' };
    } else {
      trap.state = 'CLEARED';
      trap.clearsAtTick = room.tick;
      trap.disarmedBy = player.playerId;
      player.metrics.trapsDisarmed += 1;
      room.lastActivityAt = Date.now();
      room.revision += 1;
      result = { ok: true, actionId: payload.actionId, trapId: trap.id, playerId: player.playerId,
        revision: room.revision, serverTick: room.tick };
      io.to(room.code).emit('trap:disarmed', { protocolVersion: PROTOCOL_VERSION, roomCode: room.code,
        tick: room.tick, revision: room.revision, ...result });
      emitSnapshot(room);
    }
    player.trap.recentActions.set(payload.actionId, result);
    if (player.trap.recentActions.size > 32) player.trap.recentActions.delete(player.trap.recentActions.keys().next().value);
    safeAck(ack, result);
  }

  // Why: World supplies must become personal inventory only after a server-owned range and entitlement check.
  // Input: Untrusted item/action IDs from the socket-bound explorer; client positions and quantities are ignored.
  // Output: A replay-safe claim or a stable rejection without consuming another player's entitlement.
  function collectItem(socket, payload, ack) {
    const found = roomForSocket(socket);
    if (!found) return safeAck(ack, { ok: false, error: 'NOT_IN_ROOM' });
    const { room, player } = found;
    if (!isRecord(payload) || typeof payload.actionId !== 'string' || !ACTION_ID_PATTERN.test(payload.actionId) ||
      typeof payload.itemId !== 'string' || !/^[a-z0-9-]{1,64}$/.test(payload.itemId)) {
      return safeAck(ack, { ok: false, error: 'INVALID_ITEM_ACTION' });
    }
    const prior = player.item.recentActions.get(payload.actionId);
    if (prior) return safeAck(ack, prior);
    const item = room.items.get(payload.itemId);
    let result;
    if (room.phase !== ROOM_PHASES.RUNNING) result = { ok: false, error: 'NOT_IN_RUNNING_ROOM' };
    else if (player.health.current <= 0) result = { ok: false, error: 'PLAYER_DOWN' };
    else if (!item || !item.eligiblePlayerIds.has(player.playerId)) result = { ok: false, error: 'ITEM_NOT_FOUND' };
    else if (item.claimedBy.has(player.playerId)) result = { ok: false, error: 'ALREADY_CLAIMED' };
    else if (item.kind === 'HEALING_CHARGE' && player.inventory.healingCharges >= 2) result = { ok: false, error: 'INVENTORY_FULL' };
    else if (Math.hypot(player.transform.position.x - item.position.x,
      player.transform.position.z - item.position.z) > 1.8 + config.playerRadius ||
      room.obstacles.some((box) => (!box.revealNodeId || !room.revealedNodeIds.has(box.revealNodeId)) &&
        segmentIntersectsAabb(player.transform.position, item.position, box))) {
      result = { ok: false, error: 'OUT_OF_RANGE' };
    } else {
      let claim = null;
      if (room.run?.stage === 'FLOOR_THREE') {
        claim = claimFloorThreeResource(room.floorThree, { playerId: player.playerId,
          nodeId: item.id, actionId: payload.actionId });
      }
      if (claim && !claim.result.ok) result = claim.result;
      else {
        if (claim) room.floorThree = claim.state;
        item.claimedBy.add(player.playerId);
        if (item.kind === 'RICHES') player.inventory.riches += 10;
        else player.inventory.healingCharges += 1;
        room.revision += 1;
        result = { ok: true, actionId: payload.actionId, itemId: item.id,
          healingCharges: player.inventory.healingCharges, riches: player.inventory.riches };
        io.to(room.code).emit('item:collected', { protocolVersion: PROTOCOL_VERSION, roomCode: room.code,
          tick: room.tick, revision: room.revision, playerId: player.playerId, itemId: item.id });
        emitSnapshot(room);
      }
    }
    player.item.recentActions.set(payload.actionId, result);
    if (player.item.recentActions.size > 32) player.item.recentActions.delete(player.item.recentActions.keys().next().value);
    safeAck(ack, result);
  }

  // Why: Healing is a player intent, never a client-authored health mutation.
  // Input: An action ID from a connected living explorer holding a server-recorded charge.
  // Output: One bounded heal, cached across repeated requests.
  function useItem(socket, payload, ack) {
    const found = roomForSocket(socket);
    if (!found) return safeAck(ack, { ok: false, error: 'NOT_IN_ROOM' });
    const { room, player } = found;
    if (!isRecord(payload) || typeof payload.actionId !== 'string' || !ACTION_ID_PATTERN.test(payload.actionId)) {
      return safeAck(ack, { ok: false, error: 'INVALID_ITEM_ACTION' });
    }
    const prior = player.item.recentActions.get(payload.actionId);
    if (prior) return safeAck(ack, prior);
    let result;
    if (room.phase !== ROOM_PHASES.RUNNING) result = { ok: false, error: 'NOT_IN_RUNNING_ROOM' };
    else if (player.health.current <= 0) result = { ok: false, error: 'PLAYER_DOWN' };
    else if (player.inventory.healingCharges <= 0) result = { ok: false, error: 'NO_HEALING_CHARGE' };
    else if (player.health.current >= player.health.max) result = { ok: false, error: 'HEALTH_FULL' };
    else {
      player.inventory.healingCharges -= 1;
      player.health.current = Math.min(player.health.max, player.health.current + 25);
      room.revision += 1;
      result = { ok: true, actionId: payload.actionId, currentHealth: player.health.current,
        healingCharges: player.inventory.healingCharges };
      io.to(room.code).emit('item:used', { protocolVersion: PROTOCOL_VERSION, roomCode: room.code,
        tick: room.tick, revision: room.revision, playerId: player.playerId,
        currentHealth: player.health.current });
      emitSnapshot(room);
    }
    player.item.recentActions.set(payload.actionId, result);
    if (player.item.recentActions.size > 32) player.item.recentActions.delete(player.item.recentActions.keys().next().value);
    safeAck(ack, result);
  }

  // Why: A downed ally can rejoin the fight through a bounded, server-validated cooperative action.
  // Input: Untrusted target/action IDs; the source's charge, health, and position are authoritative.
  // Output: One 25 HP revive and support credit, or a replay-safe rejection.
  function revivePlayer(socket, payload, ack) {
    const found = roomForSocket(socket);
    if (!found) return safeAck(ack, { ok: false, error: 'NOT_IN_ROOM' });
    const { room, player } = found;
    if (!isRecord(payload) || typeof payload.actionId !== 'string' || !ACTION_ID_PATTERN.test(payload.actionId) ||
      typeof payload.targetPlayerId !== 'string' || payload.targetPlayerId.length > 80) {
      return safeAck(ack, { ok: false, error: 'INVALID_REVIVE_ACTION' });
    }
    const prior = player.revive.recentActions.get(payload.actionId);
    if (prior) return safeAck(ack, prior);
    const target = room.players.get(payload.targetPlayerId);
    let result;
    if (room.phase !== ROOM_PHASES.RUNNING) result = { ok: false, error: 'NOT_IN_RUNNING_ROOM' };
    else if (player.health.current <= 0) result = { ok: false, error: 'PLAYER_DOWN' };
    else if (!target || target.connection === 'REMOVED' || target.connection === 'BOT' || target.health.current > 0) {
      result = { ok: false, error: 'TARGET_NOT_DOWN' };
    } else if (player.inventory.healingCharges <= 0) result = { ok: false, error: 'NO_HEALING_CHARGE' };
    else if (Math.hypot(player.transform.position.x - target.transform.position.x,
      player.transform.position.z - target.transform.position.z) > 1.8 + config.playerRadius ||
      room.obstacles.some((box) => (!box.revealNodeId || !room.revealedNodeIds.has(box.revealNodeId)) &&
        segmentIntersectsAabb(player.transform.position, target.transform.position, box))) {
      result = { ok: false, error: 'OUT_OF_RANGE' };
    } else {
      player.inventory.healingCharges -= 1;
      target.health.current = Math.min(target.health.max, 25);
      target.downedAtTick = null;
      player.metrics.supportActions += 1;
      room.revision += 1;
      result = { ok: true, actionId: payload.actionId, targetPlayerId: target.playerId,
        currentHealth: target.health.current };
      io.to(room.code).emit('player:revived', { protocolVersion: PROTOCOL_VERSION, roomCode: room.code,
        tick: room.tick, revision: room.revision, playerId: player.playerId,
        targetPlayerId: target.playerId, currentHealth: target.health.current });
      emitSnapshot(room);
    }
    player.revive.recentActions.set(payload.actionId, result);
    if (player.revive.recentActions.size > 32) player.revive.recentActions.delete(player.revive.recentActions.keys().next().value);
    safeAck(ack, result);
  }

  function moveAxis(position, axis, amount, radius, room) {
    if (amount === 0) return position[axis];
    const candidate = { ...position, [axis]: position[axis] + amount };
    const bounds = room.world.bounds;
    const min = bounds.min[axis] + radius;
    const max = bounds.max[axis] - radius;
    if (candidate[axis] < min || candidate[axis] > max) return position[axis];
    for (const obstacle of room.obstacles) {
      if (obstacle.revealNodeId && room.revealedNodeIds.has(obstacle.revealNodeId)) continue;
      if (sphereIntersectsAabb(candidate, radius, obstacle)) return position[axis];
    }
    return candidate[axis];
  }

  function enemySpawn(room) {
    const radius = config.combat.enemyCollisionRadiusMeters;
    const { min, max } = room.world.bounds;
    const candidates = [
      [7, 0], [0, 7], [-7, 0], [0, -7],
      [max.x - radius, 0], [min.x + radius, 0],
      [0, max.z - radius], [0, min.z + radius]
    ];
    for (const [x, z] of candidates) {
      const position = { x, y: 0, z };
      if (x < min.x + radius || x > max.x - radius || z < min.z + radius || z > max.z - radius) continue;
      if (!room.obstacles.some((box) => sphereIntersectsAabb(position, radius, box))) return position;
    }
    return { x: clamp(0, min.x + radius, max.x - radius), y: 0, z: clamp(0, min.z + radius, max.z - radius) };
  }

  function botLineOfSight(room, from, to) {
    return !room.obstacles.some((box) => (!box.revealNodeId || !room.revealedNodeIds.has(box.revealNodeId)) &&
      segmentIntersectsAabb(from, to, box));
  }

  // Why: Mock explorers should demonstrate cooperative play instead of freezing at
  // the first wall between their spawn and an enemy. A small deterministic corner
  // probe is enough for this authored dungeon and still uses normal collision.
  function botWaypoint(room, from, target) {
    if (botLineOfSight(room, from, target)) return target;
    const pad = config.playerRadius + config.combat.enemyCollisionRadiusMeters + 0.35;
    const candidates = [];
    for (const obstacle of room.obstacles) {
      if (obstacle.revealNodeId && room.revealedNodeIds.has(obstacle.revealNodeId)) continue;
      candidates.push(
        { x: obstacle.min.x - pad, z: obstacle.min.z - pad },
        { x: obstacle.min.x - pad, z: obstacle.max.z + pad },
        { x: obstacle.max.x + pad, z: obstacle.min.z - pad },
        { x: obstacle.max.x + pad, z: obstacle.max.z + pad }
      );
    }
    const bounds = room.world.bounds;
    return candidates
      .filter((candidate) => candidate.x > bounds.min.x + config.playerRadius &&
        candidate.x < bounds.max.x - config.playerRadius &&
        candidate.z > bounds.min.z + config.playerRadius &&
        candidate.z < bounds.max.z - config.playerRadius)
      .filter((candidate) => !room.obstacles.some((box) => sphereIntersectsAabb({ ...candidate, y: 0 }, config.playerRadius, box)))
      .filter((candidate) => botLineOfSight(room, from, candidate) && botLineOfSight(room, candidate, target))
      .sort((a, b) => {
        const distanceA = Math.hypot(a.x - from.x, a.z - from.z) + Math.hypot(a.x - target.x, a.z - target.z);
        const distanceB = Math.hypot(b.x - from.x, b.z - from.z) + Math.hypot(b.x - target.x, b.z - target.z);
        return distanceA - distanceB;
      })[0] || target;
  }

  function setBotIntent(player, room, intent, targetId) {
    if (player.bot.intent === intent && player.bot.targetId === targetId) return;
    player.bot.intent = intent;
    player.bot.targetId = targetId;
    room.revision += 1;
    io.to(room.code).emit('bot:intent', { protocolVersion: PROTOCOL_VERSION, roomCode: room.code,
      tick: room.tick, revision: room.revision, playerId: player.playerId, intent, targetId });
  }

  function steerBot(player, target, stopDistance = 0, room = null) {
    const steeringTarget = room ? botWaypoint(room, player.transform.position, target) : target;
    const dx = steeringTarget.x - player.transform.position.x;
    const dz = steeringTarget.z - player.transform.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= stopDistance || distance === 0) {
      player.input.x = 0;
      player.input.z = 0;
      return distance;
    }
    player.input.x = dx / distance;
    player.input.z = dz / distance;
    player.input.rotationY = Math.atan2(player.input.x, player.input.z);
    return distance;
  }

  function reviveWithMock(room, player, target) {
    if (player.inventory.healingCharges <= 0 || target.health.current > 0 || target.connection === 'REMOVED' ||
      target.connection === 'BOT') return false;
    const distance = Math.hypot(player.transform.position.x - target.transform.position.x,
      player.transform.position.z - target.transform.position.z);
    if (distance > 1.8 + config.playerRadius || !botLineOfSight(room, player.transform.position, target.transform.position)) return false;
    player.inventory.healingCharges -= 1;
    target.health.current = Math.min(target.health.max, 25);
    target.downedAtTick = null;
    player.metrics.supportActions += 1;
    room.revision += 1;
    io.to(room.code).emit('player:revived', { protocolVersion: PROTOCOL_VERSION, roomCode: room.code,
      tick: room.tick, revision: room.revision, playerId: player.playerId,
      targetPlayerId: target.playerId, currentHealth: target.health.current });
    return true;
  }

  // Why: Mock explorers must demonstrate cooperative game rules instead of circling the host as decoration.
  // Input: Server-owned room state and monotonic time; no client may select a bot target or action.
  // Output: One deterministic rescue, combat, investigation, or patrol intent plus collision-validated movement input.
  // Watch Out: Bots may demonstrate objectives but cannot reveal secrets, trigger portals, or earn human rewards.
  function updateMockInput(player, room, now) {
    const downedHuman = [...room.players.values()]
      .filter((candidate) => candidate.connection !== 'BOT' && candidate.connection !== 'REMOVED' && candidate.health.current <= 0)
      .sort((a, b) => {
        const distanceA = Math.hypot(a.transform.position.x - player.transform.position.x,
          a.transform.position.z - player.transform.position.z);
        const distanceB = Math.hypot(b.transform.position.x - player.transform.position.x,
          b.transform.position.z - player.transform.position.z);
        return distanceA - distanceB || a.playerId.localeCompare(b.playerId);
      })[0];
    if (downedHuman && player.inventory.healingCharges > 0) {
      setBotIntent(player, room, 'RESCUE', downedHuman.playerId);
      const distance = steerBot(player, downedHuman.transform.position, 1.4, room);
      if (distance <= 1.8 + config.playerRadius) reviveWithMock(room, player, downedHuman);
      return;
    }

    const enemy = [...room.enemies.values()]
      .filter((candidate) => candidate.health.current > 0)
      .sort((a, b) => {
        const distanceA = Math.hypot(a.transform.position.x - player.transform.position.x,
          a.transform.position.z - player.transform.position.z);
        const distanceB = Math.hypot(b.transform.position.x - player.transform.position.x,
          b.transform.position.z - player.transform.position.z);
        return distanceA - distanceB || a.enemyId.localeCompare(b.enemyId);
      })[0];
    if (enemy) {
      setBotIntent(player, room, 'ENGAGE', enemy.enemyId);
      const distance = steerBot(player, enemy.transform.position, config.combat.playerAttackRangeMeters * 0.72, room);
      if (now >= (room.nextMockAttackAt ?? 0) && distance <= config.combat.playerAttackRangeMeters &&
        botLineOfSight(room, player.transform.position, enemy.transform.position)) {
        const result = resolvePlayerAttack(room, player, now);
        if (result.ok) room.nextMockAttackAt = now + MOCK_SHARED_ATTACK_COOLDOWN_MS;
      }
      return;
    }

    const nodes = room.discoveryNodes || [];
    if (nodes.length) {
      const node = nodes[player.bot.waypointIndex % nodes.length];
      const target = { x: (node.bounds.min.x + node.bounds.max.x) / 2,
        z: (node.bounds.min.z + node.bounds.max.z) / 2 };
      setBotIntent(player, room, 'INVESTIGATE', node.id);
      if (steerBot(player, target, 1, room) <= 1) player.bot.waypointIndex += 1;
      return;
    }

    const { min, max } = room.world.bounds;
    const margin = config.playerRadius + 1;
    const patrol = [
      { x: min.x + margin, z: min.z + margin }, { x: max.x - margin, z: min.z + margin },
      { x: max.x - margin, z: max.z - margin }, { x: min.x + margin, z: max.z - margin },
      { x: 0, z: 0 }
    ];
    const target = patrol[player.bot.waypointIndex % patrol.length];
    setBotIntent(player, room, 'PATROL', `waypoint-${player.bot.waypointIndex % patrol.length}`);
    if (steerBot(player, target, 0.8, room) <= 0.8) player.bot.waypointIndex += 1;
  }

  function stepEnemies(room, dt, now) {
    for (const enemy of room.enemies.values()) {
      if (enemy.health.current <= 0) continue;
      let target = null;
      let nearest = config.combat.enemyAggroRadiusMeters ** 2;
      for (const player of room.players.values()) {
        if ((player.connection !== 'CONNECTED' && player.connection !== 'BOT') || player.health.current <= 0) continue;
        const dx = player.transform.position.x - enemy.transform.position.x;
        const dz = player.transform.position.z - enemy.transform.position.z;
        const distanceSquared = dx * dx + dz * dz;
        if (distanceSquared < nearest) { nearest = distanceSquared; target = player; }
      }
      if (!target) continue;
      const position = enemy.transform.position;
      const dx = target.transform.position.x - position.x;
      const dz = target.transform.position.z - position.z;
      const distance = Math.hypot(dx, dz);
      enemy.transform.rotation.y = Math.atan2(dx, dz);
      if (distance > config.combat.enemyAttackRangeMeters) {
        const travel = Math.min(config.combat.enemySpeedMetersPerSecond * dt, distance - config.combat.enemyAttackRangeMeters);
        const nextX = moveAxis(position, 'x', dx / distance * travel, config.combat.enemyCollisionRadiusMeters, room);
        const nextZ = moveAxis({ ...position, x: nextX }, 'z', dz / distance * travel, config.combat.enemyCollisionRadiusMeters, room);
        position.x = nextX;
        position.z = nextZ;
      } else if (now >= enemy.nextAttackAt) {
        const rushed = target.statusEffects.some((effect) => effect.kind === 'RUSH' && effect.expiresAtTick > room.tick);
        const baseDamage = enemy.attackDamage || config.combat.enemyAttackDamage;
        const attackDamage = rushed ? Math.ceil(baseDamage * RUSH_DAMAGE_BASIS_POINTS / 10000) : baseDamage;
        const damage = Math.min(target.health.current, attackDamage);
        target.health.current -= damage;
        markPlayerDown(room, target);
        enemy.nextAttackAt = now + config.combat.enemyAttackCooldownMs;
        room.revision += 1;
        io.to(room.code).emit('combat:damage', {
          protocolVersion: PROTOCOL_VERSION, roomCode: room.code, tick: room.tick, revision: room.revision,
          playerId: target.playerId, sourceId: enemy.enemyId, amount: damage, currentHealth: target.health.current
        });
      }
    }
  }

  function stepFloorEncounters(room) {
    const emitEncounterEvents = (events) => {
      for (const event of events) {
        if (event.type.endsWith(':damage')) {
          const player = room.players.get(event.playerId);
          if (player) markPlayerDown(room, player);
          io.to(room.code).emit('combat:damage', { protocolVersion: PROTOCOL_VERSION,
            roomCode: room.code, revision: room.revision, tick: room.tick,
            playerId: event.playerId, sourceId: event.sourceId, amount: event.amount,
            currentHealth: event.currentHealth });
        } else {
          io.to(room.code).emit(event.type, { protocolVersion: PROTOCOL_VERSION,
            roomCode: room.code, revision: room.revision, ...event });
        }
      }
    };
    if (room.run?.stage === 'FLOOR_TWO') {
      emitEncounterEvents(stepFloorTwo(room, room.tick));
    } else if (room.run?.stage === 'FLOOR_THREE' && room.floorThree) {
      const outcome = stepFloorThree(room.floorThree, { tick: room.tick,
        activePlayerIds: [...room.players.values()].filter((p) => p.connection === 'CONNECTED').map((p) => p.playerId),
        defeatedMobIds: [...room.enemies.values()].filter((enemy) => enemy.kind === 'FLOOR_THREE_MOB' &&
          enemy.health.current <= 0).map((enemy) => enemy.enemyId),
        discoveredNodeIds: [...room.players.values()].some((p) => p.connection === 'CONNECTED' &&
          Math.hypot(p.transform.position.x - 10, p.transform.position.z - 8) <= 3) ? ['forgotten-cache'] : [],
        threatStacks: room.run.threatStacks });
      room.floorThree = outcome.state;
      for (const event of outcome.events) {
        if (event.type === 'MOB_SPAWN') {
          const preferred = [{ x: -7, y: 0, z: 5 }, { x: 7, y: 0, z: 5 },
            { x: 0, y: 0, z: 8 }, { x: -6, y: 0, z: 8 }, { x: 6, y: 0, z: 8 }][event.spawnSlot];
          const position = safePartyPosition(room, preferred, 0, room.world) || enemySpawn(room);
          const max = Math.ceil(36 * event.healthMultiplierBasisPoints / 10000);
          room.enemies.set(event.enemyId, { enemyId: event.enemyId, kind: event.kind,
            transform: { position: { ...position }, rotation: { x: 0, y: 0, z: 0 } },
            health: { current: max, max }, attackDamage: Math.ceil(config.combat.enemyAttackDamage *
              event.damageMultiplierBasisPoints / 10000), nextAttackAt: 0 });
        }
        io.to(room.code).emit(`floor3:${event.type.toLowerCase()}`, { protocolVersion: PROTOCOL_VERSION,
          roomCode: room.code, tick: room.tick, revision: ++room.revision, ...event });
      }
    } else if (room.run?.stage === 'DEEPWOOD') {
      emitEncounterEvents(stepDeepwood(room, room.tick));
    } else if (room.run?.stage === 'FLOOR_FOUR') {
      emitEncounterEvents(stepFloorFour(room, room.tick));
    } else if (room.run?.stage === 'FLOOR_FIVE') {
      emitEncounterEvents(stepFloorFive(room, room.tick));
    }
  }

  function stepRoom(room, dt, now) {
    if (room.phase === ROOM_PHASES.CLOSED || room.phase === ROOM_PHASES.COMPLETED ||
      room.phase === ROOM_PHASES.FAILED) return;
    metrics.roomTicks += 1;
    room.tick += 1;
    reconcileRoomIntro(room);
    let changed = false;
    for (const player of room.players.values()) {
      player.statusEffects = player.statusEffects.filter((effect) => effect.expiresAtTick > room.tick);
      if (player.connection !== 'CONNECTED' && player.connection !== 'BOT') continue;
      if (player.connection === 'BOT' && room.phase === ROOM_PHASES.RUNNING) {
        updateMockInput(player, room, now);
      // Silence becomes neutral input; client-supplied transforms are never read.
      } else if (now - player.input.lastReceivedAt > 250) {
        if (player.input.x !== 0 || player.input.z !== 0) changed = true;
        player.input.x = 0;
        player.input.z = 0;
      }
      if (room.phase === ROOM_PHASES.RUNNING) {
        if (player.health.current <= 0) {
          player.input.x = 0;
          player.input.z = 0;
          continue;
        }
        const position = player.transform.position;
        const rooted = player.statusEffects.some((effect) => effect.kind === 'ROOT');
        const dx = (rooted ? 0 : player.input.x) * config.playerSpeed * dt;
        const dz = (rooted ? 0 : player.input.z) * config.playerSpeed * dt;
        const nextX = moveAxis(position, 'x', dx, config.playerRadius, room);
        const xPosition = { ...position, x: nextX };
        const nextZ = moveAxis(xPosition, 'z', dz, config.playerRadius, room);
        if (nextX !== position.x || nextZ !== position.z) changed = true;
        position.x = nextX;
        position.z = nextZ;
        if (finiteNumber(player.input.rotationY)) player.transform.rotation.y = player.input.rotationY;

        // Proximity discovery is server-side. Nodes remain hidden from clients
        // until the server verifies the player is inside their configured AABB.
        for (const node of room.discoveryNodes) {
          if (player.connection === 'BOT') continue;
          if (player.discoveredNodeIds.has(node.id) || !pointInsideAabb(position, node.bounds, config.playerRadius)) continue;
          if (player.discoveredNodeIds.size >= config.maxDiscoveredNodes) break;
          player.discoveredNodeIds.add(node.id);
          room.revealedNodeIds.add(node.id);
          player.metrics.nodesDiscovered += 1;
          room.revision += 1;
          io.to(room.code).emit('node:discovered', {
            protocolVersion: PROTOCOL_VERSION,
            roomCode: room.code,
            tick: room.tick,
            revision: room.revision,
            playerId: player.playerId,
            nodeId: node.id
          });
          changed = true;
        }
      }
    }
    if (room.phase === ROOM_PHASES.RUNNING) {
      processPortalActions(room);
      if (room.phase === ROOM_PHASES.RUNNING) {
        stepTrap(room);
        stepFloorEncounters(room);
        if (!['FLOOR_TWO', 'DEEPWOOD', 'FLOOR_FOUR', 'FLOOR_FIVE'].includes(room.run?.stage)) stepEnemies(room, dt, now);
        checkPartyWipe(room);
      }
    }
    if (changed || room.phase === ROOM_PHASES.RUNNING || room.phase === ROOM_PHASES.LOBBY) emitSnapshot(room);
  }

  function processRoomTimers(now) {
    for (const room of [...roomsById.values()]) {
      if (room.phase === ROOM_PHASES.LOBBY && room.expiresAt <= Date.now()) {
        disposeRoom(room, 'LOBBY_EXPIRED');
        continue;
      }
      for (const player of room.players.values()) {
        if (player.connection === 'DISCONNECTED' && player.removeAt !== null && player.removeAt <= Date.now()) {
          player.connection = 'REMOVED';
          if (player.reconnectDigest) reconnectIndex.delete(player.reconnectDigest);
          player.reconnectDigest = null;
          player.removeAt = null;
          room.revision += 1;
          emitRoster(room, 'player:left', player);
        }
      }
      if (room.phase === ROOM_PHASES.LOBBY && activePlayerCount(room) === 0 && Date.now() - room.lastActivityAt >= config.lobbyEmptyTtlMs) {
        disposeRoom(room, 'EMPTY_LOBBY');
      } else if ((room.phase === ROOM_PHASES.COMPLETED || room.phase === ROOM_PHASES.FAILED) &&
        room.completedAt && Date.now() - room.completedAt >= config.completedRoomTtlMs) {
        disposeRoom(room, 'RESULTS_EXPIRED');
      } else if ((room.phase === ROOM_PHASES.RUNNING || room.phase === ROOM_PHASES.LOBBY) && activePlayerCount(room) === 0 && Date.now() - room.lastActivityAt >= config.completedRoomTtlMs) {
        disposeRoom(room, 'NO_ACTIVE_PLAYERS');
      }
    }
  }

  function schedulerPulse() {
    if (closed) return;
    const now = performance.now();
    // Never execute an unbounded catch-up after a stalled event loop. Move the
    // deadline forward by one fixed step and continue with a bounded tick.
    if (now + 1 < nextDeadline) {
      schedulerTimer = setTimeout(schedulerPulse, Math.max(0, nextDeadline - now));
      return;
    }
    const lateBy = Math.max(0, now - nextDeadline);
    const tickStart = performance.now();
    const steps = 1;
    for (let i = 0; i < steps; i += 1) {
      serverTick += 1;
      for (const room of roomsById.values()) stepRoom(room, config.tickMs / 1000, now);
      processRoomTimers(now);
    }
    metrics.schedulerTicks += 1;
    addMetricSample(metrics.recentScheduleLatenessMs, lateBy);
    addMetricSample(metrics.recentTickDurationsMs, performance.now() - tickStart);
    nextDeadline += config.tickMs;
    if (now - nextDeadline > config.tickMs * 2) nextDeadline = now + config.tickMs;
    schedulerTimer = setTimeout(schedulerPulse, Math.max(0, nextDeadline - performance.now()));
  }

  function bindSocket(socket) {
    const boundedRoomAction = (handler) => (payload, ack) => {
      const now = performance.now();
      let budget = roomAttemptBudgets.get(socket);
      if (!budget || now - budget.startedAt >= config.roomAttemptWindowMs) {
        budget = { startedAt: now, count: 0 };
        roomAttemptBudgets.set(socket, budget);
      }
      if (budget.count >= config.roomAttemptsPerSocket) {
        publicBoundaryRejections.roomAttempts += 1;
        return safeAck(ack, { ok: false, error: 'ROOM_ATTEMPT_LIMIT' });
      }
      budget.count += 1;
      if (now - aggregateRoomAttempts.startedAt >= config.roomAttemptWindowMs) {
        aggregateRoomAttempts.startedAt = now;
        aggregateRoomAttempts.count = 0;
      }
      if (aggregateRoomAttempts.count >= config.roomAttemptsGlobal) {
        publicBoundaryRejections.roomAttempts += 1;
        return safeAck(ack, { ok: false, error: 'SERVER_ATTEMPT_LIMIT' });
      }
      aggregateRoomAttempts.count += 1;
      handler(socket, payload, ack);
    };
    socket.on('room:create', boundedRoomAction(createRoom));
    socket.on('room:join', boundedRoomAction(joinRoom));
    socket.on('room:rejoin', boundedRoomAction(rejoinRoom));
    socket.on('room:start', (payload, ack) => startRoom(socket, payload, ack));
    socket.on('run:continue', (payload, ack) => continueCycle(socket, payload, ack));
    socket.on('room:add-mocks', (payload, ack) => addMockPlayers(socket, payload, ack));
    socket.on('intro:skip-vote', (payload, ack) => voteToSkipIntro(socket, payload, ack));
    socket.on('player:input', (payload, ack) => acceptInput(socket, payload, ack));
    socket.on('player:recover-position', (payload, ack) => recoverPosition(socket, payload, ack));
    socket.on('node:interact', (payload, ack) => validateInteract(socket, payload, ack));
    socket.on('combat:attack', (payload, ack) => attackEnemy(socket, payload, ack));
    socket.on('portal:enter', (payload, ack) => queuePortalAction(socket, payload, ack));
    socket.on('trap:disarm', (payload, ack) => disarmTrap(socket, payload, ack));
    socket.on('item:collect', (payload, ack) => collectItem(socket, payload, ack));
    socket.on('item:use', (payload, ack) => useItem(socket, payload, ack));
    socket.on('player:revive', (payload, ack) => revivePlayer(socket, payload, ack));
    socket.on('room:leave', (_payload, ack) => {
      const found = roomForSocket(socket);
      if (!found) return safeAck(ack, { ok: true });
      const { room, player } = found;
      socketToPlayer.delete(socket.id);
      player.socketId = null;
      player.connection = 'REMOVED';
      player.input.x = 0;
      player.input.z = 0;
      if (player.reconnectDigest) reconnectIndex.delete(player.reconnectDigest);
      player.reconnectDigest = null;
      reconcileRoomIntro(room);
      room.lastActivityAt = Date.now();
      room.revision += 1;
      socket.leave(room.code);
      emitRoster(room, 'player:left', player);
      emitSnapshot(room);
      safeAck(ack, { ok: true });
    });
    socket.on('disconnect', (reason) => {
      const binding = socketToPlayer.get(socket.id);
      if (!binding) return;
      const room = roomsById.get(binding.roomId);
      const player = room && room.players.get(binding.playerId);
      socketToPlayer.delete(socket.id);
      if (!room || !player || player.socketId !== socket.id || player.sessionEpoch !== binding.sessionEpoch) return;
      player.socketId = null;
      player.connection = 'DISCONNECTED';
      player.disconnectedAt = Date.now();
      player.removeAt = Date.now() + config.disconnectGraceMs;
      player.input.x = 0;
      player.input.z = 0;
      player.input.lastReceivedAt = 0;
      reconcileRoomIntro(room);
      room.lastActivityAt = Date.now();
      // This callback changes only availability/session metadata. The room's
      // simulation loop remains non-blocking and continues at the next tick.
      room.revision += 1;
      emitRoster(room, 'player:disconnected', { ...player, connection: 'DISCONNECTED', disconnectReason: String(reason || 'unknown') });
      emitSnapshot(room);
    });
  }

  io.on('connection', bindSocket);
  schedulerTimer = setTimeout(schedulerPulse, TICK_MS);

  async function listen() {
    if (options.httpServer) return server;
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(config.port, config.host, () => {
        server.off('error', reject);
        resolve();
      });
    });
    return server;
  }

  async function close() {
    if (closed) return;
    closed = true;
    if (schedulerTimer) clearTimeout(schedulerTimer);
    for (const room of [...roomsById.values()]) disposeRoom(room, 'SERVER_SHUTDOWN');
    await new Promise((resolve) => io.close(() => resolve()));
    if (server.listening) await new Promise((resolve) => server.close(() => resolve()));
  }

  return {
    config,
    io,
    httpServer: server,
    listen,
    close,
    getRoomCount: () => roomsById.size,
    getRoomSnapshot: (code) => {
      const room = roomsByCode.get(normalizeRoomCode(code));
      return room ? makeSnapshot(room) : null;
    },
    getMetrics: () => ({
      publicBoundaryRejections: { ...publicBoundaryRejections },
      schedulerTicks: metrics.schedulerTicks,
      roomTicks: metrics.roomTicks,
      snapshotsBroadcast: metrics.snapshotsBroadcast,
      inputRejections: metrics.inputRejections,
      inputRejectionsByReason: { ...metrics.inputRejectionsByReason },
      recentTickDurationsMs: [...metrics.recentTickDurationsMs],
      recentScheduleLatenessMs: [...metrics.recentScheduleLatenessMs]
    }),
    // Internal server gameplay systems may apply validated combat results.
    // This is deliberately not exposed as a client Socket.IO event.
    applyDamage: ({ roomCode, playerId, amount, sourceId }) => {
      const room = roomsByCode.get(normalizeRoomCode(roomCode));
      const player = room && room.players.get(playerId);
      if (!room || !player || player.connection === 'REMOVED' || !finiteNumber(amount) || amount <= 0) return false;
      const applied = Math.min(player.health.current, amount);
      player.health.current -= applied;
      if (sourceId && typeof sourceId === 'string') {
        const source = room.players.get(sourceId);
        if (source && source.playerId !== player.playerId) source.metrics.damageDealt += applied;
      }
      room.revision += 1;
      io.to(room.code).emit('combat:damage', {
        protocolVersion: PROTOCOL_VERSION,
        roomCode: room.code,
        tick: room.tick,
        revision: room.revision,
        playerId,
        amount: applied,
        currentHealth: player.health.current
      });
      return true;
    }
  };
}

if (require.main === module) {
  const app = createGameServer();
  app.listen().then(() => {
    // eslint-disable-next-line no-console
    console.log(`Dungeon Core authoritative server listening on ${app.config.host}:${app.config.port} (${TICK_HZ} Hz)`);
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', error);
    process.exitCode = 1;
  });
  const shutdown = () => app.close().finally(() => process.exit(0));
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

module.exports = { createGameServer, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, TICK_HZ };
