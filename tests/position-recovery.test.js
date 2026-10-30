// position-recovery.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Keep an authoritative same-floor escape when a human is trapped at a boundary.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createGameServer } = require('../server/server');
const { ProbeClient } = require('./socket-client');

test('human can recover once to a safe start without resetting the running floor', async (t) => {
  const app = createGameServer({ host: '127.0.0.1', port: 0 });
  const clients = [];
  t.after(async () => { clients.forEach((client) => client.close()); await app.close(); });
  await app.listen();
  const url = `http://127.0.0.1:${app.httpServer.address().port}`;
  const host = new ProbeClient(url);
  const peer = new ProbeClient(url);
  clients.push(host, peer);
  await Promise.all([host.ready, peer.ready]);
  const created = await host.rpc('room:create', { displayName: 'Host' });
  await peer.rpc('room:join', { displayName: 'Peer', roomCode: created.roomCode });
  assert.equal((await host.rpc('player:recover-position')).error, 'NOT_IN_RUNNING_ROOM');
  assert.equal((await host.rpc('room:start')).ok, true);
  const before = app.getRoomSnapshot(created.roomCode);
  const recovered = await host.rpc('player:recover-position');
  assert.equal(recovered.ok, true);
  const after = app.getRoomSnapshot(created.roomCode);
  assert.equal(after.phase, 'RUNNING');
  assert.equal(after.floorIndex, before.floorIndex);
  assert.equal(after.currentSpaceId, before.currentSpaceId);
  assert.deepEqual(after.players[created.playerId].transform.position, { x: 0, y: 0, z: 0 });
  assert.equal((await host.rpc('player:recover-position')).error, 'RECOVERY_COOLDOWN');
});
