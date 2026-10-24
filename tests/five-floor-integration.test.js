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
