// dungeon-run.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Keep floor routing, trap timing, and group rewards deterministic and server owned.

'use strict';

const crypto = require('node:crypto');
const { GAME_PARAMETERS } = require('./config/game-parameters');

const ACTION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const TRAP_WARNING_TICKS = 45;
const TRAP_ACTIVE_TICKS = 30;
const TRAP_DAMAGE = 12;
const RUSH_DURATION_TICKS = 300;
const RUSH_DAMAGE_BASIS_POINTS = 15000;

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

function portalPosition(world, side) {
  const min = world.bounds.min;
  const max = world.bounds.max;
  const x = clamp(0, min.x + 0.5, max.x - 0.5);
  const depth = max.z - min.z;
  const z = side === 'entry' ? min.z + depth * 0.3 : max.z - depth * 0.3;
  return { x, y: 0, z };
}

function createRun(world, tick) {
  const seed = crypto.randomBytes(32).toString('hex');
  return {
    runId: crypto.randomUUID(),
    seed,
    floorIndex: 1,
    level: 1,
    cycle: 1,
    threatStacks: 0,
    bankedRiches: 0,
    floorAwards: {},
    metricBaselines: {},
    stage: 'FLOOR_ONE',
    currentSpaceId: 'entry',
    spaceRevision: 0,
    entryPortal: { id: 'shift-gate', position: portalPosition(world, 'entry'), radius: 1.4 },
    exitPortal: { id: 'floor-exit', position: portalPosition(world, 'exit'), radius: 1.4 },
    trap: null,
    awarded: false,
    awards: null,
    startedAtTick: tick
  };
}

function currentPortal(run) {
  if (run.stage === 'REST') return run.restPortal;
  return run.stage === 'FLOOR_ONE' && run.currentSpaceId === 'entry' ? run.entryPortal : run.exitPortal;
}

function routeDestination(run) {
  const digest = crypto.createHash('sha256').update(run.seed).update(':shift-gate').digest();
  return digest[0] % 2 === 0 ? 'amber-vault' : 'violet-vault';
}

function requiredObjectiveComplete(room) {
  if (room.run?.stage === 'REST') return true;
  if (room.run?.stage === 'FLOOR_TWO') return room.floorTwo?.stage === 'CLEARED';
  if (room.run?.stage === 'FLOOR_THREE') return room.floorThree?.phase === 'REST_AVAILABLE' ||
    room.floorThree?.phase === 'RESTING';
  if (room.run?.stage === 'FLOOR_FOUR') return room.floorFour?.stage === 'CLEARED';
  if (room.run?.stage === 'FLOOR_FIVE') return room.floorFive?.stage === 'CLEARED';
  return [...room.enemies.values()].some((enemy) => enemy.kind === 'SENTINEL' && enemy.health.current <= 0);
}

function explorationBasisPoints(room) {
  return (requiredObjectiveComplete(room) ? 5000 : 0) + (room.revealedNodeIds.size > 0 ? 5000 : 0);
}

function publicRun(room) {
  const run = room.run;
  if (!run) return { floor: null, space: null, portals: [], trap: null };
  const portal = currentPortal(run);
  return {
    floor: {
      index: run.floorIndex,
      level: run.level,
      cycle: run.cycle,
      threatStacks: run.threatStacks,
      bankedRiches: run.bankedRiches,
      phase: room.phase === 'COMPLETED' ? 'COMPLETED' : room.phase === 'FAILED' ? 'FAILED' : run.stage,
      explorationBasisPoints: explorationBasisPoints(room),
      requiredObjectives: { sentinelDefeated: run.stage === 'FLOOR_ONE' && requiredObjectiveComplete(room),
        encounterComplete: requiredObjectiveComplete(room) },
      awards: run.awards
    },
    space: { id: run.currentSpaceId, kind: run.stage === 'REST' ? 'REST' :
      run.stage === 'FLOOR_TWO' || run.stage === 'FLOOR_FIVE' ? 'BOSS' :
        run.stage === 'FLOOR_THREE' ? 'GATHERING' : run.stage === 'FLOOR_FOUR' ? 'TRIAL' :
        run.currentSpaceId === 'entry' ? 'ENTRY' : 'TRAP_VAULT', revision: run.spaceRevision },
    portals: [{ id: portal.id, state: portal.id === 'floor-exit' &&
      (!requiredObjectiveComplete(room) || (run.stage === 'FLOOR_ONE' && run.trap?.state !== 'CLEARED')) ? 'SEALED' : 'AVAILABLE',
      position: { ...portal.position }, interactionRadius: portal.radius }],
    trap: run.trap ? { id: run.trap.id, state: run.trap.state, position: { ...run.trap.position }, radius: run.trap.radius,
      telegraphEndsAtTick: run.trap.telegraphEndsAtTick, clearsAtTick: run.trap.clearsAtTick,
      disarmedBy: run.trap.disarmedBy } : null
  };
}

// Why: Tie the bonus to recorded cooperative actions without subtracting equal base XP.
// Input: Trusted room player records, progression settings, and the private run ID.
// Output: Frozen-by-convention public award summary with integer XP and deterministic ties.
// Watch Out: Bots and removed players receive no award; disconnected grace members do.
function calculateAwards(room) {
  const tuning = GAME_PARAMETERS.progression;
  const eligible = [...room.players.values()]
    .filter((player) => player.connection !== 'BOT' && player.connection !== 'REMOVED')
    .sort((a, b) => a.playerId.localeCompare(b.playerId));
  const points = new Map();
  for (const player of eligible) {
    const baseline = room.run.metricBaselines[player.playerId] || {};
    const damage = Math.min(Math.max(0, player.metrics.damageDealt - (baseline.damageDealt || 0)),
      GAME_PARAMETERS.combat.enemyMaxHealth);
    points.set(player.playerId,
      Math.round(damage * tuning.damageWeightBasisPoints / GAME_PARAMETERS.combat.enemyMaxHealth) +
      Math.max(0, player.metrics.portalsSolved - (baseline.portalsSolved || 0)) * tuning.portalWeightBasisPoints +
      Math.max(0, player.metrics.trapsDisarmed - (baseline.trapsDisarmed || 0)) * tuning.trapWeightBasisPoints +
      Math.max(0, player.metrics.supportActions - (baseline.supportActions || 0)) * tuning.supportWeightBasisPoints);
  }
  const totalPoints = [...points.values()].reduce((sum, value) => sum + value, 0);
  const bonuses = new Map(eligible.map((player) => [player.playerId, 0]));
  if (totalPoints > 0) {
    let remaining = tuning.contributionBonusPoolXp;
    const remainders = [];
    for (const player of eligible) {
      const numerator = tuning.contributionBonusPoolXp * points.get(player.playerId);
      const whole = Math.floor(numerator / totalPoints);
      bonuses.set(player.playerId, whole);
      remaining -= whole;
      remainders.push({ playerId: player.playerId, remainder: numerator % totalPoints });
    }
    remainders.sort((a, b) => b.remainder - a.remainder || a.playerId.localeCompare(b.playerId));
    for (let index = 0; index < remaining; index += 1) bonuses.set(remainders[index].playerId, bonuses.get(remainders[index].playerId) + 1);
  }
  const byPlayer = {};
  for (const player of eligible) {
    const bonusXp = bonuses.get(player.playerId);
    const baseXp = tuning.baseFloorXp;
    player.xp.base += baseXp;
    player.xp.bonus += bonusXp;
    player.xp.total += baseXp + bonusXp;
    byPlayer[player.playerId] = {
      awardId: `${room.run.runId}:${room.run.floorIndex}:${player.playerId}`,
      baseXp, bonusXp, totalXp: player.xp.total
    };
  }
  return { floorIndex: room.run.floorIndex, baseXp: tuning.baseFloorXp,
    bonusPoolXp: tuning.contributionBonusPoolXp, byPlayer };
}

module.exports = {
  ACTION_ID_PATTERN,
  TRAP_WARNING_TICKS,
  TRAP_ACTIVE_TICKS,
  TRAP_DAMAGE,
  RUSH_DURATION_TICKS,
  RUSH_DAMAGE_BASIS_POINTS,
  createRun,
  currentPortal,
  routeDestination,
  requiredObjectiveComplete,
  explorationBasisPoints,
  publicRun,
  calculateAwards
};
