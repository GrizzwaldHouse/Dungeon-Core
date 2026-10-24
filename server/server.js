// server.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Keep multiplayer room state and collision authoritative across concurrent sockets.

'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const { serveClient } = require('./static-client');
const { Server } = require('socket.io');
const { TICK_HZ, TICK_MS, createServerConfig } = require('./config/game-parameters');
const {
  ACTION_ID_PATTERN, TRAP_WARNING_TICKS, TRAP_ACTIVE_TICKS, TRAP_DAMAGE,
  RUSH_DURATION_TICKS, RUSH_DAMAGE_BASIS_POINTS, createRun, currentPortal,
  routeDestination, requiredObjectiveComplete, explorationBasisPoints,
  publicRun, calculateAwards
} = require('./dungeon-run');

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 symbols
const ROOM_CODE_LENGTH = 4;
const PROTOCOL_VERSION = 1;

const ROOM_PHASES = Object.freeze({ LOBBY: 'LOBBY', RUNNING: 'RUNNING', COMPLETED: 'COMPLETED', CLOSED: 'CLOSED' });
const MOCK_PLAYER_NAMES = Object.freeze(['Mock Ember', 'Mock Moss', 'Mock Vale', 'Mock Rune', 'Mock Ash']);
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

  const server = options.httpServer || http.createServer((request, response) => {
    if (request.url === '/healthz') {
      response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ ok: true, tickHz: TICK_HZ, rooms: roomsByCode.size }));
      return;
    }
    serveClient(request, response);
  });

  const io = options.io || new Server(server, {
    cors: { origin: config.corsOrigin, methods: ['GET', 'POST'] },
    maxHttpBufferSize: config.maxPayloadBytes,
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
    connectionStateRecovery: { maxDisconnectionDuration: config.disconnectGraceMs, skipMiddlewares: false }
  });

  // `roomsByCode` is the join-code index. `roomsById` is the authoritative
  // aggregate index. `socketToPlayer` prevents a socket from controlling two
  // player records and lets disconnect handling find the owning room quickly.
  const roomsByCode = new Map();
  const roomsById = new Map();
  const socketToPlayer = new Map();
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
      statusEffects: player.statusEffects.map((effect) => ({ ...effect })),
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
      hostPlayerId: [...room.players.values()].find((candidate) => candidate.connection !== 'REMOVED')?.playerId ?? null,
      tick: room.tick,
      revision: room.revision,
      revealedNodeIds: [...room.revealedNodeIds],
      players,
      enemies,
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
        statusEffects: [],
        discoveredNodeIds: new Set(),
        input: { x: 0, z: 0, rotationY: 0, lastSeq: -1, lastReceivedAt: 0, recentTimes: [] },
        combat: { nextAttackAt: 0, recentActions: new Map() },
        portal: { recentActions: new Map() },
        trap: { recentActions: new Map() },
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
    return createPlayer(MOCK_PLAYER_NAMES[index % MOCK_PLAYER_NAMES.length], null, spawn, { index });
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
      layoutWorld: config.world,
      world: config.world,
      obstacles: config.world.obstacles,
      discoveryNodes: config.world.discoveryNodes,
      revealedNodeIds: new Set(),
      lastActivityAt: Date.now(),
      nextIdleCheckAt: 0,
      run: null,
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
    room.phase = ROOM_PHASES.RUNNING;
    room.run = createRun(room.world, room.tick);
    const enemyId = randomId('enemy');
    room.enemies.set(enemyId, {
      enemyId,
      kind: 'SENTINEL',
      transform: { position: enemySpawn(room), rotation: { x: 0, y: 0, z: 0 } },
      health: { current: config.combat.enemyMaxHealth, max: config.combat.enemyMaxHealth },
      nextAttackAt: 0
    });
    room.revision += 1;
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
    player.metrics.nodesDiscovered = player.discoveredNodeIds.size;
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
    let result;
    const now = performance.now();
    if (player.health.current <= 0) result = { ok: false, error: 'PLAYER_DOWN' };
    else if (now < player.combat.nextAttackAt) result = { ok: false, error: 'ATTACK_COOLDOWN' };
    else {
      const origin = player.transform.position;
      let target = null;
      let nearest = config.combat.playerAttackRangeMeters ** 2;
      for (const enemy of room.enemies.values()) {
        if (enemy.health.current <= 0) continue;
        const dx = enemy.transform.position.x - origin.x;
        const dz = enemy.transform.position.z - origin.z;
        const distanceSquared = dx * dx + dz * dz;
        if (distanceSquared <= nearest && !room.obstacles.some((box) =>
          (!box.revealNodeId || !room.revealedNodeIds.has(box.revealNodeId)) &&
          segmentIntersectsAabb(origin, enemy.transform.position, box))) {
          nearest = distanceSquared;
          target = enemy;
        }
      }
      if (!target) result = { ok: false, error: 'OUT_OF_RANGE' };
      else {
        const damage = Math.min(target.health.current, config.combat.playerAttackDamage);
        target.health.current -= damage;
        player.metrics.damageDealt += damage;
        player.combat.nextAttackAt = now + config.combat.playerAttackCooldownMs;
        room.lastActivityAt = Date.now();
        room.revision += 1;
        result = { ok: true, actionId, enemyId: target.enemyId, damage, remainingHealth: target.health.current, defeated: target.health.current === 0 };
        io.to(room.code).emit('combat:enemy-hit', {
          protocolVersion: PROTOCOL_VERSION, roomCode: room.code, tick: room.tick, revision: room.revision,
          enemyId: target.enemyId, attackerPlayerId: player.playerId,
          damage, currentHealth: target.health.current, defeated: result.defeated
        });
        emitSnapshot(room);
      }
    }
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
        (!requiredObjectiveComplete(room) || room.run.trap?.state !== 'CLEARED')) {
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
        room.run.awarded = true;
        room.run.awards = calculateAwards(room);
        room.run.level += 1;
        room.phase = ROOM_PHASES.COMPLETED;
        room.completedAt = Date.now();
        room.lastActivityAt = room.completedAt;
        room.revision += 1;
        result = { ok: true, actionId: action.actionId, portalId: portal.id,
          completed: true, revision: room.revision, serverTick: room.tick };
        io.to(room.code).emit('floor:completed', { protocolVersion: PROTOCOL_VERSION, roomCode: room.code,
          tick: room.tick, revision: room.revision, ...room.run.awards });
        emitSnapshot(room);
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

  function updateMockInput(player, room) {
    const angle = room.tick * 0.06 + player.bot.index * (Math.PI / 2);
    player.input.x = Math.cos(angle);
    player.input.z = Math.sin(angle);
    player.input.rotationY = Math.atan2(player.input.x, player.input.z);
  }

  function stepEnemies(room, dt, now) {
    for (const enemy of room.enemies.values()) {
      if (enemy.health.current <= 0) continue;
      let target = null;
      let nearest = config.combat.enemyAggroRadiusMeters ** 2;
      for (const player of room.players.values()) {
        if (player.connection !== 'CONNECTED' || player.health.current <= 0) continue;
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
        const attackDamage = rushed ? Math.ceil(config.combat.enemyAttackDamage * RUSH_DAMAGE_BASIS_POINTS / 10000) :
          config.combat.enemyAttackDamage;
        const damage = Math.min(target.health.current, attackDamage);
        target.health.current -= damage;
        enemy.nextAttackAt = now + config.combat.enemyAttackCooldownMs;
        room.revision += 1;
        io.to(room.code).emit('combat:damage', {
          protocolVersion: PROTOCOL_VERSION, roomCode: room.code, tick: room.tick, revision: room.revision,
          playerId: target.playerId, sourceId: enemy.enemyId, amount: damage, currentHealth: target.health.current
        });
      }
    }
  }

  function stepRoom(room, dt, now) {
    if (room.phase === ROOM_PHASES.CLOSED || room.phase === ROOM_PHASES.COMPLETED) return;
    metrics.roomTicks += 1;
    room.tick += 1;
    let changed = false;
    for (const player of room.players.values()) {
      player.statusEffects = player.statusEffects.filter((effect) => effect.expiresAtTick > room.tick);
      if (player.connection !== 'CONNECTED' && player.connection !== 'BOT') continue;
      if (player.connection === 'BOT' && room.phase === ROOM_PHASES.RUNNING) {
        updateMockInput(player, room);
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
        const dx = player.input.x * config.playerSpeed * dt;
        const dz = player.input.z * config.playerSpeed * dt;
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
          player.metrics.nodesDiscovered = player.discoveredNodeIds.size;
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
        stepEnemies(room, dt, now);
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
      } else if (room.phase === ROOM_PHASES.COMPLETED && room.completedAt && Date.now() - room.completedAt >= config.completedRoomTtlMs) {
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
    socket.on('room:create', (payload, ack) => createRoom(socket, payload, ack));
    socket.on('room:join', (payload, ack) => joinRoom(socket, payload, ack));
    socket.on('room:rejoin', (payload, ack) => rejoinRoom(socket, payload, ack));
    socket.on('room:start', (payload, ack) => startRoom(socket, payload, ack));
    socket.on('room:add-mocks', (payload, ack) => addMockPlayers(socket, payload, ack));
    socket.on('player:input', (payload, ack) => acceptInput(socket, payload, ack));
    socket.on('node:interact', (payload, ack) => validateInteract(socket, payload, ack));
    socket.on('combat:attack', (payload, ack) => attackEnemy(socket, payload, ack));
    socket.on('portal:enter', (payload, ack) => queuePortalAction(socket, payload, ack));
    socket.on('trap:disarm', (payload, ack) => disarmTrap(socket, payload, ack));
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
