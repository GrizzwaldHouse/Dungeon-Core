// progression-outcomes.test.js
// Developer: Marcus Daley
// Date: 2026-10-30
// Why: Protect server-owned loss state, competitive results, and the outcome-screen contract.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const { createGameServer, buildCompetitiveResults } = require('../server/server');

class FakeSocket extends EventEmitter {
  constructor(id) { super(); this.id = id; this.rooms = new Set(); }
  join(roomCode) { this.rooms.add(roomCode); }
  leave(roomCode) { this.rooms.delete(roomCode); }
  rpc(event, payload = {}) {
    return new Promise((resolve) => this.emit(event, payload, resolve));
  }
}

class FakeIO extends EventEmitter {
  constructor() { super(); this.sockets = new Map(); }
  connect(id) { const socket = new FakeSocket(id); this.sockets.set(id, socket); this.emit('connection', socket); return socket; }
  to(roomCode) { return { emit: (event, payload) => this.sockets.forEach((socket) => { if (socket.rooms.has(roomCode)) socket.emit(event, payload); }) }; }
  in(roomCode) { return { socketsLeave: () => this.sockets.forEach((socket) => socket.leave(roomCode)) }; }
  close(callback) { callback(); }
}

test('authoritative wipe exposes frozen party outcome and each downed explorer', async (t) => {
  const io = new FakeIO();
  const app = createGameServer({ io, httpServer: { listening: false } });
  t.after(async () => app.close());
  const host = io.connect('host');
  const peer = io.connect('peer');
  const created = await host.rpc('room:create', { displayName: 'Host' });
  const joined = await peer.rpc('room:join', { roomCode: created.roomCode, displayName: 'Peer' });
  assert.equal((await host.rpc('room:start')).ok, true);

  assert.equal(app.applyDamage({ roomCode: created.roomCode, playerId: created.playerId, amount: 100 }), true);
  let snapshot = app.getRoomSnapshot(created.roomCode);
  assert.equal(snapshot.phase, 'RUNNING');
  assert.deepEqual(snapshot.partyStatus.downedPlayerIds, [created.playerId]);
  assert.equal(snapshot.partyStatus.lastHumanStandingId, joined.playerId);

  assert.equal(app.applyDamage({ roomCode: created.roomCode, playerId: joined.playerId, amount: 100 }), true);
  snapshot = app.getRoomSnapshot(created.roomCode);
  assert.equal(snapshot.phase, 'FAILED');
  assert.deepEqual(snapshot.outcome, { kind: 'PARTY_WIPED', floorIndex: 1, tick: snapshot.tick });
  assert.deepEqual(new Set(snapshot.partyStatus.downedPlayerIds), new Set([created.playerId, joined.playerId]));
});

test('competitive result rows are server ranked and the phone outcome overlay has no forged continuation control', () => {
  const results = buildCompetitiveResults([
    { playerId: 'p2', displayName: 'Support', connection: 'CONNECTED', xp: { total: 500 }, inventory: { riches: 3 },
      metrics: { damageDealt: 50, enemiesDefeated: 0, portalsSolved: 1, trapsDisarmed: 1, supportActions: 3 } },
    { playerId: 'p1', displayName: 'Striker', connection: 'CONNECTED', xp: { total: 500 }, inventory: { riches: 3 },
      metrics: { damageDealt: 190, enemiesDefeated: 1, portalsSolved: 0, trapsDisarmed: 0, supportActions: 0 } }
  ]);
  assert.deepEqual(results.map((player) => [player.displayName, player.rank, player.score]), [
    ['Support', 1, 500], ['Striker', 2, 440]
  ], 'ranking follows the server score, not browser input');

  const html = fs.readFileSync(path.join(__dirname, '..', 'client', 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '..', 'client', 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'client', 'styles.css'), 'utf8');
  assert.match(html, /id="party-status"[^>]*aria-live="polite"/);
  assert.match(html, /id="expedition-results"/);
  assert.match(app, /PARTY_WIPED/);
  assert.match(app, /player\.rank/);
  assert.match(app, /phase !== 'COMPLETED' \|\| !showResults \|\| !isHost/);
  assert.match(css, /\.expedition-results \{ position: absolute; z-index: 8/);
});
