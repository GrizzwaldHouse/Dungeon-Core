// floor-three.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Prove the resource floor cannot duplicate spawns or awards during concurrent multiplayer actions.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createFloorThreeState, stepFloorThree, claimFloorThreeResource,
  enterFloorThreeRest, floorThreeComplete, publicFloorThree } = require('../server/floor-three');

function start(playerIds = ['p1', 'p2']) {
  let state = createFloorThreeState({ tick: 100, playerIds });
  const first = stepFloorThree(state, { tick: 100, activePlayerIds: playerIds });
  state = first.state;
  return { state, events: first.events };
}

function clearWave(state, tick, activePlayerIds = ['p1', 'p2']) {
  return stepFloorThree(state, { tick, activePlayerIds, defeatedMobIds: [...state.activeMobIds] });
}

test('finite waves are emitted once per tick and wait through the inter-wave break', () => {
  const first = start();
  assert.equal(first.events.filter((event) => event.type === 'MOB_SPAWN').length, 2);
  assert.equal(first.events[0].healthMultiplierBasisPoints, 10000);
  assert.equal(stepFloorThree(first.state, { tick: 100, activePlayerIds: ['p1', 'p2'] }).events.length, 0);
  const cleared = clearWave(first.state, 101);
  assert.equal(cleared.state.nextWaveAtTick, 146);
  assert.equal(cleared.events.filter((event) => event.type === 'MOB_SPAWN').length, 0);
  assert.equal(stepFloorThree(cleared.state, { tick: 145, activePlayerIds: ['p1'] }).events.length, 0);
  const second = stepFloorThree(cleared.state, { tick: 146, activePlayerIds: ['p1'], threatStacks: 3 });
  assert.equal(second.events.filter((event) => event.type === 'MOB_SPAWN').length, 3);
  assert.equal(second.events[0].healthMultiplierBasisPoints, 11500);
  assert.equal(second.events[0].damageMultiplierBasisPoints, 11500);
  assert.equal(new Set(second.state.activeMobIds).size, 3);
  const rest = clearWave(second.state, 147);
  assert.equal(rest.state.phase, 'REST_AVAILABLE');
  assert.equal(rest.events.filter((event) => event.type === 'REST_UNLOCKED').length, 1);
  assert.equal(stepFloorThree(rest.state, { tick: 200, activePlayerIds: ['p1'] }).events.length, 0);
  assert.equal(rest.state.defeatedMobIds.length, 5);
});

test('shared cache has one personal claim per eligible player and replay is stable', () => {
  const { state } = start();
  const first = claimFloorThreeResource(state, { playerId: 'p1', nodeId: 'supply-cache', actionId: 'a1' });
  assert.equal(first.result.ok, true);
  assert.deepEqual(first.result.reward, { kind: 'HEALING_CHARGE', quantity: 1 });
  assert.equal(first.events.length, 1);
  const replay = claimFloorThreeResource(first.state, { playerId: 'p1', nodeId: 'supply-cache', actionId: 'a1' });
  assert.deepEqual(replay.result, first.result);
  assert.equal(replay.events.length, 0);
  assert.equal(claimFloorThreeResource(first.state, { playerId: 'p1', nodeId: 'supply-cache', actionId: 'a2' }).result.error,
    'ALREADY_CLAIMED');
  const second = claimFloorThreeResource(first.state, { playerId: 'p2', nodeId: 'supply-cache', actionId: 'a3' });
  assert.equal(second.result.ok, true);
  assert.equal(Object.keys(second.state.claimsByNode['supply-cache']).length, 2);
  assert.equal(claimFloorThreeResource(second.state, { playerId: 'p1', nodeId: 'forgotten-cache', actionId: 'a1' }).result.error,
    'ACTION_ID_REUSED');
  assert.equal(claimFloorThreeResource(second.state, { playerId: 'outsider', nodeId: 'supply-cache', actionId: 'x' }).result.error,
    'NOT_ELIGIBLE');
});

test('optional cache requires server-reported discovery and stays private in public view', () => {
  const { state } = start();
  assert.equal(claimFloorThreeResource(state, { playerId: 'p1', nodeId: 'forgotten-cache', actionId: 'a1' }).result.error,
    'NODE_HIDDEN');
  const found = stepFloorThree(state, { tick: 101, activePlayerIds: ['p1'], discoveredNodeIds: ['forgotten-cache'] });
  const claim = claimFloorThreeResource(found.state, { playerId: 'p1', nodeId: 'forgotten-cache', actionId: 'a1' });
  assert.equal(claim.result.ok, true);
  assert.deepEqual(claim.result.reward, { kind: 'RICHES', quantity: 10 });
  assert.equal(publicFloorThree(claim.state, 'p1').resources[1].claimedByYou, true);
  assert.equal(publicFloorThree(claim.state, 'p2').resources[1].claimedByYou, false);
  assert.equal('actionReceipts' in publicFloorThree(claim.state, 'p1'), false);
  assert.equal('eligiblePlayerIds' in publicFloorThree(claim.state, 'p1'), false);
});

test('disconnect retains rights, late join gets one right, rooms remain independent', () => {
  const a = start();
  const b = start();
  const later = stepFloorThree(a.state, { tick: 101, activePlayerIds: ['p2', 'p3'] });
  assert.deepEqual(later.state.eligiblePlayerIds.sort(), ['p1', 'p2', 'p3']);
  const claim = claimFloorThreeResource(later.state, { playerId: 'p1', nodeId: 'supply-cache', actionId: 'offline-claim' });
  assert.equal(claim.result.ok, true);
  assert.equal(claimFloorThreeResource(later.state, { playerId: 'p3', nodeId: 'supply-cache', actionId: 'late' }).result.ok,
    true);
  assert.equal(Object.keys(b.state.claimsByNode['supply-cache']).length, 0);
  assert.equal(a.state.eligiblePlayerIds.includes('p3'), false);
});

test('safe rest gate cannot be entered early, repeats do not complete another floor', () => {
  const first = start();
  assert.equal(enterFloorThreeRest(first.state, { playerId: 'p1', actionId: 'r1', tick: 100 }).result.error,
    'REST_LOCKED');
  const cleared = clearWave(first.state, 101);
  const second = stepFloorThree(cleared.state, { tick: 146, activePlayerIds: ['p1'] });
  const rest = clearWave(second.state, 147);
  assert.equal(floorThreeComplete(rest.state), false);
  const entered = enterFloorThreeRest(rest.state, { playerId: 'p2', actionId: 'r2', tick: 148 });
  assert.equal(entered.result.ok, true);
  assert.equal(floorThreeComplete(entered.state), true);
  assert.equal(entered.events.length, 1);
  assert.equal(enterFloorThreeRest(entered.state, { playerId: 'p2', actionId: 'r2', tick: 149 }).events.length, 0);
  assert.equal(enterFloorThreeRest(entered.state, { playerId: 'p1', actionId: 'r3', tick: 149 }).result.error,
    'REST_ALREADY_ENTERED');
});

test('invalid state inputs cannot expand finite player or wave limits', () => {
  assert.throws(() => createFloorThreeState({ tick: 0, playerIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }), /playerIds/);
  const { state } = start();
  assert.throws(() => stepFloorThree(state, { tick: 101, activePlayerIds: ['bad id'] }), /activePlayerIds/);
  assert.throws(() => stepFloorThree(state, { tick: 101, activePlayerIds: ['p1'], threatStacks: 6 }), /threatStacks/);
  assert.equal(claimFloorThreeResource(state, { playerId: 'p1', nodeId: 'supply-cache', actionId: '!bad' }).result.error,
    'INVALID_ACTION');
});
