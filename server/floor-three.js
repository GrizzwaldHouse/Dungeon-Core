// floor-three.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Make the resource floor finite and replay safe without giving clients authority over spawns or loot.

'use strict';

const MAX_PLAYERS = 6;
const MAX_WAVES = 2;
const WAVE_GAP_TICKS = 45;
const WAVE_SIZES = Object.freeze([2, 3]);
const RESOURCE_NODES = Object.freeze({
  'supply-cache': Object.freeze({ reward: Object.freeze({ kind: 'HEALING_CHARGE', quantity: 1 }), optional: false }),
  'forgotten-cache': Object.freeze({ reward: Object.freeze({ kind: 'RICHES', quantity: 10 }), optional: true })
});
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function validId(value) { return typeof value === 'string' && ID_PATTERN.test(value); }

function uniqueIds(values, label, limit = 64) {
  if (!Array.isArray(values) || values.length > limit || values.some((value) => !validId(value))) {
    throw new TypeError(`${label} must be an array of valid IDs`);
  }
  return [...new Set(values)];
}

function copyState(state) { return structuredClone(state); }

function actionKey(playerId, actionId) { return `${playerId}:${actionId}`; }

// Why: A fixed encounter budget prevents reconnects and idle ticks from creating new XP or loot sources.
// Input: Trusted room tick and socket-bound human player IDs (at most six).
// Output: Serializable private state; the caller stores one copy per game room.
function createFloorThreeState({ tick, playerIds }) {
  if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError('tick must be a non-negative integer');
  const eligiblePlayerIds = uniqueIds(playerIds, 'playerIds', MAX_PLAYERS);
  return {
    version: 1,
    phase: 'COMBAT',
    startedAtTick: tick,
    lastProcessedTick: tick - 1,
    waveIndex: 0,
    nextWaveAtTick: tick,
    activeMobIds: [],
    defeatedMobIds: [],
    eligiblePlayerIds,
    discoveredNodeIds: [],
    claimsByNode: { 'supply-cache': {}, 'forgotten-cache': {} },
    actionReceipts: {},
    rest: { unlockedAtTick: null, enteredAtTick: null, enteredBy: null }
  };
}

// Why: Only trusted defeat reports advance waves; a second call at the same tick cannot emit duplicate spawns.
// Input: Existing private state and authoritative tick, active human IDs, defeated enemy IDs, and discoveries.
// Output: A new state and zero or more event descriptors; no Socket.IO or inventory side effects.
// Watch Out: The caller must create enemies for MOB_SPAWN descriptors and report their defeats back by ID.
function stepFloorThree(state, { tick, activePlayerIds, defeatedMobIds = [], discoveredNodeIds = [], threatStacks = 0 }) {
  if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError('tick must be a non-negative integer');
  if (!Number.isSafeInteger(threatStacks) || threatStacks < 0 || threatStacks > 5) {
    throw new RangeError('threatStacks must be an integer between 0 and 5');
  }
  const active = uniqueIds(activePlayerIds, 'activePlayerIds', MAX_PLAYERS);
  const defeated = uniqueIds(defeatedMobIds, 'defeatedMobIds');
  const discovered = uniqueIds(discoveredNodeIds, 'discoveredNodeIds');
  if (tick <= state.lastProcessedTick) return { state, events: [] };
  const next = copyState(state);
  next.lastProcessedTick = tick;
  const events = [];

  // Existing rights survive disconnect; a late human join can receive a claim without resetting old ones.
  for (const playerId of active) {
    if (!next.eligiblePlayerIds.includes(playerId) && next.eligiblePlayerIds.length < MAX_PLAYERS) {
      next.eligiblePlayerIds.push(playerId);
    }
  }
  for (const nodeId of discovered) {
    if (RESOURCE_NODES[nodeId] && !next.discoveredNodeIds.includes(nodeId)) next.discoveredNodeIds.push(nodeId);
  }
  if (next.phase !== 'COMBAT') return { state: next, events };

  for (const enemyId of defeated) {
    const index = next.activeMobIds.indexOf(enemyId);
    if (index === -1) continue;
    next.activeMobIds.splice(index, 1);
    next.defeatedMobIds.push(enemyId);
    events.push({ type: 'MOB_DEFEATED', enemyId });
  }
  if (next.activeMobIds.length > 0) return { state: next, events };
  if (next.waveIndex === MAX_WAVES) {
    next.phase = 'REST_AVAILABLE';
    next.rest.unlockedAtTick = tick;
    events.push({ type: 'REST_UNLOCKED', tick });
    return { state: next, events };
  }
  if (next.waveIndex > 0 && next.nextWaveAtTick === null) next.nextWaveAtTick = tick + WAVE_GAP_TICKS;
  if (active.length === 0 || tick < next.nextWaveAtTick) return { state: next, events };

  next.waveIndex += 1;
  next.nextWaveAtTick = null;
  for (let slot = 0; slot < WAVE_SIZES[next.waveIndex - 1]; slot += 1) {
    const enemyId = `f3-w${next.waveIndex}-m${slot + 1}`;
    next.activeMobIds.push(enemyId);
    events.push({ type: 'MOB_SPAWN', enemyId, kind: 'FLOOR_THREE_MOB', wave: next.waveIndex, spawnSlot: slot,
      healthMultiplierBasisPoints: 10000 + 500 * threatStacks,
      damageMultiplierBasisPoints: 10000 + 500 * threatStacks });
  }
  return { state: next, events };
}

// Why: A cache is shared in space but each eligible human receives a personal, finite claim.
// Input: State plus a server-validated player, nearby node, and untrusted action ID already syntax checked here.
// Output: New state, authoritative reward descriptor, and event; failure does not mutate state.
// Watch Out: The integrator must validate range and inventory capacity, then commit this returned state and reward atomically.
function claimFloorThreeResource(state, { playerId, nodeId, actionId }) {
  if (!validId(playerId) || !validId(nodeId) || !validId(actionId)) {
    return { state, result: { ok: false, error: 'INVALID_ACTION' }, events: [] };
  }
  const key = actionKey(playerId, actionId);
  const prior = state.actionReceipts[key];
  if (prior) {
    return { state, result: prior.nodeId === nodeId ? { ...prior.result } :
      { ok: false, error: 'ACTION_ID_REUSED' }, events: [] };
  }
  const node = RESOURCE_NODES[nodeId];
  if (!node) return { state, result: { ok: false, error: 'NODE_NOT_FOUND' }, events: [] };
  if (!state.eligiblePlayerIds.includes(playerId)) {
    return { state, result: { ok: false, error: 'NOT_ELIGIBLE' }, events: [] };
  }
  if (state.phase === 'COMBAT' && state.waveIndex === 0) {
    return { state, result: { ok: false, error: 'NODE_LOCKED' }, events: [] };
  }
  if (node.optional && !state.discoveredNodeIds.includes(nodeId)) {
    return { state, result: { ok: false, error: 'NODE_HIDDEN' }, events: [] };
  }
  if (state.claimsByNode[nodeId][playerId]) {
    return { state, result: { ok: false, error: 'ALREADY_CLAIMED' }, events: [] };
  }
  const next = copyState(state);
  const reward = { ...node.reward };
  const result = { ok: true, playerId, nodeId, actionId, reward };
  next.claimsByNode[nodeId][playerId] = { actionId, reward };
  next.actionReceipts[key] = { nodeId, result };
  return { state: next, result, events: [{ type: 'RESOURCE_CLAIMED', playerId, nodeId, reward }] };
}

// Why: The party's safe pause is explicit so clearing mobs cannot silently skip the recovery space.
// Input: Trusted socket-bound player ID and untrusted action ID after range/health checks by the integrator.
// Output: A replay-safe rest entry outcome; only one entry event can occur per floor.
function enterFloorThreeRest(state, { playerId, actionId, tick }) {
  if (!validId(playerId) || !validId(actionId) || !Number.isSafeInteger(tick) || tick < 0) {
    return { state, result: { ok: false, error: 'INVALID_ACTION' }, events: [] };
  }
  const key = actionKey(playerId, actionId);
  const prior = state.actionReceipts[key];
  if (prior) return { state, result: prior.kind === 'REST' ? { ...prior.result } :
    { ok: false, error: 'ACTION_ID_REUSED' }, events: [] };
  if (!state.eligiblePlayerIds.includes(playerId)) {
    return { state, result: { ok: false, error: 'NOT_ELIGIBLE' }, events: [] };
  }
  if (state.phase === 'RESTING') return { state, result: { ok: false, error: 'REST_ALREADY_ENTERED' }, events: [] };
  if (state.phase !== 'REST_AVAILABLE') return { state, result: { ok: false, error: 'REST_LOCKED' }, events: [] };
  const next = copyState(state);
  next.phase = 'RESTING';
  next.rest.enteredAtTick = tick;
  next.rest.enteredBy = playerId;
  const result = { ok: true, playerId, actionId, tick };
  next.actionReceipts[key] = { kind: 'REST', result };
  return { state: next, result, events: [{ type: 'REST_ENTERED', playerId, tick }] };
}

function floorThreeComplete(state) { return state.phase === 'RESTING'; }

// Why: Network snapshots should not expose private action receipts or another player's claim identity.
// Input: Trusted floor-three state.
// Output: Small serializable progression view; personal rights are selected by recipient ID.
function publicFloorThree(state, playerId = null) {
  return {
    phase: state.phase,
    waveIndex: state.waveIndex,
    waveCount: MAX_WAVES,
    activeMobIds: [...state.activeMobIds],
    nextWaveAtTick: state.nextWaveAtTick,
    discoveredNodeIds: [...state.discoveredNodeIds],
    resources: Object.keys(RESOURCE_NODES).map((nodeId) => ({
      nodeId,
      optional: RESOURCE_NODES[nodeId].optional,
      available: state.waveIndex > 0 &&
        (!RESOURCE_NODES[nodeId].optional || state.discoveredNodeIds.includes(nodeId)),
      ...(playerId === null ? {} : { claimedByYou: Boolean(state.claimsByNode[nodeId][playerId]) })
    })),
    rest: { unlockedAtTick: state.rest.unlockedAtTick, enteredAtTick: state.rest.enteredAtTick },
    complete: floorThreeComplete(state)
  };
}

module.exports = { createFloorThreeState, stepFloorThree, claimFloorThreeResource,
  enterFloorThreeRest, floorThreeComplete, publicFloorThree };
