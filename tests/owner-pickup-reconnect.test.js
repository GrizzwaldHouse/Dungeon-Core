// owner-pickup-reconnect.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Reproduce owner-reported pickup and reconnect behavior with independent Socket.IO clients.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { setTimeout: delay } = require('node:timers/promises');
const { createGameServer } = require('../server/server');
const { ProbeClient } = require('./socket-client');

const bounds = { min: { x: -10, y: -2, z: -10 }, max: { x: 10, y: 8, z: 10 } };
const space = { bounds, obstacles: [], discoveryNodes: [] };
const world = { ...space, spaces: { 'amber-vault': space, 'violet-vault': space } };

async function fixture(t, overrides = {}) {
  const app = createGameServer({ host: '127.0.0.1', port: 0, world, playerSpeed: 25,
    maxHealth: 1000, disconnectGraceMs: 1000, ...overrides });
  const clients = [];
  t.after(async () => { clients.forEach((client) => client.close()); await app.close(); });
  await app.listen();
  const url = `http://127.0.0.1:${app.httpServer.address().port}`;
  async function client() {
    const value = new ProbeClient(url);
    clients.push(value);
    await value.ready;
    value.inputSeq = 0;
    return value;
  }
  return { app, client };
}

async function waitUntil(read, predicate, label, limit = 100) {
  for (let index = 0; index < limit; index += 1) {
    const value = read();
    if (predicate(value)) return value;
    await delay(40);
  }
  assert.fail(`${label} did not occur`);
}

async function moveNear(app, socket, roomCode, playerId, target, tolerance = 0.8) {
  for (let step = 0; step < 120; step += 1) {
    const position = app.getRoomSnapshot(roomCode).players[playerId].transform.position;
    const dx = target.x - position.x;
    const dz = target.z - position.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= tolerance) {
      assert.equal((await socket.rpc('player:input', { inputSeq: ++socket.inputSeq,
        moveX: 0, moveZ: 0 })).ok, true);
      return;
    }
    assert.equal((await socket.rpc('player:input', { inputSeq: ++socket.inputSeq,
      moveX: dx / distance, moveZ: dz / distance })).ok, true);
    await delay(40);
  }
  assert.fail('Could not reach server-owned world target');
}

async function reachRecovery(app, host, roomCode, playerId) {
  const snapshot = () => app.getRoomSnapshot(roomCode);
  await moveNear(app, host, roomCode, playerId, { x: 7, z: 0 }, 1);
  for (let strike = 0; strike < 12 && !snapshot().floor.requiredObjectives.sentinelDefeated; strike += 1) {
    const result = await host.rpc('combat:attack', { actionId: `owner-sentinel-${strike}` });
    assert.equal(result.ok, true, `Sentinel strike ${strike}: ${result.error}`);
    await delay(490);
  }
  assert.equal(snapshot().floor.requiredObjectives.sentinelDefeated, true);
  await moveNear(app, host, roomCode, playerId, snapshot().portals[0].position, 0.6);
  assert.equal((await host.rpc('portal:enter', { actionId: 'owner-enter-vault', portalId: 'shift-gate' })).ok, true);
  await waitUntil(snapshot, (state) => state.arrival === null, 'vault arrival readiness');
  await moveNear(app, host, roomCode, playerId, snapshot().trap.position, 1.2);
  assert.equal((await host.rpc('trap:disarm', { actionId: 'owner-disarm', trapId: 'vault-trap' })).ok, true);
  await moveNear(app, host, roomCode, playerId, snapshot().portals[0].position, 0.6);
  assert.equal((await host.rpc('portal:enter', { actionId: 'owner-leave-floor-one', portalId: 'floor-exit' })).ok, true);
  await waitUntil(snapshot, (state) => state.arrival === null, 'recovery arrival readiness');
  assert.equal(snapshot().floor.phase, 'REST');
}

test('OWNER-002: one collector leaves a personal claim for the other independent client', async (t) => {
  const { app, client } = await fixture(t);
  const host = await client();
  const peer = await client();
  const created = await host.rpc('room:create', { displayName: 'Host' });
  const joined = await peer.rpc('room:join', { displayName: 'Peer', roomCode: created.roomCode });
  assert.equal(joined.ok, true);
  assert.equal((await host.rpc('room:start')).ok, true);
  const code = created.roomCode;
  await reachRecovery(app, host, code, created.playerId);
  const before = app.getRoomSnapshot(code);
  assert.deepEqual(before.items.find((item) => item.id === 'rest-supply').claimedBy, []);
  await moveNear(app, host, code, created.playerId, { x: 0, z: -3 }, 0.6);
  const peerSawClaim = peer.waitFor('item:collected', (event) =>
    event.itemId === 'rest-supply' && event.playerId === created.playerId);
  const peerSawSnapshot = peer.waitFor('room:snapshot', (state) =>
    state.items.find((item) => item.id === 'rest-supply')?.claimedBy.includes(created.playerId));
  const hostSawSnapshot = host.waitFor('room:snapshot', (state) =>
    state.items.find((item) => item.id === 'rest-supply')?.claimedBy.includes(created.playerId));
  const hostClaim = await host.rpc('item:collect', { actionId: 'owner-host-claim', itemId: 'rest-supply' });
  assert.equal(hostClaim.ok, true);
  await peerSawClaim;
  const [hostState, peerState] = await Promise.all([hostSawSnapshot, peerSawSnapshot]);
  assert.deepEqual(hostState.items.find((item) => item.id === 'rest-supply').claimedBy,
    peerState.items.find((item) => item.id === 'rest-supply').claimedBy);
  const afterHost = app.getRoomSnapshot(code);
  assert.deepEqual(afterHost.items.find((item) => item.id === 'rest-supply').claimedBy, [created.playerId]);
  assert.equal(afterHost.players[created.playerId].inventory.healingCharges, 1);
  assert.equal(afterHost.players[joined.playerId].inventory.healingCharges, 0);
  assert.equal((await host.rpc('item:collect', { actionId: 'owner-repeat', itemId: 'rest-supply' })).error,
    'ALREADY_CLAIMED');
  await moveNear(app, peer, code, joined.playerId, { x: 0, z: -3 }, 0.6);
  const hostSawPeerClaim = host.waitFor('room:snapshot', (state) =>
    state.items.find((item) => item.id === 'rest-supply')?.claimedBy.includes(joined.playerId));
  const peerClaim = await peer.rpc('item:collect', { actionId: 'owner-peer-claim', itemId: 'rest-supply' });
  assert.equal(peerClaim.ok, true);
  await hostSawPeerClaim;
  const afterBoth = app.getRoomSnapshot(code);
  assert.deepEqual(new Set(afterBoth.items.find((item) => item.id === 'rest-supply').claimedBy),
    new Set([created.playerId, joined.playerId]));
  assert.equal(afterBoth.players[joined.playerId].inventory.healingCharges, 1);
  assert.equal((await peer.rpc('item:collect', { actionId: 'owner-peer-repeat', itemId: 'rest-supply' })).error,
    'ALREADY_CLAIMED');
});

test('OWNER-003: a running-room session rejoins inside grace and rotates its token', async (t) => {
  const { app, client } = await fixture(t);
  const host = await client();
  const peer = await client();
  const created = await host.rpc('room:create', { displayName: 'Host' });
  const joined = await peer.rpc('room:join', { displayName: 'Peer', roomCode: created.roomCode });
  assert.equal((await host.rpc('room:start')).ok, true);
  const disconnected = host.waitFor('player:disconnected', (event) => event.player.playerId === joined.playerId);
  peer.close();
  await disconnected;
  const replacement = await client();
  const resumed = await replacement.rpc('room:rejoin', {
    roomCode: created.roomCode, reconnectToken: joined.reconnectToken });
  assert.equal(resumed.ok, true);
  assert.equal(resumed.playerId, joined.playerId);
  assert.notEqual(resumed.reconnectToken, joined.reconnectToken);
  assert.equal(resumed.snapshot.phase, 'RUNNING');
  assert.equal(app.getRoomSnapshot(created.roomCode).players[joined.playerId].connection, 'CONNECTED');
  const stale = await client();
  assert.equal((await stale.rpc('room:rejoin', { roomCode: created.roomCode,
    reconnectToken: joined.reconnectToken })).error, 'INVALID_REJOIN');
});

test('OWNER-003: a reconnect after grace expires rejects the old session without changing the room', async (t) => {
  const { app, client } = await fixture(t);
  const host = await client();
  const peer = await client();
  const created = await host.rpc('room:create', { displayName: 'Host' });
  const joined = await peer.rpc('room:join', { displayName: 'Peer', roomCode: created.roomCode });
  assert.equal((await host.rpc('room:start')).ok, true);
  const disconnected = host.waitFor('player:disconnected', (event) => event.player.playerId === joined.playerId);
  peer.close();
  await disconnected;
  await waitUntil(() => app.getRoomSnapshot(created.roomCode),
    (state) => !state.players[joined.playerId], 'grace expiry', 80);
  const replacement = await client();
  const expired = await replacement.rpc('room:rejoin', {
    roomCode: created.roomCode, reconnectToken: joined.reconnectToken });
  assert.equal(expired.ok, false);
  assert.equal(expired.error, 'INVALID_REJOIN');
  assert.equal(app.getRoomSnapshot(created.roomCode).phase, 'RUNNING');
  assert.equal(app.getRoomSnapshot(created.roomCode).players[created.playerId].connection, 'CONNECTED');
});
