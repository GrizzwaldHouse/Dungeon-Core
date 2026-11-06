// party-size-matrix.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Detect room leakage and roster corruption when small, medium, and full human parties coexist.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { setTimeout: delay } = require('node:timers/promises');
const { createGameServer } = require('../server/server');
const { ProbeClient } = require('./socket-client');

test('two, four, and six human parties run in separate rooms without cross-room snapshots', async (t) => {
  const app = createGameServer({ host: '127.0.0.1', port: 0 });
  const clients = [];
  t.after(async () => { clients.forEach((client) => client.close()); await app.close(); });
  await app.listen();
  const url = `http://127.0.0.1:${app.httpServer.address().port}`;
  async function connect() {
    const client = new ProbeClient(url);
    clients.push(client);
    await client.ready;
    return client;
  }

  const parties = [];
  for (const size of [2, 4, 6]) {
    const host = await connect();
    const created = await host.rpc('room:create', { displayName: `Party ${size} host` });
    assert.equal(created.ok, true);
    const members = [{ socket: host, playerId: created.playerId }];
    for (let index = 1; index < size; index += 1) {
      const socket = await connect();
      const joined = await socket.rpc('room:join', {
        displayName: `Party ${size} explorer ${index}`, roomCode: created.roomCode
      });
      assert.equal(joined.ok, true);
      members.push({ socket, playerId: joined.playerId });
    }
    parties.push({ size, code: created.roomCode, members });
  }

  assert.equal(new Set(parties.map((party) => party.code)).size, 3);
  const outsider = await connect();
  assert.equal((await outsider.rpc('room:join', {
    displayName: 'Seventh explorer', roomCode: parties[2].code
  })).error, 'ROOM_FULL');
  const observed = parties.flatMap((party) => party.members.map(({ socket }) => {
    const codes = new Set();
    socket.on('room:snapshot', (snapshot) => codes.add(snapshot.roomCode));
    return { expected: party.code, codes };
  }));
  for (const party of parties) {
    assert.equal((await party.members[0].socket.rpc('room:start')).ok, true);
    assert.equal(Object.keys(app.getRoomSnapshot(party.code).players).length, party.size);
    assert.equal(app.getRoomSnapshot(party.code).phase, 'RUNNING');
  }

  for (const party of parties) {
    assert.equal((await party.members[0].socket.rpc('player:input', {
      inputSeq: 1, moveX: 0, moveZ: 1
    })).ok, true);
  }
  await delay(170);
  for (const party of parties) {
    const state = app.getRoomSnapshot(party.code);
    assert.ok(state.players[party.members[0].playerId].transform.position.z > 0);
    assert.equal(Object.keys(state.players).length, party.size);
  }
  assert.ok(observed.every(({ expected, codes }) => codes.size === 1 && codes.has(expected)),
    'each socket receives snapshots only for its own room');

  assert.equal(Object.keys(app.getRoomSnapshot(parties[2].code).players).length, 6);
  assert.equal(Object.keys(app.getRoomSnapshot(parties[0].code).players).length, 2);
});
