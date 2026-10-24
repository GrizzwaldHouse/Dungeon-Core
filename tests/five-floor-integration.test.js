// five-floor-integration.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Catch authoritative floor handoff regressions without binding a local network port.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');
const { createGameServer } = require('../server/server');

class FakeSocket extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.rooms = new Set();
  }
  join(roomCode) { this.rooms.add(roomCode); }
  leave(roomCode) { this.rooms.delete(roomCode); }
  rpc(event, payload = {}) {
    return new Promise((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error(`${event} did not acknowledge`)), 3000);
      this.emit(event, payload, (result) => { clearTimeout(deadline); resolve(result); });
    });
  }
}

class FakeIO extends EventEmitter {
  constructor() {
    super();
    this.sockets = new Map();
  }
  connect(id) {
    const socket = new FakeSocket(id);
    this.sockets.set(id, socket);
    this.emit('connection', socket);
    return socket;
  }
  to(roomCode) {
    return { emit: (event, payload) => {
      for (const socket of this.sockets.values()) {
        if (socket.rooms.has(roomCode)) socket.emit(event, payload);
      }
    } };
  }
  in(roomCode) {
    return { socketsLeave: () => {
      for (const socket of this.sockets.values()) socket.leave(roomCode);
    } };
  }
  close(callback) { callback(); }
}

const bounds = { min: { x: -8, y: -2, z: -8 }, max: { x: 8, y: 8, z: 8 } };
const emptySpace = { bounds, obstacles: [], discoveryNodes: [] };
const world = { ...emptySpace, spaces: { 'amber-vault': emptySpace, 'violet-vault': emptySpace } };

// Why: Exercise server-owned movement inputs without mutating private player transforms.
// Input: A connected socket, room snapshot API, and a reachable target in the open test arena.
// Output: The explorer is within the requested tolerance or the test fails with its last position.
async function moveNear(app, socket, roomCode, playerId, target, tolerance = 1.2) {
  for (let step = 0; step < 100; step += 1) {
    const position = app.getRoomSnapshot(roomCode).players[playerId].transform.position;
    const dx = target.x - position.x;
    const dz = target.z - position.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= tolerance) {
      assert.equal((await socket.rpc('player:input', { inputSeq: ++socket.seq,
        moveX: 0, moveZ: 0 })).ok, true);
      return;
    }
    assert.equal((await socket.rpc('player:input', { inputSeq: ++socket.seq,
      moveX: dx / distance, moveZ: dz / distance })).ok, true);
    await delay(40);
  }
  assert.fail(`Explorer could not reach ${JSON.stringify(target)}; at ${JSON.stringify(
    app.getRoomSnapshot(roomCode).players[playerId].transform.position)}`);
}

test('authoritative first-floor exit awards once and starts two-boss floor after recovery', async (t) => {
  const io = new FakeIO();
  const app = createGameServer({ io, httpServer: { listening: false }, world, playerSpeed: 18 });
  t.after(async () => app.close());
  const host = io.connect('host');
  host.seq = 0;
  const peer = io.connect('peer');
  const created = await host.rpc('room:create', { displayName: 'Explorer One' });
  assert.equal(created.ok, true);
  assert.equal((await peer.rpc('room:join', { roomCode: created.roomCode, displayName: 'Explorer Two' })).ok, true);
  assert.equal((await host.rpc('room:start')).ok, true);
  const code = created.roomCode;

  await moveNear(app, host, code, created.playerId, { x: 6.3, z: 0 }, 0.5);
  for (let strike = 0; strike < 5; strike += 1) {
    const result = await host.rpc('combat:attack', { actionId: `sentinel-${strike}` });
    assert.equal(result.ok, true, `Sentinel strike ${strike}: ${result.error}`);
    if (strike < 4) await delay(470);
  }
  assert.equal(app.getRoomSnapshot(code).floor.requiredObjectives.sentinelDefeated, true);
  await moveNear(app, host, code, created.playerId, { x: 0, z: -3.2 });
  const shifted = await host.rpc('portal:enter', { actionId: 'enter-vault', portalId: 'shift-gate' });
  assert.equal(shifted.ok, true);
  await moveNear(app, host, code, created.playerId, { x: 0, z: -1.1 });
  assert.equal((await host.rpc('trap:disarm', { actionId: 'safe-trap', trapId: 'vault-trap' })).ok, true);
  await moveNear(app, host, code, created.playerId, { x: 0, z: 3.2 });
  const finished = await host.rpc('portal:enter', { actionId: 'floor-one-exit', portalId: 'floor-exit' });
  assert.equal(finished.ok, true);
  let snapshot = app.getRoomSnapshot(code);
  assert.equal(snapshot.phase, 'RUNNING');
  assert.equal(snapshot.floor.index, 2);
  assert.equal(snapshot.floor.phase, 'REST');
  assert.equal(snapshot.players[created.playerId].xp.base, 100);
  assert.ok(snapshot.items.some((item) => item.id === 'rest-supply'));
  assert.deepEqual(await host.rpc('portal:enter', { actionId: 'floor-one-exit', portalId: 'floor-exit' }), finished);
  assert.equal(app.getRoomSnapshot(code).players[created.playerId].xp.base, 100);

  await moveNear(app, host, code, created.playerId, { x: 0, z: -3 }, 0.5);
  const supply = await host.rpc('item:collect', { actionId: 'claim-rest-supply', itemId: 'rest-supply' });
  assert.equal(supply.ok, true);
  assert.deepEqual(await host.rpc('item:collect', { actionId: 'claim-rest-supply', itemId: 'rest-supply' }), supply);
  assert.equal(app.getRoomSnapshot(code).players[created.playerId].inventory.healingCharges, 1);

  await moveNear(app, host, code, created.playerId, { x: 0, z: 7.2 }, 0.5);
  const next = await host.rpc('portal:enter', { actionId: 'leave-recovery', portalId: 'rest-exit' });
  assert.equal(next.ok, true, `Recovery exit: ${next.error}`);
  snapshot = app.getRoomSnapshot(code);
  assert.equal(snapshot.floor.index, 2);
  assert.equal(snapshot.floor.phase, 'FLOOR_TWO');
  assert.equal(snapshot.encounter.stage, 'KEEPER');
  assert.equal(snapshot.portals[0].state, 'SEALED');
  assert.equal(Object.values(snapshot.enemies).filter((enemy) => enemy.kind === 'THRESHOLD_KEEPER').length, 1);
  assert.equal(snapshot.players[created.playerId].xp.base, 100);
});

// Why: The next progression slice must be proven through public intents, without mutating a private room Map.
// Input: Fake transport and a monotonic test-clock offset that advances attack cooldowns after real ticks.
// Output: The second-floor encounter and resource floor hand off to the rune trial.
// Watch Out: This covers progression, not real-time cooldown duration; dedicated combat tests own that timing.
test('two bosses, finite resource waves, and personal claims reach the fourth-floor trial', async (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'performance');
  const realPerformance = globalThis.performance;
  let offset = 0;
  Object.defineProperty(globalThis, 'performance', { configurable: true,
    value: { now: () => realPerformance.now() + offset } });
  const io = new FakeIO();
  const wideBounds = { min: { x: -12, y: -2, z: -12 }, max: { x: 12, y: 8, z: 12 } };
  const wideSpace = { bounds: wideBounds, obstacles: [], discoveryNodes: [] };
  const wideWorld = { ...wideSpace, spaces: { 'amber-vault': wideSpace, 'violet-vault': wideSpace } };
  const app = createGameServer({ io, httpServer: { listening: false }, world: wideWorld,
    playerSpeed: 25, maxHealth: 1000000 });
  t.after(async () => { await app.close(); Object.defineProperty(globalThis, 'performance', descriptor); });
  const host = io.connect('lead');
  host.seq = 0;
  const peer = io.connect('ally');
  const created = await host.rpc('room:create', { displayName: 'Lead' });
  const joined = await peer.rpc('room:join', { roomCode: created.roomCode, displayName: 'Ally' });
  assert.equal(joined.ok, true);
  assert.equal((await host.rpc('room:start')).ok, true);
  const code = created.roomCode;
  const snapshot = () => app.getRoomSnapshot(code);
  const activeEnemies = () => Object.values(snapshot().enemies).filter((enemy) => enemy.health.current > 0);
  let action = 0;

  async function waitFor(predicate, label, iterations = 120) {
    for (let i = 0; i < iterations; i += 1) {
      const current = snapshot();
      if (predicate(current)) return current;
      await delay(40);
    }
    assert.fail(`Timed out waiting for ${label}; phase=${snapshot().floor?.phase}`);
  }
  async function strikeUntil(done, label, limit = 80) {
    for (let i = 0; i < limit; i += 1) {
      if (done(snapshot())) return;
      const enemy = activeEnemies()[0];
      if (!enemy) { await delay(40); continue; }
      await moveNear(app, host, code, created.playerId, enemy.transform.position, 1.1);
      const response = await host.rpc('combat:attack', { actionId: `run-strike-${++action}` });
      if (response.ok) offset += 460;
      else assert.ok(['OUT_OF_RANGE', 'ATTACK_COOLDOWN'].includes(response.error),
        `${label}: ${response.error}`);
      await delay(45);
    }
    assert.fail(`${label} did not clear after ${limit} attempts; phase=${snapshot().encounter?.stage ||
      snapshot().encounter?.phase}, enemies=${activeEnemies().map((enemy) => enemy.kind).join(',')}`);
  }
  async function enterCurrentPortal(label) {
    const portal = snapshot().portals[0];
    assert.equal(portal.state, 'AVAILABLE', `${label} portal sealed`);
    await moveNear(app, host, code, created.playerId, portal.position, 0.8);
    const outcome = await host.rpc('portal:enter', { actionId: `route-${++action}`, portalId: portal.id });
    assert.equal(outcome.ok, true, `${label}: ${outcome.error}`);
    return outcome;
  }
  async function leaveRest(nextFloor) {
    assert.equal(snapshot().floor.phase, 'REST');
    await enterCurrentPortal(`rest to ${nextFloor}`);
    assert.equal(snapshot().floor.index, nextFloor);
    assert.equal(snapshot().floor.phase, `FLOOR_${['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'][nextFloor]}`);
  }

  await strikeUntil((state) => state.floor.requiredObjectives.sentinelDefeated, 'Sentinel', 12);
  await enterCurrentPortal('entry gate');
  await moveNear(app, host, code, created.playerId, snapshot().trap.position, 1.4);
  assert.equal((await host.rpc('trap:disarm', { actionId: `route-${++action}`, trapId: 'vault-trap' })).ok, true);
  await enterCurrentPortal('floor one exit');
  assert.equal(snapshot().floor.index, 2);
  assert.equal(snapshot().players[created.playerId].xp.base, 100);

  await leaveRest(2);
  await strikeUntil((state) => state.encounter?.stage === 'CLEARED', 'floor two bosses', 55);
  assert.equal(snapshot().floor.requiredObjectives.encounterComplete, true);
  await enterCurrentPortal('floor two exit');
  assert.equal(snapshot().players[created.playerId].xp.base, 200);

  await leaveRest(3);
  await waitFor((state) => state.encounter?.waveIndex >= 1, 'first mob wave');
  await moveNear(app, host, code, created.playerId, { x: -5, z: -2 }, 0.8);
  assert.equal((await host.rpc('item:collect', { actionId: `route-${++action}`, itemId: 'supply-cache' })).ok, true);
  await moveNear(app, host, code, created.playerId, { x: 10, z: 8 }, 0.8);
  await waitFor((state) => state.items.some((item) => item.id === 'forgotten-cache'), 'hidden cache discovery');
  assert.equal((await host.rpc('item:collect', { actionId: `route-${++action}`, itemId: 'forgotten-cache' })).ok, true);
  assert.equal(snapshot().players[created.playerId].inventory.riches, 10);
  await strikeUntil((state) => state.encounter?.phase === 'REST_AVAILABLE', 'floor three waves', 85);
  await enterCurrentPortal('floor three recovery gate');
  assert.equal(snapshot().players[created.playerId].xp.base, 300);

  await leaveRest(4);
  assert.equal(snapshot().encounter.stage, 'RUNES');
  assert.equal(snapshot().encounter.nextRuneIndex, 0);
  assert.equal(snapshot().portals[0].state, 'SEALED');
  assert.equal(snapshot().players[created.playerId].xp.base, 300);
});
