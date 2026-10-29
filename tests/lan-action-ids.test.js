// lan-action-ids.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Keep phone actions working over local HTTP where randomUUID is absent.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

test('LAN HTTP clients generate distinct valid action IDs for votes, combat, and portals', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'client', 'network.js'), 'utf8')
    .replace('export class GameNetwork', 'class GameNetwork');
  const lanCrypto = { getRandomValues: crypto.webcrypto.getRandomValues.bind(crypto.webcrypto) };
  const context = { EventTarget, crypto: lanCrypto };
  vm.runInNewContext(`${source}\nthis.GameNetwork = GameNetwork;`, context);
  const calls = [];
  const state = {
    session: { playerId: 'phone' },
    socket: { connected: true },
    latestSnapshot: { phase: 'LOBBY', intro: { status: 'PLAYING' } },
    call(event, payload) { calls.push({ event, payload }); return Promise.resolve({ ok: true }); }
  };

  await context.GameNetwork.prototype.voteToSkipIntro.call(state);
  state.latestSnapshot = { phase: 'RUNNING', portals: [{ id: 'entry-exit', state: 'AVAILABLE' }] };
  await context.GameNetwork.prototype.attack.call(state);
  await context.GameNetwork.prototype.attack.call(state, 'barkwing-2');
  await context.GameNetwork.prototype.enterPortal.call(state, 'entry-exit');

  assert.deepEqual(calls.map(({ event }) => event),
    ['intro:skip-vote', 'combat:attack', 'combat:attack', 'portal:enter']);
  assert.equal(calls[2].payload.targetEnemyId, 'barkwing-2');
  assert.equal(calls[3].payload.portalId, 'entry-exit');
  const ids = calls.map(({ payload }) => payload.actionId);
  assert.equal(new Set(ids).size, ids.length);
  ids.forEach((id) => assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/));
});
