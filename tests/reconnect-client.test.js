// reconnect-client.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Keep temporary transport loss from granting stale client controls or discarding a recoverable room session.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'client', 'network.js'), 'utf8')
  .replace('export class GameNetwork', 'class GameNetwork');
const context = { EventTarget: class {}, window: {}, crypto: {} };
vm.runInNewContext(`${source}\nthis.GameNetwork = GameNetwork;`, context);

function harness(call) {
  const handlers = new Map();
  const events = [];
  const state = {
    socket: { connected: true, on(name, handler) { handlers.set(name, handler); } },
    session: { roomCode: 'AB2C', playerId: 'player', reconnectToken: 'saved-capability' },
    latestSnapshot: { phase: 'RUNNING' },
    roomConfirmed: true,
    rejoining: false,
    call,
    emitChange(type, detail) { events.push({ type, detail }); },
    acceptSession(result) { this.latestSnapshot = result.snapshot; this.roomConfirmed = true; },
    clearSession() { this.session = null; this.latestSnapshot = null; this.roomConfirmed = false; }
  };
  context.GameNetwork.prototype.bindEvents.call(state);
  return { handlers, events, state };
}

test('a connected transport cannot use a stale running snapshot before rejoin acknowledgement', async () => {
  let accept;
  const { handlers, events, state } = harness(() => new Promise((resolve) => { accept = resolve; }));
  const rejoining = handlers.get('connect')();
  assert.equal(state.latestSnapshot, null);
  assert.equal(state.roomConfirmed, false);
  assert.equal(state.rejoining, true);
  assert.deepEqual(events.filter((event) => event.type === 'connection').map((event) => event.detail.connected), [false]);
  context.GameNetwork.prototype.acceptSnapshot.call(state, {
    protocolVersion: 1, roomCode: 'AB2C', tick: 1, revision: 1, players: {}
  });
  assert.equal(state.latestSnapshot, null, 'a snapshot before confirmed rejoin cannot resume play');
  context.GameNetwork.prototype.sendInput.call(state, 1, 0, 0);
  accept({ snapshot: { phase: 'RUNNING' } });
  await rejoining;
  assert.equal(state.roomConfirmed, true);
  assert.equal(state.latestSnapshot.phase, 'RUNNING');
  assert.deepEqual(events.filter((event) => event.type === 'connection').map((event) => event.detail.connected),
    [false, true]);
  handlers.get('disconnect')('transport close');
  assert.equal(state.roomConfirmed, false);
  assert.equal(state.latestSnapshot, null);
});

test('a transient rejoin timeout retains the saved session but never restores stale play', async () => {
  const { handlers, events, state } = harness(async () => { throw new Error('Server did not respond in time'); });
  await handlers.get('connect')();
  assert.equal(state.session.roomCode, 'AB2C');
  assert.equal(state.latestSnapshot, null);
  assert.equal(state.roomConfirmed, false);
  assert.equal(state.rejoining, false);
  assert.equal(events.some((event) => event.type === 'connection' && event.detail.connected === true), false);
  assert.match(events.find((event) => event.type === 'error').detail, /saved room is retained/);
});

test('a definitive expired rejoin clears the unusable session', async () => {
  const { handlers, events, state } = harness(async () => { throw new Error('INVALID_REJOIN'); });
  await handlers.get('connect')();
  assert.equal(state.session, null);
  assert.equal(state.latestSnapshot, null);
  assert.equal(state.roomConfirmed, false);
  assert.match(events.find((event) => event.type === 'error').detail, /Session expired/);
});
