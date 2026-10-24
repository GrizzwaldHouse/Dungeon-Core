// floor-four.test.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Prove the ordered rune puzzle cannot skip its guardian or double resolve trap damage.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { GUARDIAN_ID, RUNES, startFloorFour, stepFloorFour,
  floorFourComplete, publicFloorFour } = require('../server/floor-four');

function fixture() {
  const player = { playerId: 'p1', connection: 'CONNECTED',
    transform: { position: { x: 0, y: 0, z: -8 } }, health: { current: 100, max: 100 } };
  return { room: { phase: 'RUNNING', revision: 0, run: { threatStacks: 0 },
    world: { bounds: { min: { x: -10, z: -10 }, max: { x: 10, z: 10 } } },
    obstacles: [], revealedNodeIds: new Set(), players: new Map([['p1', player]]), enemies: new Map() }, player };
}

test('ordered runes spawn one guardian and require its defeat', () => {
  const { room, player } = fixture();
  assert.equal(startFloorFour(room, 0).length, 1);
  assert.deepEqual(startFloorFour(room, 0), []);
  for (let i = 0; i < RUNES.length; i += 1) {
    player.transform.position = { ...RUNES[i] };
    const events = stepFloorFour(room, i + 1);
    assert.ok(events.some((event) => event.type === 'floor4:rune' && event.solvedIndex === i));
  }
  assert.equal(room.enemies.get(GUARDIAN_ID).kind, 'RUNE_GUARDIAN');
  assert.equal(publicFloorFour(room).nextRuneIndex, 3);
  assert.equal(floorFourComplete(room), false);
  room.enemies.get(GUARDIAN_ID).health.current = 0;
  assert.deepEqual(stepFloorFour(room, 4).map((event) => event.type), ['floor4:clear']);
  assert.equal(floorFourComplete(room), true);
  assert.deepEqual(stepFloorFour(room, 5), []);
});

test('wrong rune warns for 45 ticks and resolves damage only once at warned position', () => {
  const { room, player } = fixture();
  startFloorFour(room, 0);
  player.transform.position = { ...RUNES[1] };
  const events = stepFloorFour(room, 1);
  assert.equal(events.filter((event) => event.type === 'floor4:warning').length, 1);
  assert.equal(publicFloorFour(room).warning.endsAtTick, 46);
  assert.deepEqual(stepFloorFour(room, 1), []);
  player.transform.position = { x: 0, y: 0, z: 0 };
  assert.equal(stepFloorFour(room, 46).filter((event) => event.type === 'floor4:damage').length, 0);
  assert.equal(player.health.current, 100);
  player.transform.position = { ...RUNES[1] };
  assert.equal(stepFloorFour(room, 47).filter((event) => event.type === 'floor4:warning').length, 0);
});

test('standing on a solved rune does not trigger a false trap', () => {
  const { room, player } = fixture();
  startFloorFour(room, 0);
  player.transform.position = { ...RUNES[0] };
  stepFloorFour(room, 1);
  assert.deepEqual(stepFloorFour(room, 2), []);
  assert.equal(room.floorFour.warning, null);
});

test('disconnect and failed phase freeze trial damage and rune advancement', () => {
  const { room, player } = fixture();
  startFloorFour(room, 0);
  player.transform.position = { ...RUNES[1] };
  stepFloorFour(room, 1);
  player.connection = 'DISCONNECTED';
  assert.equal(stepFloorFour(room, 46).filter((event) => event.type === 'floor4:damage').length, 0);
  assert.equal(room.floorFour.nextRuneIndex, 0);
  room.phase = 'FAILED';
  player.connection = 'CONNECTED';
  player.transform.position = { ...RUNES[0] };
  assert.deepEqual(stepFloorFour(room, 47), []);
});

test('obstructed rune refuses start before mutating room', () => {
  const { room } = fixture();
  room.obstacles.push({ min: { x: -7, y: -1, z: -6 }, max: { x: -5, y: 2, z: -4 } });
  assert.throws(() => startFloorFour(room, 0), /obstructed/);
  assert.equal(room.floorFour, undefined);
});
