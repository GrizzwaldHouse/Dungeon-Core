// server.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Detect regressions in server-owned multiplayer state and room isolation.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createGameServer, ROOM_CODE_ALPHABET } = require('../server/server');
const { objects: layoutObjects, world: authoredWorld } = require('../shared/dungeon-layout');
const { ProbeClient } = require('./socket-client');

async function fixture(t, overrides = {}) {
  const app = createGameServer({ host: '127.0.0.1', port: 0, ...overrides });
  const clients = [];
  t.after(async () => { clients.forEach((client) => client.close()); await app.close(); });
  await app.listen();
  const url = `http://127.0.0.1:${app.httpServer.address().port}`;
  async function client() { const value = new ProbeClient(url); clients.push(value); await value.ready; return value; }
  return { app, url, client };
}

test('unique room codes, invalid join, and room isolation', async (t) => {
  const { client } = await fixture(t);
  const a = await client();
  const b = await client();
  const c = await client();
  const first = await a.rpc('room:create', { displayName: 'A' });
  const second = await b.rpc('room:create', { displayName: 'B' });
  assert.equal(first.ok, true);
  assert.equal(first.roomCode.length, 4);
  assert.notEqual(first.roomCode, second.roomCode);
  assert.ok([...first.roomCode].every((symbol) => ROOM_CODE_ALPHABET.includes(symbol)));
  assert.deepEqual(await c.rpc('room:join', { displayName: 'C', roomCode: 'bad!' }), { ok: false, error: 'ROOM_NOT_FOUND' });
  const foreign = [];
  const off = b.on('room:snapshot', (snapshot) => { if (snapshot.roomCode !== second.roomCode) foreign.push(snapshot); });
  await c.rpc('room:join', { displayName: 'C', roomCode: first.roomCode });
  await new Promise((resolve) => setTimeout(resolve, 80));
  off();
  assert.equal(foreign.length, 0);
});

test('host, capacity, phase, validation, and server-owned movement', async (t) => {
  const wall = { min: { x: 0.8, y: -1, z: -1 }, max: { x: 1.2, y: 2, z: 1 } };
  const world = { bounds: { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 8, z: 2 } }, obstacles: [wall], discoveryNodes: [] };
  const { app, client } = await fixture(t, { maxPlayers: 2, world });
  const a = await client();
  const b = await client();
  const c = await client();
  const first = await a.rpc('room:create', { displayName: 'Host' });
  assert.equal((await a.rpc('room:start')).error, 'NOT_ENOUGH_PLAYERS');
  assert.equal((await b.rpc('room:join', { displayName: 'Guest', roomCode: first.roomCode })).ok, true);
  assert.equal((await c.rpc('room:join', { displayName: 'Extra', roomCode: first.roomCode })).error, 'ROOM_FULL');
  assert.equal((await b.rpc('room:start')).error, 'HOST_ONLY');
  assert.equal((await a.rpc('room:start')).ok, true);
  assert.equal((await c.rpc('room:join', { displayName: 'Extra', roomCode: first.roomCode })).error, 'ROOM_NOT_FOUND');
  assert.equal((await a.rpc('player:input', { inputSeq: 1, moveX: 'fast', moveZ: 0 })).error, 'INVALID_INPUT');
  assert.equal((await a.rpc('player:input', { inputSeq: 1, moveX: 1, moveZ: 0, position: { x: 9999, y: 9999, z: 9999 } })).ok, true);
  assert.equal((await a.rpc('player:input', { inputSeq: 1, moveX: 1, moveZ: 0 })).error, 'STALE_INPUT');
  for (let seq = 2; seq < 12; seq += 1) {
    await new Promise((resolve) => setTimeout(resolve, 70));
    await a.rpc('player:input', { inputSeq: seq, moveX: 100, moveZ: 0 });
  }
  const position = app.getRoomSnapshot(first.roomCode).players[first.playerId].transform.position;
  assert.ok(position.x >= 0 && position.x < 0.8, `wall stopped x=${position.x}`);
  assert.equal(position.y, 0);
  assert.equal((await a.rpc('room:start')).error, 'INVALID_PHASE');
});

test('authored interior columns block authoritative movement', async (t) => {
  const { app, client } = await fixture(t);
  const host = await client();
  const guest = await client();
  const created = await host.rpc('room:create', { displayName: 'Host' });
  await guest.rpc('room:join', { displayName: 'Guest', roomCode: created.roomCode });
  await host.rpc('room:start');
  for (let inputSeq = 1; inputSeq <= 12; inputSeq += 1) {
    await host.rpc('player:input', { inputSeq, moveX: -1, moveZ: 0 });
    await new Promise((resolve) => setTimeout(resolve, 70));
  }
  await host.rpc('player:input', { inputSeq: 13, moveX: 0, moveZ: 0 });
  const position = app.getRoomSnapshot(created.roomCode).players[created.playerId].transform.position;
  assert.ok(position.x > -2.36, `interior column should block movement, got x=${position.x}`);
});

test('host creates a moving mock party that shares authoritative collision', async (t) => {
  const { app, client } = await fixture(t);
  const host = await client();
  const created = await host.rpc('room:create', { displayName: 'Host' });
  const added = await host.rpc('room:add-mocks', { count: 4 });
  assert.equal(added.added, 4);
  let snapshot = app.getRoomSnapshot(created.roomCode);
  const bots = Object.values(snapshot.players).filter((player) => player.connection === 'BOT');
  assert.equal(bots.length, 4);
  const before = bots.map((player) => ({ ...player.transform.position }));
  assert.equal((await host.rpc('room:start')).ok, true);
  await new Promise((resolve) => setTimeout(resolve, 350));
  snapshot = app.getRoomSnapshot(created.roomCode);
  const after = Object.values(snapshot.players)
    .filter((player) => player.connection === 'BOT')
    .map((player) => player.transform.position);
  assert.ok(after.some((position, index) => position.x !== before[index].x || position.z !== before[index].z), 'at least one mock explorer moved');
});

test('sentinel movement and melee attacks remain server owned', async (t) => {
  const world = {
    bounds: { min: { x: -4, y: -2, z: -4 }, max: { x: 4, y: 8, z: 4 } },
    obstacles: [], discoveryNodes: []
  };
  const { app, client } = await fixture(t, { world });
  const host = await client();
  const peer = await client();
  const created = await host.rpc('room:create', { displayName: 'Host' });
  await peer.rpc('room:join', { displayName: 'Peer', roomCode: created.roomCode });
  assert.equal(Object.keys(app.getRoomSnapshot(created.roomCode).enemies).length, 0);
  await host.rpc('room:start');
  const first = Object.values(app.getRoomSnapshot(created.roomCode).enemies)[0];
  assert.equal(first.health.current, 100);
  assert.equal((await host.rpc('combat:attack', { actionId: 'too-far' })).error, 'OUT_OF_RANGE');
  await host.emit('combat:enemy-hit', { enemyId: first.enemyId, damage: 999 });
  await new Promise((resolve) => setTimeout(resolve, 250));
  const after = app.getRoomSnapshot(created.roomCode).enemies[first.enemyId];
  assert.ok(after.transform.position.x < first.transform.position.x, 'sentinel advanced on a live player');
  assert.equal(after.health.current, 100, 'client damage messages cannot change enemy health');
});

test('combat validates range, cooldown and action replay, and shares health within one room', async (t) => {
  const world = {
    bounds: { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 8, z: 2 } },
    obstacles: [], discoveryNodes: []
  };
  const { app, client } = await fixture(t, { world });
  const host = await client();
  const peer = await client();
  const created = await host.rpc('room:create', { displayName: 'Host' });
  await peer.rpc('room:join', { displayName: 'Peer', roomCode: created.roomCode });
  await host.rpc('room:start');
  assert.equal((await host.rpc('combat:attack', { actionId: 'bad id!' })).error, 'INVALID_ACTION');
  const first = await host.rpc('combat:attack', { actionId: 'strike-1' });
  assert.equal(first.ok, true);
  assert.equal(first.damage, 20);
  assert.deepEqual(await host.rpc('combat:attack', { actionId: 'strike-1' }), first);
  assert.equal((await host.rpc('combat:attack', { actionId: 'strike-2' })).error, 'ATTACK_COOLDOWN');
  const snapshot = app.getRoomSnapshot(created.roomCode);
  assert.equal(snapshot.enemies[first.enemyId].health.current, 80);
  assert.equal(snapshot.players[created.playerId].metrics.damageDealt, 20);
  assert.equal((await peer.rpc('combat:attack', { actionId: 'peer-1' })).ok, true);
  assert.equal(app.getRoomSnapshot(created.roomCode).enemies[first.enemyId].health.current, 60);
});

test('melee strikes cannot pass through a solid wall', async (t) => {
  const world = {
    bounds: { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 8, z: 2 } },
    obstacles: [{ min: { x: 0.6, y: -1, z: -1 }, max: { x: 0.9, y: 2, z: 1 } }],
    discoveryNodes: []
  };
  const { app, client } = await fixture(t, { world });
  const host = await client();
  const peer = await client();
  const created = await host.rpc('room:create', { displayName: 'Host' });
  await peer.rpc('room:join', { displayName: 'Peer', roomCode: created.roomCode });
  await host.rpc('room:start');
  const enemy = Object.values(app.getRoomSnapshot(created.roomCode).enemies)[0];
  assert.ok(enemy.transform.position.x < 2.3, 'enemy is geometrically within strike range');
  assert.equal((await host.rpc('combat:attack', { actionId: 'through-wall' })).error, 'OUT_OF_RANGE');
  assert.equal(app.getRoomSnapshot(created.roomCode).enemies[enemy.enemyId].health.current, 100);
});

test('discovery, damage authority, disconnect and token rotation', async (t) => {
  const { app, client } = await fixture(t);
  const a = await client();
  const b = await client();
  const first = await a.rpc('room:create', { displayName: 'Host' });
  await b.rpc('room:join', { displayName: 'Guest', roomCode: first.roomCode });
  await a.rpc('room:start');
  assert.equal((await a.rpc('node:interact', { nodeId: 'secret-west' })).error, 'OUT_OF_RANGE');
  assert.equal((await a.rpc('node:interact', { nodeId: 'not-real' })).error, 'NODE_NOT_FOUND');
  await a.emit('combat:damage', { playerId: first.playerId, amount: 99 });
  assert.equal(app.getRoomSnapshot(first.roomCode).players[first.playerId].health.current, 100);
  assert.equal(app.applyDamage({ roomCode: first.roomCode, playerId: first.playerId, amount: 8 }), true);
  assert.equal(app.getRoomSnapshot(first.roomCode).players[first.playerId].health.current, 92);
  const disconnected = b.waitFor('player:disconnected', (event) => event.player.playerId === first.playerId);
  a.close();
  await disconnected;
  assert.equal(app.getRoomCount(), 1);
  const replacement = await client();
  const joined = await replacement.rpc('room:rejoin', { roomCode: first.roomCode, reconnectToken: first.reconnectToken });
  assert.equal(joined.ok, true);
  assert.notEqual(joined.reconnectToken, first.reconnectToken);
  const stale = await client();
  assert.equal((await stale.rpc('room:rejoin', { roomCode: first.roomCode, reconnectToken: first.reconnectToken })).error, 'INVALID_REJOIN');
  assert.equal(app.getRoomSnapshot(first.roomCode).players[first.playerId].connection, 'CONNECTED');
});

test('six-player snapshots and static browser assets', async (t) => {
  const { app, url, client } = await fixture(t);
  const host = await client();
  const created = await host.rpc('room:create', { displayName: 'P1' });
  const players = [host];
  for (let i = 2; i <= 6; i += 1) {
    const peer = await client();
    players.push(peer);
    assert.equal((await peer.rpc('room:join', { roomCode: created.roomCode, displayName: `P${i}` })).ok, true);
  }
  const intervals = [];
  let last = null;
  const off = host.on('room:snapshot', () => { const now = performance.now(); if (last !== null) intervals.push(now - last); last = now; });
  await host.rpc('room:start');
  await new Promise((resolve) => setTimeout(resolve, 400));
  off();
  assert.equal(Object.keys(app.getRoomSnapshot(created.roomCode).players).length, 6);
  assert.ok(intervals.length >= 7, `received ${intervals.length} intervals`);
  for (const route of ['/', '/app.js', '/network.js', '/render.js', '/styles.css', '/dungeon-layout.js', '/socket.io/socket.io.js']) {
    const response = await fetch(`${url}${route}`);
    assert.equal(response.status, 200, `${route} served`);
  }
  assert.equal((await fetch(`${url}/../server/server.js`)).status, 404);
});

test('proximity revelation is room scoped and idempotent', async (t) => {
  const world = {
    bounds: { min: { x: -3, y: -2, z: -3 }, max: { x: 3, y: 5, z: 3 } },
    obstacles: [{ min: { x: -1.5, y: -1, z: -1 }, max: { x: -1.2, y: 2, z: 1 }, revealNodeId: 'secret-test' }],
    discoveryNodes: [{ id: 'secret-test', bounds: { min: { x: -0.8, y: -1, z: -1 }, max: { x: -0.4, y: 2, z: 1 } } }]
  };
  const { app, client } = await fixture(t, { world });
  const a = await client();
  const b = await client();
  const c = await client();
  const first = await a.rpc('room:create', { displayName: 'A' });
  await b.rpc('room:join', { roomCode: first.roomCode, displayName: 'B' });
  const other = await c.rpc('room:create', { displayName: 'C' });
  const otherEvents = [];
  c.on('node:discovered', (event) => otherEvents.push(event));
  await a.rpc('room:start');
  const discovered = b.waitFor('node:discovered', (event) => event.nodeId === 'secret-test');
  await a.rpc('player:input', { inputSeq: 1, moveX: -1, moveZ: 0 });
  await discovered;
  const snapshot = app.getRoomSnapshot(first.roomCode);
  assert.deepEqual(snapshot.revealedNodeIds, ['secret-test']);
  assert.equal(snapshot.players[first.playerId].metrics.nodesDiscovered, 1);
  assert.equal((await a.rpc('node:interact', { nodeId: 'secret-test' })).alreadyDiscovered, true);
  assert.deepEqual(app.getRoomSnapshot(other.roomCode).revealedNodeIds, []);
  assert.equal(otherEvents.length, 0);
});

test('disconnect grace removes a player and transfers lobby host', async (t) => {
  const { app, client } = await fixture(t, { disconnectGraceMs: 1000 });
  const host = await client();
  const peer = await client();
  const created = await host.rpc('room:create', { displayName: 'Host' });
  await peer.rpc('room:join', { roomCode: created.roomCode, displayName: 'Peer' });
  host.close();
  await peer.waitFor('player:disconnected', (event) => event.player.playerId === created.playerId);
  await peer.waitFor('player:left', (event) => event.player.playerId === created.playerId, 2500);
  assert.equal(app.getRoomCount(), 1);
  assert.equal(app.getRoomSnapshot(created.roomCode).players[created.playerId], undefined);
  const joiner = await client();
  assert.equal((await joiner.rpc('room:join', { roomCode: created.roomCode, displayName: 'New' })).ok, true);
  assert.equal((await peer.rpc('room:start')).ok, true);
});

const compactPortalWorld = {
  bounds: { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 8, z: 2 } },
  obstacles: [], discoveryNodes: []
};

test('authored vaults have distinct visible objects and matching collision counts', () => {
  const amber = authoredWorld.spaces['amber-vault'];
  const violet = authoredWorld.spaces['violet-vault'];
  assert.notDeepEqual(amber.obstacles, violet.obstacles);
  for (const [spaceId, geometry] of [['entry', authoredWorld], ['amber-vault', amber], ['violet-vault', violet]]) {
    const visibleColliders = layoutObjects.filter((object) => object.collider &&
      (object.spaceId === 'all' || object.spaceId === spaceId));
    assert.equal(geometry.obstacles.length, visibleColliders.length, `${spaceId} collider parity`);
    geometry.obstacles.forEach((box, index) => {
      const object = visibleColliders[index];
      for (const axis of ['x', 'y', 'z']) {
        assert.equal(box.min[axis], object.position[axis] - object.size[axis] / 2);
        assert.equal(box.max[axis], object.position[axis] + object.size[axis] / 2);
      }
    });
  }
});

test('portal transition replaces entry collision with destination geometry', async (t) => {
  const barrier = { min: { x: -2, y: -1, z: 0.2 }, max: { x: 2, y: 2, z: 0.5 } };
  const destination = { bounds: compactPortalWorld.bounds, obstacles: [barrier], discoveryNodes: [] };
  const world = { ...compactPortalWorld, spaces: { 'amber-vault': destination, 'violet-vault': destination } };
  const { app, client } = await fixture(t, { world });
  const host = await client();
  const peer = await client();
  const created = await host.rpc('room:create', { displayName: 'Host' });
  await peer.rpc('room:join', { roomCode: created.roomCode, displayName: 'Peer' });
  await host.rpc('room:start');
  const entered = await host.rpc('portal:enter', { actionId: 'enter-collider-vault', portalId: 'shift-gate' });
  assert.equal(entered.ok, true);
  assert.ok(['amber-vault', 'violet-vault'].includes(entered.toSpaceId));
  assert.equal((await host.rpc('player:input', { inputSeq: 1, moveX: 0, moveZ: 1 })).ok, true);
  await new Promise((resolve) => setTimeout(resolve, 400));
  const position = app.getRoomSnapshot(created.roomCode).players[created.playerId].transform.position;
  assert.ok(position.z < -0.1, `destination barrier stopped z=${position.z}`);
});

test('trap disarm is range-checked, replay-safe, and prevents warning damage', async (t) => {
  const { app, client } = await fixture(t, { world: compactPortalWorld });
  const host = await client();
  const peer = await client();
  const outsider = await client();
  const created = await host.rpc('room:create', { displayName: 'Host' });
  const joined = await peer.rpc('room:join', { roomCode: created.roomCode, displayName: 'Peer' });
  await host.rpc('room:start');
  const entered = await host.rpc('portal:enter', { actionId: 'enter-for-disarm', portalId: 'shift-gate' });
  assert.equal(entered.ok, true);
  assert.equal((await outsider.rpc('trap:disarm', { actionId: 'outside', trapId: 'vault-trap' })).error, 'NOT_IN_ROOM');
  assert.equal((await host.rpc('trap:disarm', { actionId: 'bad id!', trapId: 'vault-trap' })).error, 'INVALID_TRAP_ACTION');
  const announced = peer.waitFor('trap:disarmed');
  const disarmed = await host.rpc('trap:disarm', { actionId: 'disarm-once', trapId: 'vault-trap',
    position: { x: 999, y: 0, z: 999 } });
  assert.equal(disarmed.ok, true);
  assert.equal((await announced).playerId, created.playerId);
  assert.deepEqual(await host.rpc('trap:disarm', { actionId: 'disarm-once', trapId: 'vault-trap' }), disarmed);
  assert.equal((await peer.rpc('trap:disarm', { actionId: 'late', trapId: 'vault-trap' })).error, 'TRAP_ALREADY_CLEARED');
  let snapshot = app.getRoomSnapshot(created.roomCode);
  assert.equal(snapshot.trap.state, 'CLEARED');
  assert.equal(snapshot.trap.disarmedBy, created.playerId);
  assert.equal(snapshot.players[created.playerId].metrics.trapsDisarmed, 1);
  assert.equal(snapshot.players[joined.playerId].metrics.trapsDisarmed, 0);
  const health = snapshot.players[created.playerId].health.current;
  await host.waitFor('room:snapshot', (next) => next.tick > entered.serverTick + 45, 3000);
  snapshot = app.getRoomSnapshot(created.roomCode);
  assert.equal(snapshot.players[created.playerId].health.current, health);
  assert.equal(snapshot.trap.state, 'CLEARED');
});

test('trap disarm cannot be claimed remotely with a forged position', async (t) => {
  const world = { bounds: { min: { x: -5, y: -2, z: -5 }, max: { x: 5, y: 8, z: 5 } },
    obstacles: [], discoveryNodes: [] };
  const { app, client } = await fixture(t, { world });
  const host = await client();
  const peer = await client();
  const created = await host.rpc('room:create', { displayName: 'Host' });
  await peer.rpc('room:join', { roomCode: created.roomCode, displayName: 'Peer' });
  await host.rpc('room:start');
  await host.rpc('player:input', { inputSeq: 1, moveX: 0, moveZ: -1 });
  await host.waitFor('room:snapshot', (snapshot) =>
    snapshot.players[created.playerId].transform.position.z <= -0.4, 1000);
  await host.rpc('player:input', { inputSeq: 2, moveX: 0, moveZ: 0 });
  const entered = await host.rpc('portal:enter', { actionId: 'remote-disarm-entry', portalId: 'shift-gate' });
  assert.equal(entered.ok, true);
  assert.equal((await host.rpc('trap:disarm', { actionId: 'remote-disarm', trapId: 'vault-trap',
    position: { x: 0, y: 0, z: 1 } })).error, 'OUT_OF_RANGE');
  assert.equal(app.getRoomSnapshot(created.roomCode).players[created.playerId].metrics.trapsDisarmed, 0);
});

async function defeatSentinel(client) {
  for (let index = 0; index < 5; index += 1) {
    const result = await client.rpc('combat:attack', { actionId: `floor-strike-${index}` });
    assert.equal(result.ok, true, `strike ${index}: ${result.error}`);
    if (index < 4) await new Promise((resolve) => setTimeout(resolve, 470));
  }
}

test('server portal transition is private, atomic, replay-safe, and applies one bounded rush effect', async (t) => {
  const { app, client } = await fixture(t, { world: compactPortalWorld });
  const host = await client();
  const peer = await client();
  const outsider = await client();
  const first = await host.rpc('room:create', { displayName: 'Host' });
  const joined = await peer.rpc('room:join', { roomCode: first.roomCode, displayName: 'Peer' });
  const second = await outsider.rpc('room:create', { displayName: 'Other' });
  await host.rpc('room:start');
  const before = app.getRoomSnapshot(first.roomCode);
  assert.equal(before.space.id, 'entry');
  assert.deepEqual(before.portals.map((portal) => portal.id), ['shift-gate']);
  assert.equal(JSON.stringify(before).includes('amber-vault'), false);
  assert.equal(JSON.stringify(before).includes('violet-vault'), false);
  assert.equal((await host.rpc('portal:enter', null)).error, 'INVALID_PORTAL_ACTION');
  assert.equal((await host.rpc('portal:enter', { actionId: ['array-id'], portalId: 'shift-gate' })).error, 'INVALID_PORTAL_ACTION');
  assert.equal((await host.rpc('portal:enter', { actionId: 'bad id!', portalId: 'shift-gate' })).error, 'INVALID_PORTAL_ACTION');
  assert.equal((await host.rpc('portal:enter', { actionId: 'missing-portal' })).error, 'INVALID_PORTAL_ACTION');
  assert.equal((await host.rpc('portal:enter', { actionId: 'bad-target', portalId: 'no-such-portal' })).error, 'PORTAL_NOT_FOUND');
  const resolved = peer.waitFor('portal:resolved', (event) => event.actionId === 'early-entry');
  const firstRequest = host.rpc('portal:enter', { actionId: 'early-entry', portalId: 'shift-gate',
    destinationSpaceId: 'forged-space', bonusXp: 999999 });
  const pendingReplay = host.rpc('portal:enter', { actionId: 'early-entry', portalId: 'shift-gate' });
  const firstAck = await firstRequest;
  assert.deepEqual(await pendingReplay, firstAck);
  assert.equal(firstAck.ok, true);
  assert.equal(firstAck.penaltyTier, 1);
  assert.ok(['amber-vault', 'violet-vault'].includes(firstAck.toSpaceId));
  assert.equal((await resolved).toSpaceId, firstAck.toSpaceId);
  assert.deepEqual(await host.rpc('portal:enter', { actionId: 'early-entry', portalId: 'shift-gate' }), firstAck);
  const after = app.getRoomSnapshot(first.roomCode);
  assert.equal(after.space.id, firstAck.toSpaceId);
  assert.equal(after.players[first.playerId].statusEffects.length, 1);
  assert.equal(after.players[joined.playerId].statusEffects.length, 1);
  assert.equal(after.players[first.playerId].metrics.portalsSolved, 1);
  assert.equal(after.trap.state, 'TELEGRAPHED');
  assert.equal(after.trap.telegraphEndsAtTick - firstAck.serverTick, 45);
  assert.equal(app.getRoomSnapshot(second.roomCode).space, null);
  assert.equal((await host.rpc('portal:enter', { actionId: 'premature-exit', portalId: 'floor-exit' })).error, 'OBJECTIVES_INCOMPLETE');
});

test('portal entry rejects remote positions and cannot be claimed by an outside socket', async (t) => {
  const { app, client } = await fixture(t);
  const host = await client();
  const peer = await client();
  const outside = await client();
  const created = await host.rpc('room:create', { displayName: 'Host' });
  await peer.rpc('room:join', { roomCode: created.roomCode, displayName: 'Peer' });
  await host.rpc('room:start');
  assert.equal((await outside.rpc('portal:enter', { actionId: 'outside', portalId: 'shift-gate' })).error, 'NOT_IN_ROOM');
  assert.equal((await host.rpc('portal:enter', { actionId: 'remote', portalId: 'shift-gate',
    position: { x: 0, y: 0, z: -8 } })).error, 'OUT_OF_RANGE');
  assert.equal(app.getRoomSnapshot(created.roomCode).space.id, 'entry');
});

test('trap follows 45 authoritative ticks and floor rewards occur once, including grace disconnects', async (t) => {
  const { app, client } = await fixture(t, { world: compactPortalWorld });
  const host = await client();
  const peer = await client();
  const first = await host.rpc('room:create', { displayName: 'Host' });
  const joined = await peer.rpc('room:join', { roomCode: first.roomCode, displayName: 'Peer' });
  await host.rpc('room:start');
  const observed = new Map();
  const trapHits = [];
  const offDamage = host.on('combat:damage', (event) => {
    if (event.sourceId === 'vault-trap') trapHits.push(event);
  });
  const off = host.on('room:snapshot', (snapshot) => {
    if (snapshot.trap) observed.set(snapshot.tick, snapshot.trap.state);
  });
  const entered = await host.rpc('portal:enter', { actionId: 'rush-then-finish', portalId: 'shift-gate' });
  assert.equal(entered.ok, true);
  const standingInTrap = host.waitFor('room:snapshot', (snapshot) =>
    snapshot.space?.id !== 'entry' && snapshot.players[first.playerId].transform.position.z >= 0.2);
  await host.rpc('player:input', { inputSeq: 1, moveX: 0, moveZ: 1 });
  await standingInTrap;
  await host.rpc('player:input', { inputSeq: 2, moveX: 0, moveZ: 0 });
  await host.waitFor('room:snapshot', (snapshot) => snapshot.trap?.state === 'CLEARED', 5000);
  off();
  offDamage();
  assert.equal(observed.get(entered.serverTick + 44), 'TELEGRAPHED');
  assert.equal(observed.get(entered.serverTick + 45), 'ACTIVE');
  assert.equal(observed.get(entered.serverTick + 75), 'CLEARED');
  assert.equal(trapHits.length, 1);
  assert.equal(trapHits[0].amount, 12);
  await defeatSentinel(host);
  assert.equal(app.getRoomSnapshot(first.roomCode).floor.requiredObjectives.sentinelDefeated, true);
  peer.close();
  await host.waitFor('player:disconnected', (event) => event.player.playerId === joined.playerId);
  const completion = host.waitFor('floor:completed');
  const exit = await host.rpc('portal:enter', { actionId: 'finish-floor', portalId: 'floor-exit' });
  assert.equal(exit.ok, true);
  assert.equal(exit.completed, true);
  const awardEvent = await completion;
  const snapshot = app.getRoomSnapshot(first.roomCode);
  assert.equal(snapshot.phase, 'COMPLETED');
  assert.equal(snapshot.floor.level, 2);
  assert.equal(snapshot.floor.awards.byPlayer[first.playerId].baseXp, 100);
  assert.equal(snapshot.floor.awards.byPlayer[joined.playerId].baseXp, 100);
  assert.equal(snapshot.floor.awards.byPlayer[first.playerId].bonusXp +
    snapshot.floor.awards.byPlayer[joined.playerId].bonusXp, 60);
  assert.deepEqual(awardEvent.byPlayer, snapshot.floor.awards.byPlayer);
  assert.deepEqual(await host.rpc('portal:enter', { actionId: 'finish-floor', portalId: 'floor-exit' }), exit);
  assert.equal((await host.rpc('portal:enter', { actionId: 'second-finish', portalId: 'floor-exit' })).error, 'NOT_IN_RUNNING_ROOM');
  assert.equal(app.getRoomSnapshot(first.roomCode).players[first.playerId].xp.base, 100);
});

test('defeating the required sentinel before entry avoids the anti-rush effect', async (t) => {
  const { app, client } = await fixture(t, { world: compactPortalWorld });
  const host = await client();
  const peer = await client();
  const first = await host.rpc('room:create', { displayName: 'Host' });
  await peer.rpc('room:join', { roomCode: first.roomCode, displayName: 'Peer' });
  await host.rpc('room:start');
  await defeatSentinel(host);
  assert.equal(app.getRoomSnapshot(first.roomCode).floor.explorationBasisPoints, 5000);
  const entered = await host.rpc('portal:enter', { actionId: 'prepared-entry', portalId: 'shift-gate' });
  assert.equal(entered.ok, true);
  assert.equal(entered.penaltyTier, 0);
  assert.deepEqual(app.getRoomSnapshot(first.roomCode).players[first.playerId].statusEffects, []);
});
