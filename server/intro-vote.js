// intro-vote.js
// Developer: Marcus Daley
// Date: 2026-10-27
// Why: Keep the shared opening bounded and party-owned without trusting client clocks or voter lists.

'use strict';

const { TICK_HZ } = require('./config/game-parameters');

const INTRO_TIMEOUT_SECONDS = 50;
const INTRO_TIMEOUT_TICKS = TICK_HZ * INTRO_TIMEOUT_SECONDS;

function eligiblePlayerIds(players) {
  if (!(players instanceof Map)) throw new TypeError('Intro voters must be a player Map');
  return [...players.values()]
    .filter((player) => player && player.connection === 'CONNECTED' && !player.bot &&
      typeof player.playerId === 'string')
    .map((player) => player.playerId)
    .sort();
}

function counts(state, players) {
  const eligible = eligiblePlayerIds(players);
  return {
    eligibleCount: eligible.length,
    voteCount: eligible.filter((playerId) => state.votes.has(playerId)).length,
    eligible
  };
}

function createIntroVote(startedAtTick) {
  if (!Number.isSafeInteger(startedAtTick) || startedAtTick < 0) {
    throw new RangeError('Intro start tick must be a nonnegative integer');
  }
  return {
    status: 'PLAYING',
    completionReason: null,
    startedAtTick,
    endsAtTick: startedAtTick + INTRO_TIMEOUT_TICKS,
    completedAtTick: null,
    votes: new Set(),
    finalVoteCount: null,
    finalEligibleCount: null
  };
}

function completeIntroVote(state, players, tick, reason) {
  if (state.status === 'COMPLETE') return { changed: false, completed: true };
  if (!Number.isSafeInteger(tick) || tick < state.startedAtTick) {
    throw new RangeError('Intro completion tick is invalid');
  }
  if (!['UNANIMOUS', 'TIMEOUT', 'ROOM_STARTED'].includes(reason)) {
    throw new RangeError('Intro completion reason is invalid');
  }
  const current = counts(state, players);
  state.status = 'COMPLETE';
  state.completionReason = reason;
  state.completedAtTick = tick;
  state.finalVoteCount = current.voteCount;
  state.finalEligibleCount = current.eligibleCount;
  return { changed: true, completed: true };
}

// Why: Eligibility can change on disconnect or leave, while completion must remain one-way.
// Input: Trusted room players and the room's authoritative tick.
// Output: Whether public intro state changed during this reconciliation.
function reconcileIntroVote(state, players, tick) {
  if (state.status === 'COMPLETE') return { changed: false, completed: true };
  if (!Number.isSafeInteger(tick) || tick < state.startedAtTick) {
    throw new RangeError('Intro reconciliation tick is invalid');
  }
  if (tick >= state.endsAtTick) return completeIntroVote(state, players, tick, 'TIMEOUT');
  const current = counts(state, players);
  if (current.eligibleCount > 0 && current.voteCount === current.eligibleCount) {
    return completeIntroVote(state, players, tick, 'UNANIMOUS');
  }
  return { changed: false, completed: false };
}

// Why: A socket may request a skip, but only its bound connected human identity counts.
// Input: Private intro state, trusted room players, socket-bound player ID, and authoritative tick.
// Output: An idempotent vote result without exposing voter identities.
function castIntroSkipVote(state, players, playerId, tick) {
  if (state.status === 'COMPLETE') {
    return { ok: true, duplicate: state.votes.has(playerId), completed: true,
      alreadyComplete: true, changed: false };
  }
  const eligible = eligiblePlayerIds(players);
  if (!eligible.includes(playerId)) return { ok: false, error: 'INTRO_VOTE_INELIGIBLE' };
  const duplicate = state.votes.has(playerId);
  if (!duplicate) state.votes.add(playerId);
  const reconciled = reconcileIntroVote(state, players, tick);
  return { ok: true, duplicate, completed: reconciled.completed,
    alreadyComplete: false, changed: !duplicate || reconciled.changed };
}

function publicIntroVote(state, players) {
  const current = state.status === 'COMPLETE'
    ? { voteCount: state.finalVoteCount, eligibleCount: state.finalEligibleCount }
    : counts(state, players);
  return {
    status: state.status,
    completionReason: state.completionReason,
    startedAtTick: state.startedAtTick,
    endsAtTick: state.endsAtTick,
    completedAtTick: state.completedAtTick,
    voteCount: current.voteCount,
    eligibleCount: current.eligibleCount
  };
}

module.exports = {
  INTRO_TIMEOUT_SECONDS,
  INTRO_TIMEOUT_TICKS,
  createIntroVote,
  completeIntroVote,
  castIntroSkipVote,
  reconcileIntroVote,
  publicIntroVote
};
