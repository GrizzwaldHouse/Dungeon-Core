// deepwood.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Keep the Deepwood guardian and its airborne attack phases deterministic inside one authoritative room.

'use strict';

const BOSS_ID = 'deepwood-sentinel';
const WING_PREFIX = 'deepwood-barkwing-';
const ROOT_PREFIX = 'deepwood-rootling-';
const WARNING_TICKS = 45;
const WING_WARNING_TICKS = 30;
const MAX_LIVE_MINIONS = 4;

function alive(enemy) { return Boolean(enemy && enemy.health.current > 0); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function activePlayers(room) {
  return [...room.players.values()].filter((player) => player.connection === 'CONNECTED' && player.health.current > 0)
    .sort((a, b) => a.playerId.localeCompare(b.playerId));
}
function nearestPlayer(room, origin) {
  return activePlayers(room).sort((a, b) => distance(a.transform.position, origin) -
    distance(b.transform.position, origin) || a.playerId.localeCompare(b.playerId))[0] || null;
}
function blocked(room, point, radius = 0.5) {
  const { min, max } = room.world.bounds;
  if (point.x < min.x + radius || point.x > max.x - radius ||
    point.z < min.z + radius || point.z > max.z - radius) return true;
  return room.obstacles.some((box) => {
    if (box.revealNodeId && room.revealedNodeIds?.has(box.revealNodeId)) return false;
    if (box.min.y > 0.5 || box.max.y < -0.5) return false;
    const x = Math.max(box.min.x, Math.min(box.max.x, point.x));
    const z = Math.max(box.min.z, Math.min(box.max.z, point.z));
    return distance(point, { x, z }) < radius;
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
function createEnemy(room, enemyId, kind, health, damage, position) {
  const stacks = Math.max(0, Math.min(5, room.run?.threatStacks || 0));
  const multiplier = 1 + stacks * 0.05;
  const max = Math.ceil(health * multiplier);
  return { enemyId, kind, transform: { position: { ...position }, rotation: { x: 0, y: 0, z: 0 } },
    health: { current: max, max }, attackDamage: Math.ceil(damage * multiplier), nextAttackAt: 0,
    warning: null };
}
function damage(room, player, amount, sourceId, tick, events) {
  const applied = Math.min(player.health.current, amount);
  if (applied <= 0) return;
  player.health.current -= applied;
  room.revision += 1;
  events.push({ type: 'deepwood:damage', tick, playerId: player.playerId,
    sourceId, amount: applied, currentHealth: player.health.current });
}

// Why: The rest exit must start one guardian in a walkable chamber or reject the transition atomically.
// Input: Trusted room after party transfer and a nonnegative authoritative tick.
// Output: One boss spawn descriptor; throws before mutation when no spawn exists.
function startDeepwood(room, tick) {
  if (room.deepwood) return [];
  if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError('Invalid Deepwood tick');
  const position = safeSpawn(room, { x: 0, y: 0, z: 7 });
  if (!position) throw new RangeError('No safe Deepwood spawn');
  const humans = [...room.players.values()].filter((player) => player.connection !== 'BOT' &&
    player.connection !== 'REMOVED').length;
  room.deepwood = { stage: 'PHASE_ONE', startedAtTick: tick, lastSteppedTick: tick - 1,
    nextAttackAtTick: tick + 45, warning: null, thresholds: { first: false, second: false },
    minionsSpawned: 0, completedAtTick: null };
  room.enemies.set(BOSS_ID, createEnemy(room, BOSS_ID, 'DEEPWOOD_SENTINEL',
    220 + Math.max(0, humans - 2) * 30, 12, position));
  room.revision += 1;
  return [{ type: 'deepwood:spawn', tick, enemyId: BOSS_ID, kind: 'DEEPWOOD_SENTINEL' }];
}

function summon(room, state, tick, threshold, events) {
  const boss = room.enemies.get(BOSS_ID);
  let live = [...room.enemies.values()].filter((enemy) =>
    (enemy.enemyId.startsWith(WING_PREFIX) || enemy.enemyId.startsWith(ROOT_PREFIX)) && alive(enemy)).length;
  for (let slot = 0; slot < 2 && live < MAX_LIVE_MINIONS; slot += 1) {
    const winged = threshold === 'first' || slot === 0;
    const ground = safeSpawn(room, { x: boss.transform.position.x + (slot === 0 ? -3 : 3),
      y: 0, z: boss.transform.position.z + (threshold === 'first' ? -3 : 3) });
    if (!ground) break;
    const enemyId = `${winged ? WING_PREFIX : ROOT_PREFIX}${++state.minionsSpawned}`;
    const position = { ...ground, y: winged ? 2.4 : 0 };
    const kind = winged ? 'BARKWING' : 'ROOTLING';
    room.enemies.set(enemyId, createEnemy(room, enemyId, kind,
      winged ? 28 : 38, winged ? 6 : 8, position));
    room.revision += 1;
    live += 1;
    events.push({ type: 'deepwood:spawn', tick, threshold, enemyId, kind });
  }
}

function stepMinions(room, tick, events) {
  for (const minion of room.enemies.values()) {
    if ((!minion.enemyId.startsWith(WING_PREFIX) && !minion.enemyId.startsWith(ROOT_PREFIX)) ||
      !alive(minion)) continue;
    const p = minion.transform.position;
    const winged = minion.kind === 'BARKWING';
    if (minion.warning) {
      if (tick >= minion.warning.endsAtTick) {
        for (const player of activePlayers(room)) {
          if (distance(player.transform.position, minion.warning.position) <= minion.warning.radius) {
            damage(room, player, minion.attackDamage, minion.enemyId, tick, events);
          }
        }
        minion.warning = null;
        minion.nextAttackAt = tick + 60;
        p.y = 2.4;
      }
      continue;
    }
    const target = nearestPlayer(room, p);
    if (!target) continue;
    const d = distance(p, target.transform.position);
    const dx = target.transform.position.x - p.x;
    const dz = target.transform.position.z - p.z;
    minion.transform.rotation.y = Math.atan2(dx, dz);
    const stop = winged ? 1.8 : 1.2;
    if (d > stop) {
      const travel = Math.min((winged ? 2.3 : 1.6) / 30, d - stop);
      const nextX = { x: p.x + dx / d * travel, y: 0, z: p.z };
      if (!blocked(room, nextX)) p.x = nextX.x;
      const nextZ = { x: p.x, y: 0, z: p.z + dz / d * travel };
      if (!blocked(room, nextZ)) p.z = nextZ.z;
    } else if (tick >= minion.nextAttackAt) {
      if (winged) {
        minion.warning = { id: `warning-${minion.enemyId}`, kind: 'BARKWING_DIVE', position: { ...target.transform.position },
          radius: 1.5, endsAtTick: tick + WING_WARNING_TICKS };
        events.push({ type: 'deepwood:warning', tick, enemyId: minion.enemyId,
          warning: structuredClone(minion.warning) });
      } else {
        damage(room, target, minion.attackDamage, minion.enemyId, tick, events);
        minion.nextAttackAt = tick + 45;
      }
    }
  }
}

// Why: Boss health gates and telegraphs must resolve once per authoritative tick, even after reconnects.
// Input: Trusted room, tick, and enemy health changed only through server-validated attacks.
// Output: Ordered phase, spawn, warning, damage, and clear descriptors; duplicate ticks are inert.
// Watch Out: The caller must skip generic AI for Deepwood actors and process down events once.
function stepDeepwood(room, tick) {
  const state = room.deepwood;
  if (!state || room.phase !== 'RUNNING' || !Number.isSafeInteger(tick) ||
    tick <= state.lastSteppedTick || state.stage === 'CLEARED') return [];
  state.lastSteppedTick = tick;
  const events = [];
  const boss = room.enemies.get(BOSS_ID);
  if (alive(boss)) {
    for (const [flag, ratio, stage] of [['first', 0.7, 'PHASE_TWO'], ['second', 0.35, 'PHASE_THREE']]) {
      if (!state.thresholds[flag] && boss.health.current <= boss.health.max * ratio) {
        state.thresholds[flag] = true;
        state.stage = stage;
        room.revision += 1;
        events.push({ type: 'deepwood:phase', tick, stage });
        summon(room, state, tick, flag, events);
      }
    }
    if (state.warning && tick >= state.warning.endsAtTick) {
      for (const player of activePlayers(room)) {
        if (distance(player.transform.position, state.warning.position) <= state.warning.radius) {
          damage(room, player, boss.attackDamage, BOSS_ID, tick, events);
          if (player.health.current > 0 && !player.statusEffects.some((effect) =>
            effect.kind === 'ROOT' && effect.expiresAtTick > tick)) {
            player.statusEffects.push({ kind: 'ROOT', sourceId: BOSS_ID, expiresAtTick: tick + 30 });
          }
        }
      }
      state.warning = null;
      state.nextAttackAtTick = tick + (state.stage === 'PHASE_THREE' ? 60 : 84);
    } else if (!state.warning && tick >= state.nextAttackAtTick) {
      const target = nearestPlayer(room, boss.transform.position);
      if (target) {
        state.warning = { id: `warning-${BOSS_ID}`, kind: 'DEEPWOOD_ROOTS', position: { ...target.transform.position },
          radius: state.stage === 'PHASE_THREE' ? 3 : 2.4, endsAtTick: tick + WARNING_TICKS };
        room.revision += 1;
        events.push({ type: 'deepwood:warning', tick, enemyId: BOSS_ID,
          warning: structuredClone(state.warning) });
      }
    }
  } else {
    state.stage = 'CLEANUP';
    state.warning = null;
  }
  stepMinions(room, tick, events);
  if (!alive(boss) && ![...room.enemies.values()].some((enemy) =>
    (enemy.enemyId.startsWith(WING_PREFIX) || enemy.enemyId.startsWith(ROOT_PREFIX)) && alive(enemy))) {
    state.stage = 'CLEARED';
    state.completedAtTick = tick;
    room.revision += 1;
    events.push({ type: 'deepwood:clear', tick });
  }
  return events;
}

function deepwoodComplete(room) { return room.deepwood?.stage === 'CLEARED'; }
function publicDeepwood(room) {
  const state = room.deepwood;
  if (!state) return null;
  return { stage: state.stage, bossEnemyId: BOSS_ID,
    warning: state.warning ? structuredClone(state.warning) : null,
    minionsSpawned: state.minionsSpawned, completedAtTick: state.completedAtTick };
}
function deepwoodWarnings(room) {
  const state = room.deepwood;
  if (!state) return [];
  return [state.warning, ...[...room.enemies.values()].filter((enemy) =>
    enemy.kind === 'BARKWING' && alive(enemy) && enemy.warning).map((enemy) => enemy.warning)].filter(Boolean);
}

module.exports = { BOSS_ID, WING_PREFIX, MAX_LIVE_MINIONS, WARNING_TICKS,
  startDeepwood, stepDeepwood, deepwoodComplete, publicDeepwood, deepwoodWarnings };
