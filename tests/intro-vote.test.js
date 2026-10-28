// intro-vote.test.js
// Developer: Marcus Daley
// Date: 2026-10-27
// Why: Prove the shared intro cannot be forged, reopened, or left blocking a lobby forever.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  INTRO_TIMEOUT_TICKS,
  createIntroVote,
  castIntroSkipVote,
  reconcileIntroVote,
  publicIntroVote
} = require('../server/intro-vote');

function players(...entries) {
  return new Map(entries.map(([playerId, connection]) => [playerId, {
    playerId,
    connection,
    bot: connection === 'BOT' ? { index: 0 } : null
  }]));
}

test('connected humans vote unanimously while bots and unavailable players are excluded', () => {
  const roomPlayers = players(
    ['host', 'CONNECTED'],
    ['peer', 'CONNECTED'],
    ['mock', 'BOT'],
    ['offline', 'DISCONNECTED'],
    ['gone', 'REMOVED']
  );
  const state = createIntroVote(10);

  assert.deepEqual(publicIntroVote(state, roomPlayers, 10), {
    status: 'PLAYING',
    completionReason: null,
    startedAtTick: 10,
    endsAtTick: 10 + INTRO_TIMEOUT_TICKS,
    completedAtTick: null,
    voteCount: 0,
    eligibleCount: 2
  });

  const first = castIntroSkipVote(state, roomPlayers, 'host', 11);
  assert.equal(first.ok, true);
  assert.equal(first.duplicate, false);
  assert.equal(first.completed, false);

  const duplicate = castIntroSkipVote(state, roomPlayers, 'host', 12);
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.completed, false);
  assert.equal(publicIntroVote(state, roomPlayers, 12).voteCount, 1);

  const final = castIntroSkipVote(state, roomPlayers, 'peer', 13);
  assert.equal(final.ok, true);
  assert.equal(final.completed, true);
  assert.deepEqual(publicIntroVote(state, roomPlayers, 13), {
    status: 'COMPLETE',
    completionReason: 'UNANIMOUS',
    startedAtTick: 10,
    endsAtTick: 10 + INTRO_TIMEOUT_TICKS,
    completedAtTick: 13,
    voteCount: 2,
    eligibleCount: 2
  });
});

test('disconnect removes eligibility and reconnect cannot reopen a completed intro', () => {
  const roomPlayers = players(['host', 'CONNECTED'], ['peer', 'CONNECTED']);
  const state = createIntroVote(20);
  castIntroSkipVote(state, roomPlayers, 'host', 21);

  roomPlayers.get('peer').connection = 'DISCONNECTED';
  const reconciled = reconcileIntroVote(state, roomPlayers, 22);
  assert.equal(reconciled.changed, true);
  assert.equal(reconciled.completed, true);
  assert.equal(publicIntroVote(state, roomPlayers, 22).completionReason, 'UNANIMOUS');

  roomPlayers.get('peer').connection = 'CONNECTED';
  assert.equal(reconcileIntroVote(state, roomPlayers, 23).changed, false);
  assert.deepEqual(publicIntroVote(state, roomPlayers, 23), {
    status: 'COMPLETE',
    completionReason: 'UNANIMOUS',
    startedAtTick: 20,
    endsAtTick: 20 + INTRO_TIMEOUT_TICKS,
    completedAtTick: 22,
    voteCount: 1,
    eligibleCount: 1
  });
});

test('authoritative tick timeout completes once after exactly fifty seconds', () => {
  const roomPlayers = players(['host', 'CONNECTED']);
  const state = createIntroVote(100);

  assert.equal(INTRO_TIMEOUT_TICKS, 1500);
  assert.equal(reconcileIntroVote(state, roomPlayers, state.endsAtTick - 1).changed, false);
  const timedOut = reconcileIntroVote(state, roomPlayers, state.endsAtTick);
  assert.equal(timedOut.changed, true);
  assert.equal(timedOut.completed, true);
  assert.equal(publicIntroVote(state, roomPlayers, state.endsAtTick).completionReason, 'TIMEOUT');
  assert.equal(reconcileIntroVote(state, roomPlayers, state.endsAtTick + 1).changed, false);
});

test('ineligible and malformed voters cannot change intro state', () => {
  const roomPlayers = players(['host', 'CONNECTED'], ['offline', 'DISCONNECTED'], ['mock', 'BOT']);
  const state = createIntroVote(0);

  assert.deepEqual(castIntroSkipVote(state, roomPlayers, 'offline', 1), {
    ok: false,
    error: 'INTRO_VOTE_INELIGIBLE'
  });
  assert.deepEqual(castIntroSkipVote(state, roomPlayers, 'mock', 1), {
    ok: false,
    error: 'INTRO_VOTE_INELIGIBLE'
  });
  assert.deepEqual(castIntroSkipVote(state, roomPlayers, 'missing', 1), {
    ok: false,
    error: 'INTRO_VOTE_INELIGIBLE'
  });
  assert.equal(publicIntroVote(state, roomPlayers, 1).voteCount, 0);
});
