// bot-navigation.js
// Developer: Marcus Daley
// Date: 2026-10-31
// Why: Give mock teammates radius-clear routes around multiple obstacle corners without falling back to blocked targets.

'use strict';

const MAX_OBSTACLES = 64;
const CORNER_MARGIN = 0.05;
const EPSILON = 1e-9;

function finitePoint(point) {
  return point && Number.isFinite(point.x) && Number.isFinite(point.z);
}

// Why: A centerline ray can clear a column while the player's collision body clips it.
// Input: Finite X/Z endpoints and a radius-expanded rectangle, all server-owned.
// Output: True for any crossing or tangency, including a point inside the rectangle.
function intersects(from, to, rectangle) {
  let near = 0;
  let far = 1;
  for (const axis of ['x', 'z']) {
    const delta = to[axis] - from[axis];
    if (Math.abs(delta) < EPSILON) {
      if (from[axis] < rectangle.min[axis] || from[axis] > rectangle.max[axis]) return false;
      continue;
    }
    const first = (rectangle.min[axis] - from[axis]) / delta;
    const second = (rectangle.max[axis] - from[axis]) / delta;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return false;
  }
  return true;
}

// Why: A single corner visible from both endpoints cannot route around a broad pillar.
// Input: Authoritative room, server vectors, and finite nonnegative collision radius.
// Output: The next visible X/Z waypoint, a copy of the final target, or null to remain stationary.
// Watch Out: Bounds and inflated boxes are conservative. The caller applies stopDistance only to the final target,
// and must use its ordinary collision-validated movement. At most 258 vertices are searched per obstructed route.
function nextBotWaypoint(room, from, target, radius) {
  const bounds = room?.world?.bounds;
  if (!finitePoint(from) || !finitePoint(target) || !finitePoint(bounds?.min) ||
      !finitePoint(bounds?.max) || !Number.isFinite(radius) || radius < 0 ||
      !Array.isArray(room.obstacles) || (from.y !== undefined && !Number.isFinite(from.y))) return null;
  const height = from.y ?? 0;
  const insideBounds = (point) => point.x >= bounds.min.x + radius && point.x <= bounds.max.x - radius &&
    point.z >= bounds.min.z + radius && point.z <= bounds.max.z - radius;
  if (!insideBounds(from) || !insideBounds(target)) return null;

  const rectangles = [];
  for (const obstacle of room.obstacles) {
    if (obstacle.revealNodeId && room.revealedNodeIds?.has(obstacle.revealNodeId)) continue;
    if (!finitePoint(obstacle.min) || !finitePoint(obstacle.max) ||
        !Number.isFinite(obstacle.min.y) || !Number.isFinite(obstacle.max.y) ||
        obstacle.min.x > obstacle.max.x || obstacle.min.z > obstacle.max.z || obstacle.min.y > obstacle.max.y) return null;
    if (obstacle.min.y > height + radius || obstacle.max.y < height - radius) continue;
    rectangles.push({ min: { x: obstacle.min.x - radius, z: obstacle.min.z - radius },
      max: { x: obstacle.max.x + radius, z: obstacle.max.z + radius } });
  }
  const visible = (a, b) => !rectangles.some((rectangle) => intersects(a, b, rectangle));
  if (visible(from, target)) return { ...target };
  if (rectangles.length > MAX_OBSTACLES) return null;
  const free = (point) => insideBounds(point) && visible(point, point);
  if (!free(from) || !free(target)) return null;

  const vertices = [{ ...from }, { ...target }];
  for (const rectangle of rectangles) {
    for (const x of [rectangle.min.x - CORNER_MARGIN, rectangle.max.x + CORNER_MARGIN]) {
      for (const z of [rectangle.min.z - CORNER_MARGIN, rectangle.max.z + CORNER_MARGIN]) {
        const corner = { x, z };
        if (from.y !== undefined) corner.y = height;
        if (free(corner)) vertices.push(corner);
      }
    }
  }

  // Euclidean Dijkstra with stable array-order tie breaking gives repeatable shortest visible routes.
  const distances = Array(vertices.length).fill(Infinity);
  const previous = Array(vertices.length).fill(-1);
  const visited = Array(vertices.length).fill(false);
  distances[0] = 0;
  for (let iteration = 0; iteration < vertices.length; iteration += 1) {
    let current = -1;
    for (let index = 0; index < vertices.length; index += 1) {
      if (!visited[index] && (current === -1 || distances[index] < distances[current])) current = index;
    }
    if (current === -1 || !Number.isFinite(distances[current])) return null;
    if (current === 1) {
      let next = 1;
      while (previous[next] > 0) next = previous[next];
      return previous[next] === 0 ? { ...vertices[next] } : null;
    }
    visited[current] = true;
    for (let index = 0; index < vertices.length; index += 1) {
      if (visited[index]) continue;
      const candidate = distances[current] + Math.hypot(vertices[current].x - vertices[index].x,
        vertices[current].z - vertices[index].z);
      if (candidate + EPSILON < distances[index] && visible(vertices[current], vertices[index])) {
        distances[index] = candidate;
        previous[index] = current;
      }
    }
  }
  return null;
}

module.exports = { nextBotWaypoint };
