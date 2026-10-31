// bot-navigation.test.js
// Developer: Marcus Daley
// Date: 2026-10-31
// Why: Prevent mock teammates from grazing pillars or requiring a single-corner route through blocked space.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { nextBotWaypoint } = require('../server/bot-navigation');

const box = (minX, maxX, minZ, maxZ, extra = {}) => ({
  min: { x: minX, y: -1, z: minZ }, max: { x: maxX, y: 2, z: maxZ }, ...extra
});
const room = (obstacles = []) => ({ obstacles, revealedNodeIds: new Set(),
  world: { bounds: { min: { x: -10, z: -10 }, max: { x: 10, z: 10 } } } });

test('generic pillar route reaches the target through at least two collision-clear corners', () => {
  const arena = room([box(-1, 1, -2, 2)]);
  const target = { x: 4, z: 0 };
  let position = { x: -4, z: 0 };
  const waypoints = [];
  for (let hop = 0; hop < 8; hop += 1) {
    const next = nextBotWaypoint(arena, position, target, 0.5);
    assert.ok(next, 'a route exists around this generic pillar');
    for (let step = 0; step <= 100; step += 1) {
      const x = position.x + (next.x - position.x) * step / 100;
      const z = position.z + (next.z - position.z) * step / 100;
      const dx = Math.max(-1 - x, 0, x - 1);
      const dz = Math.max(-2 - z, 0, z - 2);
      assert.ok(Math.hypot(dx, dz) >= 0.5, 'every sampled path position clears the actual pillar');
    }
    waypoints.push(next);
    position = next;
    if (next.x === target.x && next.z === target.z) break;
  }
  assert.deepEqual(position, target);
  assert.ok(waypoints.length >= 3, 'route needs two corners before its final leg');
  assert.ok(Math.abs(waypoints[0].z) > 2.5, 'clearance includes the body radius');
});

test('body clearance rejects the tempting centerline grazing an obstacle', () => {
  const target = { x: 4, z: 2.2 };
  const next = nextBotWaypoint(room([box(-1, 1, -2, 2)]), { x: -4, z: 2.2 }, target, 0.5);
  assert.ok(next);
  assert.notDeepEqual(next, target);
  assert.ok(next.z > 2.5);
});

test('repeated calls are deterministic and do not mutate caller vectors', () => {
  const arena = room([box(-1, 1, -2, 2)]);
  const from = Object.freeze({ x: -4, y: 0, z: 0 });
  const target = Object.freeze({ x: 4, y: 0, z: 0 });
  assert.deepEqual(nextBotWaypoint(arena, from, target, .5), nextBotWaypoint(arena, from, target, .5));
});

test('revealed walls are ignored consistently by direct and corner paths', () => {
  const wall = box(-2, 2, -9.8, 9.8, { revealNodeId: 'secret' });
  const arena = room([wall]);
  const from = { x: -4, z: 0 }, target = { x: 4, z: 0 };
  assert.equal(nextBotWaypoint(arena, from, target, .5), null);
  arena.revealedNodeIds.add('secret');
  assert.deepEqual(nextBotWaypoint(arena, from, target, .5), target);
});

test('bounds and unreachable targets return null instead of movement into a wall', () => {
  assert.equal(nextBotWaypoint(room([box(-2, 2, -10, 10)]), { x: -4, z: 0 }, { x: 4, z: 0 }, .5), null);
  assert.equal(nextBotWaypoint(room(), { x: 0, z: 0 }, { x: 9.8, z: 0 }, .5), null);
  assert.equal(nextBotWaypoint(room([box(-1, 1, -1, 1)]), { x: -4, z: 0 }, { x: 0, z: 0 }, .5), null);
});

test('obstacles outside the player collision height do not block ground travel', () => {
  const overhead = box(-2, 2, -2, 2);
  overhead.min.y = 5;
  overhead.max.y = 6;
  const target = { x: 4, z: 0 };
  assert.deepEqual(nextBotWaypoint(room([overhead]), { x: -4, y: 0, z: 0 }, target, .5), target);
});

test('invalid arguments and oversized obstructed geometry fail stationary', () => {
  const arena = room([box(-1, 1, -2, 2)]);
  assert.equal(nextBotWaypoint(arena, { x: NaN, z: 0 }, { x: 4, z: 0 }, .5), null);
  assert.equal(nextBotWaypoint(arena, { x: -4, z: 0 }, { x: 4, z: 0 }, -1), null);
  assert.equal(nextBotWaypoint(room(Array.from({ length: 65 }, () => box(-1, 1, -2, 2))), { x: -4, z: 0 }, { x: 4, z: 0 }, .5), null);
});
