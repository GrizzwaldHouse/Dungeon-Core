// validate-layout.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Detect drift between the client-visible dungeon manifest and server collision geometry before browser QA.

'use strict';

const layout = require('../shared/dungeon-layout');

function finiteVector(value, label, { positive = false } = {}) {
  if (!value || !['x', 'y', 'z'].every((axis) => Number.isFinite(value[axis]) &&
    (!positive || value[axis] > 0))) {
    throw new TypeError(`${label} must contain finite${positive ? ' positive' : ''} x, y, and z values`);
  }
}

function obstacleFromObject(entry) {
  return {
    min: {
      x: entry.position.x - entry.size.x / 2,
      y: entry.position.y - entry.size.y / 2,
      z: entry.position.z - entry.size.z / 2
    },
    max: {
      x: entry.position.x + entry.size.x / 2,
      y: entry.position.y + entry.size.y / 2,
      z: entry.position.z + entry.size.z / 2
    },
    revealNodeId: entry.revealNodeId || null
  };
}

function obstacleKey(obstacle, label) {
  finiteVector(obstacle?.min, `${label}.min`);
  finiteVector(obstacle?.max, `${label}.max`);
  if (['x', 'y', 'z'].some((axis) => obstacle.min[axis] > obstacle.max[axis])) {
    throw new RangeError(`${label} has inverted bounds`);
  }
  const revealNodeId = obstacle.revealNodeId ?? null;
  if (revealNodeId !== null && (typeof revealNodeId !== 'string' || !revealNodeId)) {
    throw new TypeError(`${label}.revealNodeId must be a non-empty string when present`);
  }
  return JSON.stringify([
    obstacle.min.x, obstacle.min.y, obstacle.min.z,
    obstacle.max.x, obstacle.max.y, obstacle.max.z,
    revealNodeId
  ]);
}

// Why: The renderer consumes layout.objects while the server consumes layout.world; this proves both describe the same solids.
// Input: A trusted shared-layout-shaped object before it is exposed to either runtime.
// Output: A stable parity summary, or a descriptive error before any room or renderer starts.
// Watch Out: This proves static proxy parity only; dynamic markers and real browser collision still need runtime QA.
function validateLayout(candidate) {
  if (!candidate || !Array.isArray(candidate.objects) || !candidate.world ||
    !candidate.world.spaces || typeof candidate.world.spaces !== 'object') {
    throw new TypeError('Layout must provide objects and world spaces');
  }

  const spaceIds = ['entry', ...Object.keys(candidate.world.spaces).sort()];
  const knownSpaces = new Set(['all', ...spaceIds]);
  const objectIds = new Set();
  for (const entry of candidate.objects) {
    if (!entry || typeof entry.id !== 'string' || !entry.id) throw new TypeError('Every layout object needs an ID');
    if (objectIds.has(entry.id)) throw new RangeError(`Duplicate layout object ID: ${entry.id}`);
    objectIds.add(entry.id);
    if (!knownSpaces.has(entry.spaceId)) throw new RangeError(`Unknown layout space for ${entry.id}: ${entry.spaceId}`);
    if (typeof entry.kind !== 'string' || !entry.kind) throw new TypeError(`${entry.id}.kind must be a non-empty string`);
    if (typeof entry.collider !== 'boolean') throw new TypeError(`${entry.id}.collider must be boolean`);
    finiteVector(entry.size, `${entry.id}.size`, { positive: true });
    finiteVector(entry.position, `${entry.id}.position`);
  }

  const collidersBySpace = {};
  for (const spaceId of spaceIds) {
    const geometry = spaceId === 'entry' ? candidate.world : candidate.world.spaces[spaceId];
    if (!geometry || !Array.isArray(geometry.obstacles) || !Array.isArray(geometry.discoveryNodes)) {
      throw new TypeError(`${spaceId} must provide obstacles and discovery nodes`);
    }
    const visibleColliders = candidate.objects.filter((entry) => entry.collider &&
      (entry.spaceId === 'all' || entry.spaceId === spaceId));
    const expected = visibleColliders.map((entry) => obstacleKey(obstacleFromObject(entry), `${entry.id} expected`)).sort();
    const actual = geometry.obstacles.map((obstacle, index) => obstacleKey(obstacle,
      `${spaceId}.obstacles[${index}]`)).sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      throw new RangeError(`${spaceId} obstacle parity mismatch: expected ${expected.length}, received ${actual.length}`);
    }

    const discoveryIds = new Set(geometry.discoveryNodes.map((node, index) => {
      if (!node || typeof node.id !== 'string' || !node.id) {
        throw new TypeError(`${spaceId}.discoveryNodes[${index}] needs an ID`);
      }
      finiteVector(node.bounds?.min, `${node.id}.bounds.min`);
      finiteVector(node.bounds?.max, `${node.id}.bounds.max`);
      return node.id;
    }));
    for (const entry of visibleColliders) {
      if (entry.revealNodeId && !discoveryIds.has(entry.revealNodeId)) {
        throw new RangeError(`${entry.id} references missing discovery node ${entry.revealNodeId} in ${spaceId}`);
      }
    }
    collidersBySpace[spaceId] = actual.length;
  }

  return {
    objectCount: candidate.objects.length,
    decorativeObjectIds: candidate.objects.filter((entry) => !entry.collider).map((entry) => entry.id).sort(),
    spaceIds,
    collidersBySpace
  };
}

if (require.main === module) {
  process.stdout.write(`${JSON.stringify(validateLayout(layout), null, 2)}\n`);
}

module.exports = { obstacleFromObject, validateLayout };
