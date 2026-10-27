// deepwood.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Prove the Deepwood health gates, airborne minions, warnings, and disconnect safety without a browser clock.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { BOSS_ID, MAX_LIVE_MINIONS, startDeepwood, stepDeepwood,
  deepwoodComplete, deepwoodWarnings } = require('../server/deepwood');

function room() {
  const player = { playerId: 'explorer', connection: 'CONNECTED',
    transform: { position: { x: 0, y: 0, z: -7 } },
    health: { current: 100, max: 100 }, statusEffects: [] };
  return { phase: 'RUNNING', tick: 0, revision: 0, run: { threatStacks: 0 },
    world: { bounds: { min: { x: -12, z: -12 }, max: { x: 12, z: 12 } } },
    obstacles: [], revealedNodeIds: new Set(), players: new Map([[player.playerId, player]]),
    enemies: new Map() };
}

test('Deepwood health gates summon bounded airborne minions only once', () => {
  const state = room();
  assert.equal(startDeepwood(state, 0).length, 1);
  assert.deepEqual(startDeepwood(state, 0), []);
  const boss = state.enemies.get(BOSS_ID);
  assert.equal(boss.kind, 'DEEPWOOD_SENTINEL');
  boss.health.current = Math.floor(boss.health.max * 0.7);
  const first = stepDeepwood(state, 1);
  assert.ok(first.some((event) => event.type === 'deepwood:phase' && event.stage === 'PHASE_TWO'));
  assert.equal([...state.enemies.values()].filter((enemy) => enemy.kind === 'BARKWING').length, 2);
  assert.ok([...state.enemies.values()].filter((enemy) => enemy.kind === 'BARKWING')
    .every((enemy) => enemy.transform.position.y > 1));
  assert.deepEqual(stepDeepwood(state, 1), []);
  boss.health.current = Math.floor(boss.health.max * 0.35);
  const second = stepDeepwood(state, 2);
  assert.ok(second.some((event) => event.type === 'deepwood:phase' && event.stage === 'PHASE_THREE'));
  assert.ok([...state.enemies.values()].filter((enemy) => enemy.kind === 'ROOTLING').length >= 1);
  assert.ok([...state.enemies.values()].filter((enemy) => enemy.health.current > 0).length <= MAX_LIVE_MINIONS + 1);
});

test('Deepwood root warning resolves once and cannot damage a disconnected explorer', () => {
  const state = room();
  startDeepwood(state, 0);
  const player = state.players.get('explorer');
  const warning = stepDeepwood(state, 45);
  assert.equal(warning.filter((event) => event.type === 'deepwood:warning').length, 1);
  assert.equal(deepwoodWarnings(state).length, 1);
  assert.equal(player.health.current, 100);
  player.connection = 'DISCONNECTED';
  assert.equal(stepDeepwood(state, 90).filter((event) => event.type === 'deepwood:damage').length, 0);
  assert.equal(player.health.current, 100);
  player.connection = 'CONNECTED';
  assert.deepEqual(stepDeepwood(state, 90), []);
  state.enemies.get(BOSS_ID).health.current = 0;
  assert.ok(stepDeepwood(state, 91).some((event) => event.type === 'deepwood:clear'));
  assert.equal(deepwoodComplete(state), true);
  assert.deepEqual(stepDeepwood(state, 92), []);
});

test('Deepwood telegraph applies bounded damage and a timed root at the announced tick', () => {
  const state = room();
  startDeepwood(state, 0);
  const player = state.players.get('explorer');
  assert.ok(stepDeepwood(state, 45).some((event) => event.type === 'deepwood:warning'));
  assert.equal(stepDeepwood(state, 89).filter((event) => event.type === 'deepwood:damage').length, 0);
  const damage = stepDeepwood(state, 90).filter((event) => event.type === 'deepwood:damage');
  assert.equal(damage.length, 1);
  assert.equal(damage[0].amount, 12);
  assert.equal(player.health.current, 88);
  assert.deepEqual(player.statusEffects, [{ kind: 'ROOT', sourceId: BOSS_ID, expiresAtTick: 120 }]);
  assert.deepEqual(stepDeepwood(state, 90), []);
});
