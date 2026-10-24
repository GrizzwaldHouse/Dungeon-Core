// floor-two.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Catch duplicate boss phases, unsafe spawns, and disconnect damage in the second-floor encounter.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { KEEPER_ID, HEXER_ID, MAX_LIVE_MINIONS, startFloorTwo, stepFloorTwo,
  floorTwoComplete, publicFloorTwo } = require('../server/floor-two');

function roomFixture() {
  return {
    phase: 'RUNNING', revision: 0, run: { threatStacks: 0 },
    world: { bounds: { min: { x: -10, y: -2, z: -10 }, max: { x: 10, y: 8, z: 10 } } },
    obstacles: [], revealedNodeIds: new Set(), enemies: new Map(),
    players: new Map([['a', { playerId: 'a', connection: 'CONNECTED',
      transform: { position: { x: 0, y: 0, z: 0 } }, health: { current: 100, max: 100 } }],
    ['b', { playerId: 'b', connection: 'CONNECTED',
      transform: { position: { x: 4, y: 0, z: 0 } }, health: { current: 100, max: 100 } }]])
  };
}

test('keeper starts once, telegraphs 45 ticks, charges, and never replays a tick', () => {
  const room = roomFixture();
  assert.deepEqual(startFloorTwo(room, 0).map((event) => event.type), ['floor2:spawn']);
  assert.deepEqual(startFloorTwo(room, 0), []);
  assert.equal(room.enemies.size, 1);
  assert.equal(room.enemies.get(KEEPER_ID).kind, 'THRESHOLD_KEEPER');
  assert.deepEqual(stepFloorTwo(room, 45).map((event) => event.type), ['floor2:warning']);
  assert.equal(publicFloorTwo(room).warning.endsAtTick, 90);
  assert.deepEqual(stepFloorTwo(room, 45), []);
  assert.equal(stepFloorTwo(room, 89).length, 0);
  const events = stepFloorTwo(room, 90);
  assert.ok(events.some((event) => event.type === 'floor2:charge'));
  assert.ok(events.some((event) => event.type === 'floor2:damage' && event.playerId === 'a'));
  assert.equal(room.players.get('a').health.current, 86);
  assert.equal(publicFloorTwo(room).warning, null);
  assert.deepEqual(stepFloorTwo(room, 90), []);
  assert.equal(room.players.get('a').health.current, 86);
});

test('disconnected players are never selected or damaged by a pending warning', () => {
  const room = roomFixture();
  startFloorTwo(room, 0);
  stepFloorTwo(room, 45);
  room.players.get('a').connection = 'DISCONNECTED_GRACE';
  room.players.get('b').connection = 'DISCONNECTED_GRACE';
  const events = stepFloorTwo(room, 90);
  assert.equal(events.filter((event) => event.type === 'floor2:damage').length, 0);
  assert.equal(room.players.get('a').health.current, 100);
  assert.equal(room.players.get('b').health.current, 100);
});

test('keeper charge stops at an obstacle before reaching the warned player', () => {
  const room = roomFixture();
  room.obstacles = [{ min: { x: -1, y: -1, z: 3.8 }, max: { x: 1, y: 2, z: 4.2 } }];
  startFloorTwo(room, 0);
  stepFloorTwo(room, 45);
  const events = stepFloorTwo(room, 90);
  assert.ok(events.some((event) => event.type === 'floor2:charge'));
  assert.equal(events.some((event) => event.type === 'floor2:damage' && event.playerId === 'a'), false);
  assert.ok(room.enemies.get(KEEPER_ID).transform.position.z > 4.2);
});

test('the two sequential bosses and bounded summon thresholds resolve once', () => {
  const room = roomFixture();
  startFloorTwo(room, 0);
  room.enemies.get(KEEPER_ID).health.current = 0;
  const handoff = stepFloorTwo(room, 1);
  assert.ok(handoff.some((event) => event.type === 'floor2:stage' && event.stage === 'HEXER'));
  assert.equal(room.enemies.get(HEXER_ID).kind, 'MIRROR_HEXER');
  assert.equal(publicFloorTwo(room).stage, 'HEXER');
  assert.deepEqual(stepFloorTwo(room, 1), []);

  const boss = room.enemies.get(HEXER_ID);
  boss.health.current = Math.floor(boss.health.max * 0.7);
  let events = stepFloorTwo(room, 2);
  assert.equal(events.filter((event) => event.type === 'floor2:spawn' && event.kind === 'SHARDLING').length, 2);
  assert.equal(stepFloorTwo(room, 3).filter((event) => event.type === 'floor2:spawn').length, 0);
  boss.health.current = Math.floor(boss.health.max * 0.35);
  events = stepFloorTwo(room, 4);
  assert.equal(events.filter((event) => event.type === 'floor2:spawn' && event.kind === 'SHARDLING').length, 2);
  assert.equal([...room.enemies.values()].filter((enemy) => enemy.kind === 'SHARDLING' && enemy.health.current > 0).length,
    MAX_LIVE_MINIONS);
  boss.health.current = 0;
  assert.equal(floorTwoComplete(room), false);
  stepFloorTwo(room, 5);
  assert.equal(publicFloorTwo(room).stage, 'CLEANUP');
  for (const enemy of room.enemies.values()) if (enemy.kind === 'SHARDLING') enemy.health.current = 0;
  events = stepFloorTwo(room, 6);
  assert.deepEqual(events.map((event) => event.type), ['floor2:clear']);
  assert.equal(floorTwoComplete(room), true);
  assert.deepEqual(stepFloorTwo(room, 7), []);
});

test('a lethal hit skips obsolete summons and clears without duplicate victory', () => {
  const room = roomFixture();
  startFloorTwo(room, 0);
  room.enemies.get(KEEPER_ID).health.current = 0;
  stepFloorTwo(room, 1);
  room.enemies.get(HEXER_ID).health.current = 0;
  const events = stepFloorTwo(room, 2);
  assert.deepEqual(events.map((event) => event.type), ['floor2:clear']);
  assert.equal(room.floorTwo.minionsSpawned, 0);
  assert.deepEqual(stepFloorTwo(room, 3), []);
});

test('Hexer blast uses its warned position and only resolves once', () => {
  const room = roomFixture();
  startFloorTwo(room, 0);
  room.enemies.get(KEEPER_ID).health.current = 0;
  stepFloorTwo(room, 1);
  const warningEvents = stepFloorTwo(room, 46);
  assert.ok(warningEvents.some((event) => event.type === 'floor2:warning'));
  room.players.get('a').transform.position.x = 6;
  const damageEvents = stepFloorTwo(room, 91);
  assert.equal(damageEvents.some((event) => event.type === 'floor2:damage' && event.playerId === 'a'), false);
  assert.deepEqual(stepFloorTwo(room, 91), []);
});

test('start fails before mutation if the world has no safe boss spawn', () => {
  const room = roomFixture();
  room.obstacles = [{ min: { x: -10, y: -2, z: -10 }, max: { x: 10, y: 4, z: 10 } }];
  assert.throws(() => startFloorTwo(room, 0), /No safe floor-two boss spawn/);
  assert.equal(room.floorTwo, undefined);
  assert.equal(room.enemies.size, 0);
});

test('down threat scales only future spawns and a failed room stops its encounter', () => {
  const room = roomFixture();
  startFloorTwo(room, 0);
  const keeper = room.enemies.get(KEEPER_ID);
  assert.equal(keeper.health.max, 160);
  room.run.threatStacks = 5;
  keeper.health.current = 0;
  stepFloorTwo(room, 1);
  const hexer = room.enemies.get(HEXER_ID);
  assert.equal(hexer.health.max, 225);
  assert.equal(hexer.attackDamage, 14);
  assert.equal(keeper.health.max, 160);
  hexer.health.current = Math.floor(hexer.health.max * 0.7);
  stepFloorTwo(room, 2);
  const minions = [...room.enemies.values()].filter((enemy) => enemy.kind === 'SHARDLING');
  assert.equal(minions.length, 2);
  assert.ok(minions.every((enemy) => enemy.health.max === 44 && enemy.attackDamage === 7));
  room.phase = 'FAILED';
  assert.deepEqual(stepFloorTwo(room, 50), []);
  assert.equal(publicFloorTwo(room).warning, null);
});
