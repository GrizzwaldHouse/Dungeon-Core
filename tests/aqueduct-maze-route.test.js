'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { join } = require('node:path');
const { route, canOccupy, pathExists, validateAqueductRoute } = require('../shared/aqueduct-maze-route');

test('candidate geometry loads in a browser script without a bundler', () => {
  const context = {};
  runInNewContext(readFileSync(join(__dirname, '../shared/aqueduct-maze-route.js'), 'utf8'), context);
  assert.equal(context.DungeonAqueductMazeRoute.validateAqueductRoute().refugeCapacity, 6);
});

test('authored route gives six players two clear approaches, six safe refuges, and a cache escape', () => {
  assert.deepEqual(validateAqueductRoute(), {
    roomCount: 3,
    approachCount: 2,
    arrivalCapacity: 6,
    refugeCapacity: 6,
    cacheReachable: true,
    sweptLaneClear: true
  });
  const { approach, launcher } = route.rooms;
  assert.equal(canOccupy(approach, { x: 0, z: 0 }, route.playerRadius), false);
  assert.equal(pathExists(launcher, launcher.markers.cache, launcher.markers.exit,
    route.playerRadius), true);
});

test('validation rejects a solid crossing the full boulder envelope', () => {
  const blocked = structuredClone(route);
  blocked.rooms.launcher.obstacles.push({ min: { x: 0, z: -0.25 }, max: { x: 1, z: 0.25 } });
  assert.throws(() => validateAqueductRoute(blocked), /launcher lane intersects a solid/);
});

test('validation rejects a sealed cache or insufficient party refuge capacity', () => {
  const sealed = structuredClone(route);
  sealed.rooms.launcher.obstacles.push({ min: { x: -16, z: -10 }, max: { x: -12, z: -6 } });
  assert.throws(() => validateAqueductRoute(sealed), /launcher.cache is blocked/);

  const crowded = structuredClone(route);
  crowded.rooms.launcher.refuges.pop();
  assert.throws(() => validateAqueductRoute(crowded), /fewer than six refuge positions/);

  const narrow = structuredClone(route);
  narrow.rooms.launcher.refuges[0].pocket.max.x -= 0.5;
  assert.throws(() => validateAqueductRoute(narrow), /smaller than four metres/);
});

test('validation rejects a closed branch and changed room bounds', () => {
  const closed = structuredClone(route);
  closed.rooms.approach.obstacles.push({ min: { x: -20, z: 5.5 }, max: { x: -2, z: 6.5 } });
  assert.throws(() => validateAqueductRoute(closed), /westBranch route is blocked/);

  const enlarged = structuredClone(route);
  enlarged.rooms.encounter.bounds.max.z = 30;
  assert.throws(() => validateAqueductRoute(enlarged), /changes existing room bounds/);
});
