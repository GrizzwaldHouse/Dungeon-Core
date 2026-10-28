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
