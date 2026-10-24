// game-parameters.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Centralize validated gameplay and network tuning so rooms use consistent bounds.

'use strict';

const { world: DEFAULT_WORLD } = require('../../shared/dungeon-layout');

// Distance uses world meters; time uses milliseconds unless named Hz.
// Percentages use basis points; XP uses integer points.
const TICK_HZ = 30;
const TICK_MS = 1000 / TICK_HZ;

const GAME_PARAMETERS = Object.freeze({
  network: Object.freeze({
    tickHz: TICK_HZ,
    host: '0.0.0.0',
    port: 3000,
    minPlayers: 2,
    maxPlayers: 6,
    inputRatePerSecond: 45,
    maxInputMagnitude: 1,
    maxPayloadBytes: 2048,
    maxDisplayNameLength: 20,
    disconnectGraceMs: 30_000,
    roomCodeTtlMs: 20 * 60_000,
    lobbyEmptyTtlMs: 60_000,
    completedRoomTtlMs: 2 * 60_000,
    metricSampleLimit: 600
  }),
  player: Object.freeze({
    maxHealth: 100,
    moveSpeedMetersPerSecond: 5,
    collisionRadiusMeters: 0.35
  }),
  combat: Object.freeze({
    enemyMaxHealth: 100,
    enemySpeedMetersPerSecond: 1.4,
    enemyAggroRadiusMeters: 5,
    enemyAttackRangeMeters: 1.35,
    enemyAttackDamage: 6,
    enemyAttackCooldownMs: 1200,
    enemyCollisionRadiusMeters: 0.45,
    playerAttackRangeMeters: 2.3,
    playerAttackDamage: 20,
    playerAttackCooldownMs: 450
  }),
  discovery: Object.freeze({
    maxNodesPerPlayer: 512,
    interactionPaddingMeters: 0.75,
    requiredExplorationBasisPoints: 5000
  }),
  antiRush: Object.freeze({
    maximumPenaltyTier: 3,
    maximumEnemyMultiplierBasisPoints: 25000,
    maximumDurationTicks: TICK_HZ * 60
  }),
  portal: Object.freeze({
    partyTransitionPolicy: 'ATOMIC_PARTY',
    routeWeights: Object.freeze({ combat: 40, puzzle: 25, trap: 15, hidden: 10, rest: 10 })
  }),
  progression: Object.freeze({
    baseFloorXp: 100,
    contributionBonusPoolXp: 60,
    damageWeightBasisPoints: 4000,
    portalWeightBasisPoints: 2500,
    trapWeightBasisPoints: 1500,
    supportWeightBasisPoints: 2000
  }),
  world: Object.freeze({
    bounds: DEFAULT_WORLD.bounds,
    obstacles: DEFAULT_WORLD.obstacles,
    discoveryNodes: DEFAULT_WORLD.discoveryNodes,
    spaces: DEFAULT_WORLD.spaces
  })
});

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function assertInteger(name, value, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function assertNumber(name, value, min, max) {
  if (!finiteNumber(value) || value < min || value > max) {
    throw new RangeError(`${name} must be a finite number between ${min} and ${max}`);
  }
  return value;
}

function assertString(name, value, maxLength = 2048) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    throw new TypeError(`${name} must be a non-empty string up to ${maxLength} characters`);
  }
  return value;
}

function validAabb(box) {
  return isRecord(box) && isRecord(box.min) && isRecord(box.max) &&
    ['x', 'y', 'z'].every((axis) => finiteNumber(box.min[axis]) && finiteNumber(box.max[axis]) && box.min[axis] <= box.max[axis]);
}

// Why: One geometry validator keeps each visible room variant aligned with server collision rules.
// Input: A trusted project layout or an untrusted runtime override with finite AABBs.
// Output: A cloned geometry record, or a validation error before the server starts.
function normalizeGeometry(world) {
  if (!isRecord(world) || !validAabb(world.bounds)) {
    throw new TypeError('world.bounds must be an AABB with finite min/max x, y, and z');
  }
  const obstacles = world.obstacles === undefined ? [] : world.obstacles;
  const discoveryNodes = world.discoveryNodes === undefined ? [] : world.discoveryNodes;
  if (!Array.isArray(discoveryNodes) || discoveryNodes.some((node) => !isRecord(node) || typeof node.id !== 'string' || node.id.length === 0 || !validAabb(node.bounds))) {
    throw new TypeError('world.discoveryNodes must contain non-empty id and AABB bounds');
  }
  if (!Array.isArray(obstacles) || obstacles.some((box) => !validAabb(box) ||
    (box.revealNodeId !== undefined && (typeof box.revealNodeId !== 'string' || !discoveryNodes.some((node) => node.id === box.revealNodeId))))) {
    throw new TypeError('world.obstacles must be an array of valid AABBs and reference known reveal nodes');
  }
  return {
    bounds: structuredClone(world.bounds),
    obstacles: obstacles.map((box) => structuredClone(box)),
    discoveryNodes: discoveryNodes.map((node) => ({ id: node.id, bounds: structuredClone(node.bounds) }))
  };
}

function normalizeWorld(world) {
  const base = normalizeGeometry(world);
  const spaces = world.spaces === undefined ? {} : world.spaces;
  if (!isRecord(spaces) || Object.keys(spaces).some((id) => !/^[a-z0-9-]{1,40}$/.test(id))) {
    throw new TypeError('world.spaces must map valid space IDs to geometry');
  }
  base.spaces = Object.fromEntries(Object.entries(spaces).map(([id, geometry]) => [id, normalizeGeometry(geometry)]));
  return base;
}

// Why: Prevent invalid runtime overrides from destabilizing the server tick.
// Input: Untrusted override record; values must satisfy each configured bound.
// Output: Flat validated configuration or a thrown validation error.
function createServerConfig(overrides = {}) {
  if (!isRecord(overrides)) throw new TypeError('Server options must be an object');
  const network = GAME_PARAMETERS.network;
  const player = GAME_PARAMETERS.player;
  const discovery = GAME_PARAMETERS.discovery;
  const antiRush = GAME_PARAMETERS.antiRush;
  const combat = GAME_PARAMETERS.combat;
  const maxPlayers = assertInteger('maxPlayers', overrides.maxPlayers ?? network.maxPlayers, 2, network.maxPlayers);
  const minPlayers = assertInteger('minPlayers', overrides.minPlayers ?? network.minPlayers, 2, maxPlayers);

  return Object.freeze({
    host: assertString('host', overrides.host ?? network.host, 255),
    port: assertInteger('port', overrides.port ?? (process.env.PORT === undefined ? network.port : Number(process.env.PORT)), 0, 65535),
    minPlayers,
    maxPlayers,
    tickHz: TICK_HZ,
    tickMs: TICK_MS,
    playerSpeed: assertNumber('playerSpeed', overrides.playerSpeed ?? player.moveSpeedMetersPerSecond, 0.01, 100),
    playerRadius: assertNumber('playerRadius', overrides.playerRadius ?? player.collisionRadiusMeters, 0.01, 10),
    maxHealth: assertNumber('maxHealth', overrides.maxHealth ?? player.maxHealth, 1, 1_000_000),
    combat,
    maxInputMagnitude: assertNumber('maxInputMagnitude', overrides.maxInputMagnitude ?? network.maxInputMagnitude, 0.01, 1),
    inputRatePerSecond: assertInteger('inputRatePerSecond', overrides.inputRatePerSecond ?? network.inputRatePerSecond, 1, 120),
    maxPayloadBytes: assertInteger('maxPayloadBytes', overrides.maxPayloadBytes ?? network.maxPayloadBytes, 256, 64 * 1024),
    maxDisplayNameLength: assertInteger('maxDisplayNameLength', overrides.maxDisplayNameLength ?? network.maxDisplayNameLength, 1, 100),
    maxDiscoveredNodes: assertInteger('maxDiscoveredNodes', overrides.maxDiscoveredNodes ?? discovery.maxNodesPerPlayer, 1, 10_000),
    requiredExplorationBasisPoints: assertInteger('requiredExplorationBasisPoints',
      overrides.requiredExplorationBasisPoints ?? discovery.requiredExplorationBasisPoints, 0, 10000),
    maximumPenaltyTier: assertInteger('maximumPenaltyTier',
      overrides.maximumPenaltyTier ?? antiRush.maximumPenaltyTier, 1, 10),
    maximumRushDurationTicks: assertInteger('maximumRushDurationTicks',
      overrides.maximumRushDurationTicks ?? antiRush.maximumDurationTicks, 1, 30 * 60 * 60),
    disconnectGraceMs: assertInteger('disconnectGraceMs', overrides.disconnectGraceMs ?? network.disconnectGraceMs, 1_000, 10 * 60_000),
    roomCodeTtlMs: assertInteger('roomCodeTtlMs', overrides.roomCodeTtlMs ?? network.roomCodeTtlMs, 10_000, 24 * 60 * 60_000),
    lobbyEmptyTtlMs: assertInteger('lobbyEmptyTtlMs', overrides.lobbyEmptyTtlMs ?? network.lobbyEmptyTtlMs, 1_000, 60 * 60_000),
    completedRoomTtlMs: assertInteger('completedRoomTtlMs', overrides.completedRoomTtlMs ?? network.completedRoomTtlMs, 1_000, 24 * 60 * 60_000),
    metricSampleLimit: assertInteger('metricSampleLimit', overrides.metricSampleLimit ?? network.metricSampleLimit, 30, 10_000),
    corsOrigin: overrides.corsOrigin ?? process.env.CORS_ORIGIN ?? '*',
    world: normalizeWorld(overrides.world ?? GAME_PARAMETERS.world)
  });
}

module.exports = { GAME_PARAMETERS, TICK_HZ, TICK_MS, createServerConfig };
