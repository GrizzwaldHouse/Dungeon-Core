// floor-five.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Resolve the Shifting Core Warden finale and bounded minion phases on the authoritative tick.

'use strict';

const WARDEN_ID = 'floor5-shifting-core-warden';
const MINION_PREFIX = 'floor5-shardling-';
const WARNING_TICKS = 45;
const MAX_LIVE_MINIONS = 4;

function alive(enemy) { return enemy && enemy.health.current > 0; }
function distance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function activePlayers(room) {
  return [...room.players.values()].filter((p) => p.connection === 'CONNECTED' && p.health.current > 0)
    .sort((a, b) => a.playerId.localeCompare(b.playerId));
}
function blocked(room, point, radius = 0.5) {
  const { min, max } = room.world.bounds;
  if (point.x < min.x + radius || point.x > max.x - radius ||
    point.z < min.z + radius || point.z > max.z - radius) return true;
  return room.obstacles.some((box) => {
    if (box.revealNodeId && room.revealedNodeIds?.has(box.revealNodeId)) return false;
    const x = Math.max(box.min.x, Math.min(box.max.x, point.x));
    const z = Math.max(box.min.z, Math.min(box.max.z, point.z));
    return box.min.y <= 0.5 && box.max.y >= -0.5 && distance(point, { x, z }) < radius;
  });
}
function safeSpawn(room, preferred) {
  const candidates = [preferred];
  for (let z = Math.ceil(room.world.bounds.min.z + 1); z < room.world.bounds.max.z; z += 2) {
    for (let x = Math.ceil(room.world.bounds.min.x + 1); x < room.world.bounds.max.x; x += 2) {
      candidates.push({ x, y: 0, z });
    }
  }
  return candidates.find((point) => !blocked(room, point) &&
    activePlayers(room).every((player) => distance(player.transform.position, point) >= 2) &&
    [...room.enemies.values()].every((enemy) => !alive(enemy) ||
      distance(enemy.transform.position, point) >= 1.5)) || null;
}
function createEnemy(enemyId, kind, baseHp, baseDamage, position, room) {
  const stacks = Math.max(0, Math.min(5, room.run?.threatStacks || 0));
  const multiplier = 1 + stacks * 0.05;
  const max = Math.ceil(baseHp * multiplier);
  return { enemyId, kind, transform: { position: { ...position }, rotation: { x: 0, y: 0, z: 0 } },
    health: { current: max, max }, attackDamage: Math.ceil(baseDamage * multiplier), nextAttackAt: 0 };
}
function damage(room, player, amount, sourceId, tick, events) {
  const applied = Math.min(player.health.current, amount);
  if (applied <= 0) return;
  player.health.current -= applied;
  room.revision += 1;
  events.push({ type: 'floor5:damage', tick, playerId: player.playerId,
    sourceId, amount: applied, currentHealth: player.health.current });
}

// Why: A floor transition must place exactly one Warden at a walkable, unoccupied server coordinate.
// Input: Trusted room and nonnegative server tick.
// Output: One spawn descriptor or an exception before mutation if no safe spawn exists.
function startFloorFive(room, tick) {
  if (room.floorFive) return [];
  if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError('Invalid floor-five tick');
  const spawn = safeSpawn(room, { x: 0, y: 0, z: 7 });
  if (!spawn) throw new RangeError('No safe Warden spawn');
  const humans = [...room.players.values()].filter((p) => p.connection !== 'BOT' &&
    p.connection !== 'REMOVED').length;
  room.floorFive = { stage: 'PHASE_ONE', startedAtTick: tick, lastSteppedTick: tick - 1,
    nextAttackAtTick: tick + 45, warning: null, thresholds: { first: false, second: false },
    minionsSpawned: 0, completedAtTick: null };
  room.enemies.set(WARDEN_ID, createEnemy(WARDEN_ID, 'SHIFTING_CORE_WARDEN',
    300 + Math.max(0, humans - 2) * 40, 16, spawn, room));
  room.revision += 1;
  return [{ type: 'floor5:spawn', tick, enemyId: WARDEN_ID, kind: 'SHIFTING_CORE_WARDEN' }];
}

function summon(room, state, tick, threshold, events) {
  let live = [...room.enemies.values()].filter((enemy) => enemy.enemyId.startsWith(MINION_PREFIX) && alive(enemy)).length;
  const warden = room.enemies.get(WARDEN_ID);
  for (let slot = 0; slot < 2 && live < MAX_LIVE_MINIONS; slot += 1) {
    const spawn = safeSpawn(room, { x: warden.transform.position.x + (slot === 0 ? -3 : 3),
      y: 0, z: warden.transform.position.z + (threshold === 'first' ? -3 : 3) });
    if (!spawn) break;
    const enemyId = `${MINION_PREFIX}${++state.minionsSpawned}`;
    room.enemies.set(enemyId, createEnemy(enemyId, 'SHARDLING', 40, 7, spawn, room));
    room.revision += 1;
    live += 1;
    events.push({ type: 'floor5:spawn', tick, enemyId, kind: 'SHARDLING', threshold });
  }
}

function stepMinions(room, tick, events) {
  for (const minion of room.enemies.values()) {
    if (!minion.enemyId.startsWith(MINION_PREFIX) || !alive(minion)) continue;
    const target = activePlayers(room).sort((a, b) => distance(a.transform.position, minion.transform.position) -
      distance(b.transform.position, minion.transform.position) || a.playerId.localeCompare(b.playerId))[0];
    if (!target) continue;
    const p = minion.transform.position;
    const d = distance(p, target.transform.position);
    const dx = target.transform.position.x - p.x;
    const dz = target.transform.position.z - p.z;
    minion.transform.rotation.y = Math.atan2(dx, dz);
    if (d > 1.2) {
      const travel = Math.min(1.7 / 30, d - 1.2);
      const nextX = { x: p.x + dx / d * travel, y: 0, z: p.z };
      if (!blocked(room, nextX)) p.x = nextX.x;
      const nextZ = { x: p.x, y: 0, z: p.z + dz / d * travel };
      if (!blocked(room, nextZ)) p.z = nextZ.z;
    } else if (tick >= minion.nextAttackAt) {
      damage(room, target, minion.attackDamage, minion.enemyId, tick, events);
      minion.nextAttackAt = tick + 45;
    }
  }
}

// Why: The Warden's telegraphs and health gates need one deterministic owner on each fixed tick.
// Input: Trusted room, tick, and enemy HP changed only by validated server attacks.
// Output: Ordered phase, warning, spawn, damage, and clear descriptors; repeated ticks are inert.
// Watch Out: The caller must skip generic enemy AI for Warden and minions and process down events once.
function stepFloorFive(room, tick) {
  const state = room.floorFive;
  if (!state || room.phase !== 'RUNNING' || !Number.isSafeInteger(tick) ||
    tick <= state.lastSteppedTick || state.stage === 'CLEARED') return [];
  state.lastSteppedTick = tick;
  const events = [];
  const warden = room.enemies.get(WARDEN_ID);
  if (alive(warden)) {
    for (const [flag, ratio, stage] of [['first', 0.7, 'PHASE_TWO'], ['second', 0.35, 'PHASE_THREE']]) {
      if (!state.thresholds[flag] && warden.health.current <= warden.health.max * ratio) {
        state.thresholds[flag] = true;
        state.stage = stage;
        room.revision += 1;
        events.push({ type: 'floor5:phase', tick, stage });
        const shift = safeSpawn(room, { x: flag === 'first' ? -7 : 7, y: 0, z: flag === 'first' ? 7 : -7 });
        if (shift) {
          warden.transform.position = { ...shift };
          room.revision += 1;
          events.push({ type: 'floor5:shift', tick, enemyId: WARDEN_ID, position: { ...shift } });
        }
        summon(room, state, tick, flag, events);
      }
    }
    if (state.warning && tick >= state.warning.endsAtTick) {
      for (const player of activePlayers(room)) {
        if (distance(player.transform.position, state.warning.position) <= state.warning.radius) {
          damage(room, player, warden.attackDamage, WARDEN_ID, tick, events);
        }
      }
      state.warning = null;
      state.nextAttackAtTick = tick + (state.stage === 'PHASE_THREE' ? 54 : 75);
    } else if (!state.warning && tick >= state.nextAttackAtTick) {
      const target = activePlayers(room).sort((a, b) => distance(a.transform.position, warden.transform.position) -
        distance(b.transform.position, warden.transform.position) || a.playerId.localeCompare(b.playerId))[0];
      if (target) {
        state.warning = { kind: 'CORE_BLAST', position: { ...target.transform.position },
          radius: state.stage === 'PHASE_THREE' ? 3.2 : 2.5,
          startedAtTick: tick, endsAtTick: tick + WARNING_TICKS };
        room.revision += 1;
        events.push({ type: 'floor5:warning', tick, warning: structuredClone(state.warning) });
      }
    }
  } else {
    state.stage = 'CLEANUP';
    state.warning = null;
  }
  stepMinions(room, tick, events);
  if (!alive(warden) && ![...room.enemies.values()].some((enemy) =>
    enemy.enemyId.startsWith(MINION_PREFIX) && alive(enemy))) {
    state.stage = 'CLEARED';
    state.completedAtTick = tick;
    room.revision += 1;
    events.push({ type: 'floor5:clear', tick });
  }
  return events;
}

function floorFiveComplete(room) { return room.floorFive?.stage === 'CLEARED'; }
function publicFloorFive(room) {
  const state = room.floorFive;
  if (!state) return null;
  return { stage: state.stage, bossEnemyId: WARDEN_ID,
    warning: state.warning ? structuredClone(state.warning) : null,
    minionsSpawned: state.minionsSpawned, completedAtTick: state.completedAtTick };
}

module.exports = { WARDEN_ID, MAX_LIVE_MINIONS, WARNING_TICKS, startFloorFive,
  stepFloorFive, floorFiveComplete, publicFloorFive };
