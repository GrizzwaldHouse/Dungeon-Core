// protocol-boundary.test.js
// Developer: Codex
// Date: 2026-10-28
// Why: Check public room capacity and hostile movement values over real Socket.IO frames.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createGameServer } = require('../server/server');
const { ProbeClient } = require('./socket-client');

test('six players can join; the seventh is refused without changing the roster', async (t) => {
  const app = createGameServer({ host: '127.0.0.1', port: 0 });
  const clients = [];
  t.after(async () => { clients.forEach((client) => client.close()); await app.close(); });
  await app.listen();
  const url = `http://127.0.0.1:${app.httpServer.address().port}`;
  for (let i = 0; i < 7; i += 1) {
    const client = new ProbeClient(url);
    clients.push(client);
    await client.ready;
  }

  const created = await clients[0].rpc('room:create', { displayName: 'Host' });
  assert.equal(created.ok, true);
  for (let i = 1; i < 6; i += 1) {
    assert.equal((await clients[i].rpc('room:join', {
      roomCode: created.roomCode, displayName: `Player ${i}`
    })).ok, true);
  }
  assert.deepEqual(await clients[6].rpc('room:join', {
    roomCode: created.roomCode, displayName: 'Seventh'
  }), { ok: false, error: 'ROOM_FULL' });
  assert.equal(Object.keys(app.getRoomSnapshot(created.roomCode).players).length, 6);

  assert.equal((await clients[0].rpc('room:start')).ok, true);
  for (const [index, input] of [
    { inputSeq: 1, moveX: Number.NaN, moveZ: 0 },
    { inputSeq: 1, moveX: Number.POSITIVE_INFINITY, moveZ: 0 },
    { inputSeq: 1, moveX: 0, moveZ: Number.NEGATIVE_INFINITY },
    { inputSeq: 1, moveX: '1', moveZ: 0 },
    { inputSeq: 1.5, moveX: 1, moveZ: 0 }
  ].entries()) {
    assert.equal((await clients[0].rpc('player:input', input)).error, 'INVALID_INPUT', `case ${index}`);
  }
  assert.equal((await clients[0].rpc('player:input', { inputSeq: 1, moveX: 0, moveZ: 0 })).ok, true);
  assert.equal((await clients[0].rpc('player:input', { inputSeq: 1, moveX: 0, moveZ: 0 })).error, 'STALE_INPUT');
});
