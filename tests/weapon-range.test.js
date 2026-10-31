// weapon-range.test.js
// Developer: Marcus Daley
// Date: 2026-10-31
// Why: Prove ranged silhouettes can strike at distance while clients cannot extend reach or damage.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createGameServer } = require('../server/server');
const { ProbeClient } = require('./socket-client');
const { createServerConfig } = require('../server/config/game-parameters');
const { createWeaponProfile } = require('../server/weapon-profile');
const { selectAttackTarget } = require('../server/combat-target');

test('weapon reach configuration is bounded and the exact melee boundary is inclusive', () => {
  const config = createServerConfig({ playerAttackRangeMeters: 3, mageAttackRangeMeters: 8 });
  assert.equal(createWeaponProfile('Axe Vanguard', 'p', config.combat).rangeMeters, 3);
  assert.equal(createWeaponProfile('Arcane Mage', 'p', config.combat).rangeMeters, 8);
  assert.throws(() => createServerConfig({ playerAttackRangeMeters: Infinity }));
  assert.throws(() => createServerConfig({ scoutAttackRangeMeters: 999 }));
  const enemy = { health: { current: 100 }, transform: { position: { x: 3, y: 0, z: 0 } } };
  const room = { enemies: new Map([['target', enemy]]) };
  const player = { transform: { position: { x: 0, y: 0, z: 0 } } };
  assert.equal(selectAttackTarget(room, player, 3, () => true).target, enemy);
  enemy.transform.position.x = 3.001;
  assert.equal(selectAttackTarget(room, player, 3, () => true).error, 'OUT_OF_RANGE');
});

async function encounter(t, name, obstacles = []) {
  const app = createGameServer({ host: '127.0.0.1', port: 0, world: {
    bounds: { min: { x: -5, y: -2, z: -5 }, max: { x: 5, y: 8, z: 5 } },
    obstacles, discoveryNodes: []
  } });
  const clients = [];
  t.after(async () => { clients.forEach(c => c.close()); await app.close(); });
  await app.listen();
  for (let i = 0; i < 2; i++) {
    const c = new ProbeClient(`http://127.0.0.1:${app.httpServer.address().port}`);
    clients.push(c); await c.ready;
  }
  const session = await clients[0].rpc('room:create', { displayName: name });
  await clients[1].rpc('room:join', { roomCode: session.roomCode, displayName: 'Vanguard ally' });
  await clients[0].rpc('room:start');
  return { app, host: clients[0], session, snapshot: () => app.getRoomSnapshot(session.roomCode) };
}

test('DC-001 mage attacks beyond melee reach without overlapping the enemy', async t => {
  const f = await encounter(t, 'Arcane Mage');
  const before = Object.values(f.snapshot().enemies)[0];
  assert.ok(Math.hypot(before.transform.position.x, before.transform.position.z) > 4);
  const result = await f.host.rpc('combat:attack', { actionId: 'range-proof', targetEnemyId: before.enemyId });
  assert.equal(result.ok, true);
  assert.equal(result.damage, 20);
  assert.equal(f.snapshot().players[f.session.playerId].combatProfile.style, 'SPELL');
});

test('DC-002 vanguard cannot forge a ranged weapon or damage', async t => {
  const f = await encounter(t, 'Axe Vanguard');
  const enemy = Object.values(f.snapshot().enemies)[0];
  const result = await f.host.rpc('combat:attack', { actionId: 'forged-reach', targetEnemyId: enemy.enemyId,
    range: 999, damage: 999, combatProfile: { role: 'MAGE', rangeMeters: 999 } });
  assert.equal(result.error, 'OUT_OF_RANGE');
  assert.equal(f.snapshot().enemies[enemy.enemyId].health.current, 100);
});

test('DC-001 ranged attack cannot penetrate a pillar', async t => {
  const f = await encounter(t, 'Arcane Mage', [{ min: { x: 2, y: 0, z: -1 }, max: { x: 3, y: 4, z: 1 } }]);
  const enemy = Object.values(f.snapshot().enemies)[0];
  assert.equal((await f.host.rpc('combat:attack', { actionId: 'pillar', targetEnemyId: enemy.enemyId })).error, 'OUT_OF_RANGE');
  assert.equal(f.snapshot().enemies[enemy.enemyId].health.current, 100);
});
