// combat-target.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Prove explicit airborne selection cannot bypass live state, range, or visibility.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { selectAttackTarget } = require('../server/combat-target');

test('selected Barkwing wins over nearer ground enemy without trusting altitude', () => {
  const ground = { enemyId: 'ground', health: { current: 100 }, transform: { position: { x: 0.5, y: 0, z: 0 } } };
  const wing = { enemyId: 'wing', kind: 'BARKWING', health: { current: 28 },
    transform: { position: { x: 1.8, y: 2.4, z: 0 } } };
  const room = { enemies: new Map([['ground', ground], ['wing', wing]]) };
  const player = { transform: { position: { x: 0, y: 0, z: 0 } } };
  const select = (id, visible = () => true) => selectAttackTarget(room, player, 2, visible, id);
  assert.equal(select().target, ground);
  assert.equal(select('wing').target, wing);
  assert.deepEqual(select('wing', () => false), { error: 'OUT_OF_RANGE' });
  wing.transform.position.x = 2.01;
  assert.deepEqual(select('wing'), { error: 'OUT_OF_RANGE' });
  wing.transform.position.x = 1.8;
  wing.health.current = 0;
  assert.deepEqual(select('wing'), { error: 'TARGET_UNAVAILABLE' });
  room.enemies.delete('wing');
  assert.deepEqual(select('wing'), { error: 'TARGET_UNAVAILABLE' });
  assert.deepEqual(select('other-room-enemy'), { error: 'TARGET_UNAVAILABLE' });
  assert.equal(ground.health.current, 100);
});

test('airborne selection keeps inclusive horizontal reach and never falls back past a blocked target', () => {
  const ground = { enemyId: 'ground', health: { current: 100 },
    transform: { position: { x: 0.2, y: 0, z: 0 } } };
  const wing = { enemyId: 'wing', kind: 'BARKWING', health: { current: 28 },
    transform: { position: { x: 1.2, y: 2.4, z: 1.6 } } };
  const room = { enemies: new Map([['ground', ground], ['wing', wing]]) };
  const player = { transform: { position: { x: 0, y: 0, z: 0 } } };
  assert.equal(selectAttackTarget(room, player, 2, () => true, 'wing').target, wing,
    'the server range includes its horizontal boundary despite airborne altitude');
  let visibilityChecks = 0;
  const blockedWing = (origin, position) => {
    visibilityChecks += 1;
    assert.equal(origin, player.transform.position);
    return position !== wing.transform.position;
  };
  assert.deepEqual(selectAttackTarget(room, player, 2, blockedWing, 'wing'), { error: 'OUT_OF_RANGE' });
  assert.equal(visibilityChecks, 1, 'a selected strike cannot fall back to a nearer visible enemy');
  assert.equal(selectAttackTarget(room, player, 2, blockedWing).target, ground);
  wing.transform.position.z = 1.601;
  assert.deepEqual(selectAttackTarget(room, player, 2, () => true, 'wing'), { error: 'OUT_OF_RANGE' });
  assert.equal(ground.health.current, 100);
  assert.equal(wing.health.current, 28);
});
