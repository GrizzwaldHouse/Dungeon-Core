// floor-two.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Keep the second-floor boss sequence deterministic and authoritative without coupling it to sockets.

'use strict';

const TICK_HZ = 30;
const KEEPER_WARNING_TICKS = 45;
const HEXER_WARNING_TICKS = 45;
const MAX_LIVE_MINIONS = 4;
const MINION_PREFIX = 'floor2-shardling-';
const KEEPER_ID = 'floor2-threshold-keeper';
const HEXER_ID = 'floor2-mirror-hexer';
const ENEMY_RADIUS = 0.45;

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function alive(enemy) { return enemy && enemy.health.current > 0; }
function activePlayers(room) {
  return [...room.players.values()].filter((player) => player.connection === 'CONNECTED' && player.health.current > 0);
}
function isBlocked(room, position, radius = ENEMY_RADIUS) {
  if (!room.world || !room.world.bounds) return true;
  const { min, max } = room.world.bounds;
  if (position.x < min.x + radius || position.x > max.x - radius ||
      position.z < min.z + radius || position.z > max.z - radius) return true;
  return (room.obstacles || []).some((box) => {
    if (box.revealNodeId && room.revealedNodeIds?.has(box.revealNodeId)) return false;
    const dx = position.x - clamp(position.x, box.min.x, box.max.x);
    const dz = position.z - clamp(position.z, box.min.z, box.max.z);
    return box.min.y <= radius && box.max.y >= -radius && dx * dx + dz * dz < radius * radius;
  });
}

// Why: A deterministic search prevents a phase transition from placing an enemy inside a wall or player.
// Input: Trusted room geometry and preferred world coordinates; no client spawn point is accepted.
// Output: A free position, or null so the caller can fail safely without corrupting an active tick.
// Watch Out: The search does not reserve a position; callers insert the enemy before requesting the next spawn.
function safeSpawn(room, preferred) {
  const { min, max } = room.world.bounds;
  const candidates = [preferred];
  for (let z = Math.ceil(min.z + 1); z <= max.z - 1; z += 2) {
    for (let x = Math.ceil(min.x + 1); x <= max.x - 1; x += 2) candidates.push({ x, y: 0, z });
  }
  for (const candidate of candidates) {
    if (isBlocked(room, candidate)) continue;
    if (activePlayers(room).some((player) => Math.hypot(player.transform.position.x - candidate.x,
      player.transform.position.z - candidate.z) < 2)) continue;
    if ([...room.enemies.values()].some((enemy) => alive(enemy) &&
      Math.hypot(enemy.transform.position.x - candidate.x, enemy.transform.position.z - candidate.z) < 1.5)) continue;
    return { x: candidate.x, y: 0, z: candidate.z };
  }
  return null;
}

function createEnemy(enemyId, kind, health, baseDamage, position, threatStacks) {
  const multiplier = 1 + Math.min(5, Math.max(0, threatStacks || 0)) * 0.05;
  const scaledHealth = Math.ceil(health * multiplier);
  return { enemyId, kind, transform: { position, rotation: { x: 0, y: 0, z: 0 } },
    health: { current: scaledHealth, max: scaledHealth }, attackDamage: Math.ceil(baseDamage * multiplier),
    nextAttackAt: 0 };
}

// Why: The floor starts from one trusted transition and cannot duplicate its first boss on retries.
// Input: A room with Maps for players/enemies and validated world geometry; integer server tick.
// Output: Spawn event descriptors; throws before mutation if no safe boss position exists.
// Watch Out: Invoke once after the floor-one enemies are cleared.
function startFloorTwo(room, tick) {
  if (room.floorTwo) return [];
  if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError('tick must be a nonnegative integer');
  const position = safeSpawn(room, { x: 0, y: 0, z: 7 });
  if (!position) throw new RangeError('No safe floor-two boss spawn');
  const humanCount = [...room.players.values()].filter((player) => player.connection !== 'BOT' &&
    player.connection !== 'REMOVED').length;
  const health = 160 + Math.max(0, humanCount - 2) * 25;
  room.floorTwo = { stage: 'KEEPER', startedAtTick: tick, lastSteppedTick: tick - 1,
    nextAttackAtTick: tick + 45, warning: null, summonFlags: { first: false, second: false },
    minionsSpawned: 0, completedAtTick: null };
  room.enemies.set(KEEPER_ID, createEnemy(KEEPER_ID, 'THRESHOLD_KEEPER', health, 14,
    position, room.run?.threatStacks));
  room.revision += 1;
  return [{ type: 'floor2:spawn', tick, enemyId: KEEPER_ID, kind: 'THRESHOLD_KEEPER' }];
}

function nearestPlayer(room, position) {
  return activePlayers(room).sort((a, b) =>
    Math.hypot(a.transform.position.x - position.x, a.transform.position.z - position.z) -
    Math.hypot(b.transform.position.x - position.x, b.transform.position.z - position.z) ||
    a.playerId.localeCompare(b.playerId))[0] || null;
}

function damagePlayer(room, player, amount, sourceId, tick, events) {
  const applied = Math.min(player.health.current, amount);
  if (applied <= 0) return;
  player.health.current -= applied;
  room.revision += 1;
  events.push({ type: 'floor2:damage', tick, playerId: player.playerId, sourceId,
    amount: applied, currentHealth: player.health.current });
}

function distanceToSegment(point, from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const denominator = dx * dx + dz * dz;
  const t = denominator === 0 ? 0 : clamp(((point.x - from.x) * dx + (point.z - from.z) * dz) / denominator, 0, 1);
  return Math.hypot(point.x - (from.x + t * dx), point.z - (from.z + t * dz));
}

function resolveCharge(room, warning, tick, events) {
  const boss = room.enemies.get(KEEPER_ID);
  if (!alive(boss)) return;
  const from = { ...boss.transform.position };
  const dx = warning.position.x - from.x;
  const dz = warning.position.z - from.z;
  const distance = Math.hypot(dx, dz);
  const travel = Math.min(distance, 8);
  let endpoint = from;
  const steps = Math.max(1, Math.ceil(travel / 0.2));
  for (let step = 1; step <= steps; step += 1) {
    const fraction = step / steps;
    const candidate = { x: from.x + dx / (distance || 1) * travel * fraction,
      y: 0, z: from.z + dz / (distance || 1) * travel * fraction };
    if (isBlocked(room, candidate)) break;
    endpoint = candidate;
  }
  boss.transform.position = endpoint;
  boss.transform.rotation.y = Math.atan2(dx, dz);
  for (const player of activePlayers(room)) {
    if (distanceToSegment(player.transform.position, from, endpoint) <= 1.2) {
      damagePlayer(room, player, boss.attackDamage, KEEPER_ID, tick, events);
    }
  }
  room.revision += 1;
  events.push({ type: 'floor2:charge', tick, enemyId: KEEPER_ID, from, to: { ...endpoint } });
}

function summon(room, state, threshold, tick, events) {
  const live = [...room.enemies.values()].filter((enemy) => enemy.enemyId.startsWith(MINION_PREFIX) && alive(enemy)).length;
  const count = Math.min(2, MAX_LIVE_MINIONS - live);
  const boss = room.enemies.get(HEXER_ID);
  for (let i = 0; i < count; i += 1) {
    const position = safeSpawn(room, { x: boss.transform.position.x + (i === 0 ? -3 : 3),
      y: 0, z: boss.transform.position.z + (threshold === 'first' ? -2 : 2) });
    if (!position) break;
    const enemyId = `${MINION_PREFIX}${++state.minionsSpawned}`;
    room.enemies.set(enemyId, createEnemy(enemyId, 'SHARDLING', 35, 5,
      position, room.run?.threatStacks));
    room.revision += 1;
    events.push({ type: 'floor2:spawn', tick, enemyId, kind: 'SHARDLING', threshold });
  }
}

function moveMinions(room, tick, events) {
  for (const enemy of room.enemies.values()) {
    if (!enemy.enemyId.startsWith(MINION_PREFIX) || !alive(enemy)) continue;
    const position = enemy.transform.position;
    const target = nearestPlayer(room, position);
    if (!target) continue;
    const dx = target.transform.position.x - position.x;
    const dz = target.transform.position.z - position.z;
    const distance = Math.hypot(dx, dz);
    enemy.transform.rotation.y = Math.atan2(dx, dz);
    if (distance > 1.2) {
      const travel = Math.min(1.5 / TICK_HZ, distance - 1.2);
      const nextX = { x: position.x + dx / distance * travel, y: 0, z: position.z };
      if (!isBlocked(room, nextX)) position.x = nextX.x;
      const nextZ = { x: position.x, y: 0, z: position.z + dz / distance * travel };
      if (!isBlocked(room, nextZ)) position.z = nextZ.z;
    } else if (tick >= enemy.nextAttackAt) {
      damagePlayer(room, target, enemy.attackDamage, enemy.enemyId, tick, events);
      enemy.nextAttackAt = tick + 45;
    }
  }
}

// Why: A fixed tick resolves warnings, threshold spawns, and victory once even when sockets disconnect.
// Input: Trusted mutable room aggregate and increasing integer server tick; enemy health was changed by validated attacks.
// Output: Ordered event descriptors for the integrator to broadcast, empty on repeated tick.
// Watch Out: The caller must skip generic enemy AI for floor-two entities to avoid double attacks.
function stepFloorTwo(room, tick) {
  const state = room.floorTwo;
  if (!state || (room.phase && room.phase !== 'RUNNING') || !Number.isSafeInteger(tick) ||
    tick <= state.lastSteppedTick || state.stage === 'CLEARED') return [];
  state.lastSteppedTick = tick;
  const events = [];
  if (state.stage === 'KEEPER' && !alive(room.enemies.get(KEEPER_ID))) {
    const position = safeSpawn(room, { x: 0, y: 0, z: 7 });
    if (position) {
      room.enemies.set(HEXER_ID, createEnemy(HEXER_ID, 'MIRROR_HEXER', 180, 11,
        position, room.run?.threatStacks));
      state.stage = 'HEXER';
      state.warning = null;
      state.nextAttackAtTick = tick + 45;
      room.revision += 1;
      events.push({ type: 'floor2:stage', tick, stage: 'HEXER' });
      events.push({ type: 'floor2:spawn', tick, enemyId: HEXER_ID, kind: 'MIRROR_HEXER' });
    }
  }
  if (state.stage === 'KEEPER') {
    const boss = room.enemies.get(KEEPER_ID);
    if (state.warning && tick >= state.warning.endsAtTick) {
      resolveCharge(room, state.warning, tick, events);
      state.warning = null;
      state.nextAttackAtTick = tick + 75;
    } else if (!state.warning && tick >= state.nextAttackAtTick) {
      const target = nearestPlayer(room, boss.transform.position);
      if (target) {
        state.warning = { kind: 'CHARGE', startedAtTick: tick, endsAtTick: tick + KEEPER_WARNING_TICKS,
          position: { ...target.transform.position } };
        room.revision += 1;
        events.push({ type: 'floor2:warning', tick, enemyId: KEEPER_ID, warning: structuredClone(state.warning) });
      }
    }
  } else if (state.stage === 'HEXER' || state.stage === 'CLEANUP') {
    const boss = room.enemies.get(HEXER_ID);
    if (alive(boss)) {
      for (const [flag, ratio] of [['first', 0.7], ['second', 0.35]]) {
        if (!state.summonFlags[flag] && boss.health.current <= boss.health.max * ratio) {
          state.summonFlags[flag] = true;
          summon(room, state, flag, tick, events);
        }
      }
      if (state.warning && tick >= state.warning.endsAtTick) {
        for (const player of activePlayers(room)) {
          if (Math.hypot(player.transform.position.x - state.warning.position.x,
            player.transform.position.z - state.warning.position.z) <= 2.5) {
            damagePlayer(room, player, boss.attackDamage, HEXER_ID, tick, events);
          }
        }
        state.warning = null;
        state.nextAttackAtTick = tick + 90;
      } else if (!state.warning && tick >= state.nextAttackAtTick) {
        const target = nearestPlayer(room, boss.transform.position);
        if (target) {
          state.warning = { kind: 'HEX_BLAST', startedAtTick: tick, endsAtTick: tick + HEXER_WARNING_TICKS,
            position: { ...target.transform.position } };
          room.revision += 1;
          events.push({ type: 'floor2:warning', tick, enemyId: HEXER_ID, warning: structuredClone(state.warning) });
        }
      }
    } else {
      state.stage = 'CLEANUP';
      state.warning = null;
    }
    moveMinions(room, tick, events);
    if (!alive(boss) && ![...room.enemies.values()].some((enemy) =>
      enemy.enemyId.startsWith(MINION_PREFIX) && alive(enemy))) {
      state.stage = 'CLEARED';
      state.completedAtTick = tick;
      room.revision += 1;
      events.push({ type: 'floor2:clear', tick });
    }
  }
  return events;
}

function floorTwoComplete(room) { return room.floorTwo?.stage === 'CLEARED'; }

function publicFloorTwo(room) {
  const state = room.floorTwo;
  if (!state) return null;
  return { stage: state.stage,
    bossEnemyId: state.stage === 'KEEPER' ? KEEPER_ID : state.stage === 'HEXER' ? HEXER_ID : null,
    warning: state.warning ? structuredClone(state.warning) : null,
    minionsSpawned: state.minionsSpawned,
    completedAtTick: state.completedAtTick };
}

module.exports = { KEEPER_ID, HEXER_ID, MAX_LIVE_MINIONS, KEEPER_WARNING_TICKS,
  HEXER_WARNING_TICKS, startFloorTwo, stepFloorTwo, floorTwoComplete, publicFloorTwo };
