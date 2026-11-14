// Verify the server-owned floor award calculation without a network fixture.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateAwards } = require('../server/dungeon-run');

function player(playerId, connection, metrics, xp = { base: 0, bonus: 0, total: 0 }) {
  return { playerId, connection, metrics: {
    damageDealt: 0, portalsSolved: 0, trapsDisarmed: 0, supportActions: 0, ...metrics
  }, xp: { ...xp } };
}

function room(players, metricBaselines = {}) {
  return { players: new Map(players.map((entry) => [entry.playerId, entry])),
    run: { runId: 'award-test-run', floorIndex: 2, metricBaselines } };
}

test('equal contributions divide the fixed bonus pool and preserve equal base XP', () => {
  const members = ['alpha', 'bravo', 'charlie'].map((id) => player(id, 'CONNECTED', { portalsSolved: 1 }));
  const result = calculateAwards(room(members));
  assert.equal(result.floorIndex, 2);
  assert.equal(result.baseXp, 100);
  assert.equal(result.bonusPoolXp, 60);
  for (const member of members) {
    assert.deepEqual(result.byPlayer[member.playerId], {
      awardId: `award-test-run:2:${member.playerId}`, baseXp: 100, bonusXp: 20, totalXp: 120
    });
    assert.deepEqual(member.xp, { base: 100, bonus: 20, total: 120 });
  }
});

test('disconnected grace members receive awards; bots and removed members do not', () => {
  const active = player('active', 'CONNECTED', { portalsSolved: 2 });
  const grace = player('grace', 'DISCONNECTED', { portalsSolved: 1 });
  const bot = player('bot', 'BOT', { portalsSolved: 20 });
  const removed = player('removed', 'REMOVED', { portalsSolved: 20 });
  const result = calculateAwards(room([removed, bot, grace, active]));
  assert.deepEqual(Object.keys(result.byPlayer).sort(), ['active', 'grace']);
  assert.equal(result.byPlayer.active.bonusXp, 40);
  assert.equal(result.byPlayer.grace.bonusXp, 20);
  assert.equal(result.byPlayer.active.bonusXp + result.byPlayer.grace.bonusXp, 60);
  assert.deepEqual(bot.xp, { base: 0, bonus: 0, total: 0 });
  assert.deepEqual(removed.xp, { base: 0, bonus: 0, total: 0 });
});

test('prior-floor metrics are excluded and a late member starts at the shared base', () => {
  const veteran = player('veteran', 'CONNECTED', { portalsSolved: 5 },
    { base: 100, bonus: 30, total: 130 });
  const late = player('late', 'CONNECTED', { portalsSolved: 0 });
  const result = calculateAwards(room([veteran, late], { veteran: { portalsSolved: 5 } }));
  assert.equal(result.byPlayer.veteran.bonusXp, 0);
  assert.equal(result.byPlayer.late.bonusXp, 0);
  assert.equal(result.byPlayer.veteran.totalXp, 230);
  assert.equal(result.byPlayer.late.totalXp, 100);
  assert.equal(veteran.xp.base, 200);
  assert.equal(late.xp.base, 100);
});
