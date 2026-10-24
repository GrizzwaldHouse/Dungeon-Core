// floor-four.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Keep the ordered rune trial and its guardian authoritative across concurrent explorers.

'use strict';

const RUNES = Object.freeze([
  Object.freeze({ x: -6, y: 0, z: -5 }),
  Object.freeze({ x: 6, y: 0, z: -5 }),
  Object.freeze({ x: 0, y: 0, z: 6 })
]);
const GUARDIAN_ID = 'floor4-rune-guardian';
const WARNING_TICKS = 45;
const RUNE_RADIUS = 1.4;

function alive(enemy) { return enemy && enemy.health.current > 0; }
function players(room) {
  return [...room.players.values()].filter((player) => player.connection === 'CONNECTED' && player.health.current > 0)
    .sort((a, b) => a.playerId.localeCompare(b.playerId));
}
function distance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
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
function safeSpawn(room) {
  const preferred = [{ x: 0, y: 0, z: 9 }, { x: 0, y: 0, z: 0 }];
  for (let z = Math.ceil(room.world.bounds.min.z + 1); z < room.world.bounds.max.z; z += 3) {
    for (let x = Math.ceil(room.world.bounds.min.x + 1); x < room.world.bounds.max.x; x += 3) {
      preferred.push({ x, y: 0, z });
    }
  }
  return preferred.find((point) => !blocked(room, point) &&
    players(room).every((player) => distance(player.transform.position, point) >= 2)) || null;
}
function damage(room, player, amount, sourceId, tick, events) {
  const applied = Math.min(player.health.current, amount);
  if (applied <= 0) return;
  player.health.current -= applied;
  room.revision += 1;
  events.push({ type: 'floor4:damage', tick, playerId: player.playerId, sourceId,
    amount: applied, currentHealth: player.health.current });
}

// Why: The puzzle cannot start unless all fixed rune targets lie on walkable server geometry.
// Input: Trusted room aggregate and the current nonnegative tick.
// Output: One start descriptor; repeat calls are inert and an invalid layout fails before mutation.
function startFloorFour(room, tick) {
  if (room.floorFour) return [];
  if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError('Invalid floor-four tick');
  if (RUNES.some((rune) => blocked(room, rune, RUNE_RADIUS * 0.5))) {
    throw new RangeError('Floor-four rune is obstructed');
  }
  room.floorFour = { stage: 'RUNES', startedAtTick: tick, lastSteppedTick: tick - 1,
    nextRuneIndex: 0, warning: null, warningCooldownUntilTick: tick,
    guardianSpawned: false, guardianNextAttackTick: tick + 45, completedAtTick: null };
  room.revision += 1;
  return [{ type: 'floor4:start', tick, runeCount: RUNES.length }];
}

// Why: Serialize ordered proximity touches, one warning resolution, and guardian attacks per tick.
// Input: Trusted room/player transforms and increasing server tick; enemy HP comes from validated attacks.
// Output: Event descriptors; repeat or failed-room ticks produce no mutations.
// Watch Out: The caller must skip generic AI for the guardian and map damage events into shared down handling.
function stepFloorFour(room, tick) {
  const state = room.floorFour;
  if (!state || room.phase !== 'RUNNING' || !Number.isSafeInteger(tick) ||
    tick <= state.lastSteppedTick || state.stage === 'CLEARED') return [];
  state.lastSteppedTick = tick;
  const events = [];
  if (state.warning && tick >= state.warning.endsAtTick) {
    for (const player of players(room)) {
      if (distance(player.transform.position, state.warning.position) <= 2.2) {
        damage(room, player, 13, 'floor4-rune-trap', tick, events);
      }
    }
    state.warning = null;
    state.warningCooldownUntilTick = tick + 90;
  }
  for (const player of players(room)) {
    if (state.nextRuneIndex >= RUNES.length) break;
    const touched = RUNES.findIndex((rune) => distance(player.transform.position, rune) <= RUNE_RADIUS);
    if (touched < 0 || touched < state.nextRuneIndex) continue;
    if (touched !== state.nextRuneIndex) {
      if (!state.warning && tick >= state.warningCooldownUntilTick) {
        state.warning = { kind: 'RUNE_TRAP', position: { ...player.transform.position },
          startedAtTick: tick, endsAtTick: tick + WARNING_TICKS };
        room.revision += 1;
        events.push({ type: 'floor4:warning', tick, warning: structuredClone(state.warning) });
      }
      continue;
    }
    state.nextRuneIndex += 1;
    room.revision += 1;
    events.push({ type: 'floor4:rune', tick, playerId: player.playerId,
      solvedIndex: touched, nextRuneIndex: state.nextRuneIndex });
    if (state.nextRuneIndex === 2 && !state.guardianSpawned) {
      const spawn = safeSpawn(room);
      if (spawn) {
        const stacks = Math.max(0, Math.min(5, room.run?.threatStacks || 0));
        const max = Math.ceil(145 * (1 + stacks * 0.05));
        room.enemies.set(GUARDIAN_ID, { enemyId: GUARDIAN_ID, kind: 'RUNE_GUARDIAN',
          transform: { position: { ...spawn }, rotation: { x: 0, y: 0, z: 0 } },
          health: { current: max, max }, attackDamage: Math.ceil(10 * (1 + stacks * 0.05)), nextAttackAt: 0 });
        state.guardianSpawned = true;
        room.revision += 1;
        events.push({ type: 'floor4:spawn', tick, enemyId: GUARDIAN_ID, kind: 'RUNE_GUARDIAN' });
      }
    }
  }
  if (state.nextRuneIndex >= 2 && !state.guardianSpawned) {
    const spawn = safeSpawn(room);
    if (spawn) {
      const stacks = Math.max(0, Math.min(5, room.run?.threatStacks || 0));
      const max = Math.ceil(145 * (1 + stacks * 0.05));
      room.enemies.set(GUARDIAN_ID, { enemyId: GUARDIAN_ID, kind: 'RUNE_GUARDIAN',
        transform: { position: { ...spawn }, rotation: { x: 0, y: 0, z: 0 } },
        health: { current: max, max }, attackDamage: Math.ceil(10 * (1 + stacks * 0.05)), nextAttackAt: 0 });
      state.guardianSpawned = true;
      room.revision += 1;
      events.push({ type: 'floor4:spawn', tick, enemyId: GUARDIAN_ID, kind: 'RUNE_GUARDIAN' });
    }
  }
  const guardian = room.enemies.get(GUARDIAN_ID);
  if (alive(guardian)) {
    const target = players(room).sort((a, b) => distance(a.transform.position, guardian.transform.position) -
      distance(b.transform.position, guardian.transform.position) || a.playerId.localeCompare(b.playerId))[0];
    if (target) {
      const p = guardian.transform.position;
      const d = distance(p, target.transform.position);
      const dx = target.transform.position.x - p.x;
      const dz = target.transform.position.z - p.z;
      guardian.transform.rotation.y = Math.atan2(dx, dz);
      if (d > 1.3) {
        const travel = Math.min(1.4 / 30, d - 1.3);
        const nx = { x: p.x + dx / d * travel, y: 0, z: p.z };
        if (!blocked(room, nx)) p.x = nx.x;
        const nz = { x: p.x, y: 0, z: p.z + dz / d * travel };
        if (!blocked(room, nz)) p.z = nz.z;
      } else if (tick >= state.guardianNextAttackTick) {
        damage(room, target, guardian.attackDamage, GUARDIAN_ID, tick, events);
        state.guardianNextAttackTick = tick + 45;
      }
    }
  }
  if (state.nextRuneIndex === RUNES.length && state.guardianSpawned && !alive(guardian)) {
    state.stage = 'CLEARED';
    state.completedAtTick = tick;
    state.warning = null;
    room.revision += 1;
    events.push({ type: 'floor4:clear', tick });
  }
  return events;
}

function floorFourComplete(room) { return room.floorFour?.stage === 'CLEARED'; }
function publicFloorFour(room) {
  const state = room.floorFour;
  if (!state) return null;
  return { stage: state.stage, nextRuneIndex: state.nextRuneIndex,
    runes: RUNES.map((position, index) => ({ index, position: { ...position },
      solved: index < state.nextRuneIndex })),
    guardianEnemyId: state.guardianSpawned ? GUARDIAN_ID : null,
    warning: state.warning ? structuredClone(state.warning) : null,
    completedAtTick: state.completedAtTick };
}

module.exports = { RUNES, GUARDIAN_ID, WARNING_TICKS, startFloorFour, stepFloorFour,
  floorFourComplete, publicFloorFour };
