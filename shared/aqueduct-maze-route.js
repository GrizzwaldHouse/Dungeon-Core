// Proposed Floor Two route geometry. Runtime integration follows the MAZE-01 review.
(function registerAqueductMazeRoute(root, factory) {
  const candidate = factory();
  if (typeof module === 'object' && module.exports) module.exports = candidate;
  root.DungeonAqueductMazeRoute = candidate;
})(typeof globalThis === 'object' ? globalThis : this, () => {
'use strict';

const point = (x, z) => ({ x, z });
const box = (minX, minZ, maxX, maxZ) => ({ min: point(minX, minZ), max: point(maxX, maxZ) });
const bounds = box(-20, -20, 20, 20);

const route = {
  playerRadius: 0.35,
  boulderRadius: 1.25,
  rooms: {
    approach: {
      bounds,
      obstacles: [box(-2, -7, 2, 5)],
      markers: {
        arrival: point(0, 14), observation: point(0, 9),
        westBranch: point(-8, 0), eastBranch: point(8, 0),
        regroup: point(0, -12), exit: point(0, -17)
      },
      arrivalSlots: [-5, -3, -1, 1, 3, 5].map((x) => point(x, 14))
    },
    launcher: {
      bounds,
      obstacles: [
        box(-18, -2, -16.6, 2), // Stone mouth outside the full swept lane.
        box(16.6, -2, 18, 2), // Catch basin outside the full swept lane.
        box(-1.5, 5.5, 1.5, 8.5) // Divides the two approaches.
      ],
      markers: {
        entry: point(0, 17), westApproach: point(-9, 5), eastApproach: point(9, 5),
        cache: point(-14, -8), regroup: point(0, -11), exit: point(0, -17)
      },
      lane: { from: point(-15, 0), to: point(15, 0), radius: 1.25 },
      cacheAlcove: box(-16, -10, -12, -6),
      refuges: [-15, -10, -5, 5, 10, 15].map((x, index) => ({
        id: `refuge-${index + 1}`,
        center: point(x, 4),
        pocket: box(x - 2, 2, x + 2, 6)
      }))
    },
    encounter: {
      bounds,
      obstacles: [],
      markers: {
        entry: point(0, 17), fight: point(0, 5), recovery: point(0, -8), exit: point(0, -17)
      }
    }
  },
  transitions: [
    { from: 'approach.exit', to: 'launcher.entry' },
    { from: 'launcher.exit', to: 'encounter.entry' }
  ]
};

function freezeTree(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeTree(child);
    Object.freeze(value);
  }
  return value;
}
freezeTree(route);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function intersectsExpandedBox(position, radius, obstacle) {
  const x = Math.max(obstacle.min.x, Math.min(position.x, obstacle.max.x));
  const z = Math.max(obstacle.min.z, Math.min(position.z, obstacle.max.z));
  return (position.x - x) ** 2 + (position.z - z) ** 2 < radius ** 2;
}

function canOccupy(room, position, radius) {
  const { min, max } = room.bounds;
  return position.x >= min.x + radius && position.x <= max.x - radius &&
    position.z >= min.z + radius && position.z <= max.z - radius &&
    room.obstacles.every((obstacle) => !intersectsExpandedBox(position, radius, obstacle));
}

// A half-metre grid gives deterministic evidence that each authored route has player-radius clearance.
function pathExists(room, start, goal, radius, allowed = () => true) {
  const step = 0.5;
  const index = (position) => [Math.round((position.x - room.bounds.min.x) / step),
    Math.round((position.z - room.bounds.min.z) / step)];
  const [startX, startZ] = index(start);
  const [goalX, goalZ] = index(goal);
  const position = (x, z) => point(room.bounds.min.x + x * step, room.bounds.min.z + z * step);
  if (!canOccupy(room, start, radius) || !canOccupy(room, goal, radius)) return false;
  const queue = [[startX, startZ]];
  const visited = new Set([`${startX},${startZ}`]);
  for (let head = 0; head < queue.length; head += 1) {
    const [x, z] = queue[head];
    if (x === goalX && z === goalZ) return true;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nextX = x + dx;
      const nextZ = z + dz;
      const key = `${nextX},${nextZ}`;
      if (visited.has(key)) continue;
      const candidate = position(nextX, nextZ);
      if (!allowed(candidate) || !canOccupy(room, candidate, radius)) continue;
      visited.add(key);
      queue.push([nextX, nextZ]);
    }
  }
  return false;
}

function laneClear(lane, obstacle) {
  const minX = Math.min(lane.from.x, lane.to.x) - lane.radius;
  const maxX = Math.max(lane.from.x, lane.to.x) + lane.radius;
  const minZ = lane.from.z - lane.radius;
  const maxZ = lane.from.z + lane.radius;
  return obstacle.max.x <= minX || obstacle.min.x >= maxX ||
    obstacle.max.z <= minZ || obstacle.min.z >= maxZ;
}

function boxesOverlap(first, second) {
  return first.min.x < second.max.x && first.max.x > second.min.x &&
    first.min.z < second.max.z && first.max.z > second.min.z;
}

function validateAqueductRoute(candidate = route) {
  const radius = candidate.playerRadius;
  const { approach, launcher, encounter } = candidate.rooms;
  assert(radius > 0 && candidate.boulderRadius > 0, 'invalid collision radii');
  for (const [roomId, room] of Object.entries(candidate.rooms)) {
    assert(room.bounds.max.x - room.bounds.min.x === 40 &&
      room.bounds.max.z - room.bounds.min.z === 40, `${roomId} changes existing room bounds`);
    for (const [name, marker] of Object.entries(room.markers)) {
      assert(canOccupy(room, marker, radius), `${roomId}.${name} is blocked`);
    }
  }

  const a = approach.markers;
  for (const slot of approach.arrivalSlots) {
    assert(canOccupy(approach, slot, radius), 'arrival slot is blocked');
    assert(pathExists(approach, slot, a.exit, radius), 'arrival slot cannot reach the exit');
  }
  assert(approach.arrivalSlots.length >= 6, 'fewer than six arrival slots');
  for (let i = 0; i < approach.arrivalSlots.length; i += 1) {
    for (let j = i + 1; j < approach.arrivalSlots.length; j += 1) {
      const first = approach.arrivalSlots[i];
      const second = approach.arrivalSlots[j];
      assert(Math.hypot(first.x - second.x, first.z - second.z) >= radius * 2,
        'arrival positions overlap for six players');
    }
  }
  for (const [branch, side] of [['westBranch', -1], ['eastBranch', 1]]) {
    const stayOnSide = (position) => position.z > 5 || position.z < -7 ||
      Math.sign(position.x) === side;
    assert(pathExists(approach, a.observation, a[branch], radius, stayOnSide),
      `${branch} route is blocked`);
    assert(pathExists(approach, a[branch], a.regroup, radius, stayOnSide),
      `${branch} cannot rejoin`);
    assert(pathExists(approach, a.observation, a[branch], 1.5, stayOnSide) &&
      pathExists(approach, a[branch], a.regroup, 1.5, stayOnSide),
    `${branch} has less than three metres of main-path clearance`);
  }
  assert(!canOccupy(approach, point(0, 0), radius), 'central divider does not force a branch');

  const lane = launcher.lane;
  assert(lane.radius === candidate.boulderRadius, 'lane radius differs from boulder radius');
  assert(lane.from.z === lane.to.z && lane.from.x < lane.to.x,
    'launcher lane must run from its wall mouth to its catch basin');
  assert(launcher.obstacles.every((obstacle) => laneClear(lane, obstacle)),
    'launcher lane intersects a solid');
  assert(launcher.refuges.length >= 6, 'fewer than six refuge positions');
  const l = launcher.markers;
  for (const refuge of launcher.refuges) {
    assert(canOccupy(launcher, refuge.center, radius), `${refuge.id} is blocked`);
    assert(refuge.pocket.max.x - refuge.pocket.min.x >= 4 &&
      refuge.pocket.max.z - refuge.pocket.min.z >= 4, `${refuge.id} is smaller than four metres`);
    assert(launcher.obstacles.every((obstacle) => !boxesOverlap(refuge.pocket, obstacle)),
      `${refuge.id} intersects a solid`);
    assert(refuge.pocket.min.z >= lane.from.z + lane.radius + radius,
      `${refuge.id} overlaps the swept threat lane`);
    assert(pathExists(launcher, l.entry, refuge.center, radius), `${refuge.id} is unreachable`);
    assert(pathExists(launcher, l.entry, refuge.center, 1.5),
      `${refuge.id} has less than three metres of approach clearance`);
  }
  for (let i = 0; i < launcher.refuges.length; i += 1) {
    for (let j = i + 1; j < launcher.refuges.length; j += 1) {
      const first = launcher.refuges[i].center;
      const second = launcher.refuges[j].center;
      assert(Math.hypot(first.x - second.x, first.z - second.z) >= radius * 2,
        'refuge positions overlap for six players');
      assert(!boxesOverlap(launcher.refuges[i].pocket, launcher.refuges[j].pocket),
        'refuge pockets overlap');
    }
  }
  assert(l.cache.x > launcher.cacheAlcove.min.x && l.cache.x < launcher.cacheAlcove.max.x &&
    l.cache.z > launcher.cacheAlcove.min.z && l.cache.z < launcher.cacheAlcove.max.z,
  'cache marker is outside its alcove');
  for (const approachMarker of [l.westApproach, l.eastApproach]) {
    assert(pathExists(launcher, l.entry, approachMarker, radius), 'launcher approach is blocked');
    assert(pathExists(launcher, approachMarker, l.cache, radius), 'cache is sealed from an approach');
    assert(pathExists(launcher, approachMarker, l.cache, 1.5),
      'cache approach has less than three metres of clearance');
  }
  assert(pathExists(launcher, l.cache, l.exit, radius), 'cache has no escape route');
  assert(pathExists(launcher, l.cache, l.exit, 1.5),
    'cache escape has less than three metres of clearance');

  const e = encounter.markers;
  assert(pathExists(encounter, e.entry, e.fight, radius) &&
    pathExists(encounter, e.fight, e.recovery, radius) &&
    pathExists(encounter, e.recovery, e.exit, radius), 'encounter route is blocked');
  assert(candidate.transitions.length === 2 &&
    candidate.transitions[0].from === 'approach.exit' && candidate.transitions[0].to === 'launcher.entry' &&
    candidate.transitions[1].from === 'launcher.exit' && candidate.transitions[1].to === 'encounter.entry',
  'room transition contract changed');
  return {
    roomCount: 3,
    approachCount: 2,
    arrivalCapacity: approach.arrivalSlots.length,
    refugeCapacity: launcher.refuges.length,
    cacheReachable: true,
    sweptLaneClear: true
  };
}

return Object.freeze({ route, canOccupy, pathExists, validateAqueductRoute });
});
