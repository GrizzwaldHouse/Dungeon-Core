// floor-five.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Catch repeated Warden summons, unsafe spawns, and damage to disconnected explorers.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { WARDEN_ID, MAX_LIVE_MINIONS, startFloorFive, stepFloorFive,
  floorFiveComplete, publicFloorFive } = require('../server/floor-five');

function fixture() {
  const player = { playerId: 'p1', connection: 'CONNECTED',
    transform: { position: { x: 0, y: 0, z: 0 } }, health: { current: 100, max: 100 } };
  return { room: { phase: 'RUNNING', revision: 0, run: { threatStacks: 0 },
    world: { bounds: { min: { x: -10, z: -10 }, max: { x: 10, z: 10 } } },
    obstacles: [], revealedNodeIds: new Set(), players: new Map([['p1', player]]), enemies: new Map() }, player };
}

test('Warden starts once and warns exactly 45 ticks before area damage', () => {
  const { room, player } = fixture();
  assert.deepEqual(startFloorFive(room, 0).map((event) => event.type), ['floor5:spawn']);
  assert.deepEqual(startFloorFive(room, 0), []);
  assert.equal(room.enemies.get(WARDEN_ID).kind, 'SHIFTING_CORE_WARDEN');
  assert.deepEqual(stepFloorFive(room, 45).map((event) => event.type), ['floor5:warning']);
  assert.equal(publicFloorFive(room).warning.endsAtTick, 90);
  assert.deepEqual(stepFloorFive(room, 45), []);
  assert.equal(stepFloorFive(room, 89).length, 0);
  const hits = stepFloorFive(room, 90).filter((event) => event.type === 'floor5:damage');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].amount, 16);
  assert.equal(player.health.current, 84);
  assert.deepEqual(stepFloorFive(room, 90), []);
});

test('health gates change phase once and minions remain bounded', () => {
  const { room } = fixture();
  startFloorFive(room, 0);
  const boss = room.enemies.get(WARDEN_ID);
  boss.health.current = Math.floor(boss.health.max * 0.7);
  let events = stepFloorFive(room, 1);
  assert.equal(events.filter((event) => event.type === 'floor5:phase' && event.stage === 'PHASE_TWO').length, 1);
  assert.equal(events.filter((event) => event.type === 'floor5:spawn' && event.kind === 'SHARDLING').length, 2);
  boss.health.current = Math.floor(boss.health.max * 0.35);
  events = stepFloorFive(room, 2);
  assert.equal(events.filter((event) => event.type === 'floor5:phase' && event.stage === 'PHASE_THREE').length, 1);
  assert.equal(events.filter((event) => event.type === 'floor5:spawn' && event.kind === 'SHARDLING').length, 2);
  assert.equal([...room.enemies.values()].filter((enemy) => enemy.kind === 'SHARDLING' && enemy.health.current > 0).length,
    MAX_LIVE_MINIONS);
  assert.equal(stepFloorFive(room, 3).filter((event) => event.type === 'floor5:spawn').length, 0);
  boss.health.current = 0;
  assert.equal(floorFiveComplete(room), false);
  stepFloorFive(room, 4);
  assert.equal(publicFloorFive(room).stage, 'CLEANUP');
  for (const enemy of room.enemies.values()) if (enemy.kind === 'SHARDLING') enemy.health.current = 0;
  assert.deepEqual(stepFloorFive(room, 5).map((event) => event.type), ['floor5:clear']);
  assert.equal(floorFiveComplete(room), true);
  assert.deepEqual(stepFloorFive(room, 6), []);
});

test('lethal strike skips obsolete summons and a disconnected player is not hit', () => {
  const { room, player } = fixture();
  startFloorFive(room, 0);
  stepFloorFive(room, 45);
  player.connection = 'DISCONNECTED';
  assert.equal(stepFloorFive(room, 90).filter((event) => event.type === 'floor5:damage').length, 0);
  assert.equal(player.health.current, 100);
  room.enemies.get(WARDEN_ID).health.current = 0;
  assert.deepEqual(stepFloorFive(room, 91).map((event) => event.type), ['floor5:clear']);
  assert.equal(room.floorFive.minionsSpawned, 0);
});

test('new spawns use bounded threat and fully obstructed arena fails before start', () => {
  const { room } = fixture();
  room.run.threatStacks = 5;
  startFloorFive(room, 0);
  assert.equal(room.enemies.get(WARDEN_ID).health.max, 375);
  room.enemies.get(WARDEN_ID).health.current = 0;
  const second = fixture().room;
  second.obstacles.push({ min: { x: -10, y: -1, z: -10 }, max: { x: 10, y: 2, z: 10 } });
  assert.throws(() => startFloorFive(second, 0), /No safe Warden spawn/);
  assert.equal(second.floorFive, undefined);
  assert.equal(second.enemies.size, 0);
});
