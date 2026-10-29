// target-intent-boundary.test.js
// Developer: Codex
// Date: 2026-10-28
// Why: Exercise target intent across real socket, room, cooldown, and reconnect boundaries.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { setTimeout: delay } = require('node:timers/promises');
const { createGameServer } = require('../server/server');
const { ProbeClient } = require('./socket-client');

async function fixture(t, overrides = {}) {
  const world = {
    bounds: { min: { x: -2, y: -2, z: -2 }, max: { x: 2, y: 8, z: 2 } },
    obstacles: [], discoveryNodes: []
  };
  const app = createGameServer({ host: '127.0.0.1', port: 0, world, maxHealth: 1000000, ...overrides });
  const clients = [];
  t.after(async () => { clients.forEach((client) => client.close()); await app.close(); });
  await app.listen();
  const url = `http://127.0.0.1:${app.httpServer.address().port}`;
  async function client() {
    const connected = new ProbeClient(url);
    clients.push(connected);
    await connected.ready;
    return connected;
  }
  async function room() {
    const host = await client();
    const peer = await client();
    const session = await host.rpc('room:create', { displayName: 'Target lead' });
    assert.equal(session.ok, true);
    assert.equal((await peer.rpc('room:join', {
      roomCode: session.roomCode, displayName: 'Target ally'
    })).ok, true);
    assert.equal((await host.rpc('room:start')).ok, true);
    const snapshot = () => app.getRoomSnapshot(session.roomCode);
    return { host, peer, session, snapshot, enemyId: Object.keys(snapshot().enemies)[0] };
  }
  return { app, client, room };
}

test('selected target intent cannot choose a foreign room, identity, geometry, or damage', async (t) => {
  const { client, room } = await fixture(t);
  const local = await room();
  const foreign = await room();
  const outsider = await client();
  const foreignHits = [];
  foreign.host.on('combat:enemy-hit', (event) => foreignHits.push(event));

  assert.equal((await outsider.rpc('combat:attack', {
    actionId: 'outsider', roomCode: local.session.roomCode, playerId: local.session.playerId,
    targetEnemyId: local.enemyId
  })).error, 'NOT_IN_RUNNING_ROOM');
  assert.equal((await local.host.rpc('combat:attack', {
    actionId: 'foreign-target', roomCode: foreign.session.roomCode,
    playerId: foreign.session.playerId, targetEnemyId: foreign.enemyId,
    position: { x: 1.2, y: 100, z: 0 }, range: 10000, damage: 1000000
  })).error, 'TARGET_UNAVAILABLE');

  const outcome = await local.host.rpc('combat:attack', {
    actionId: 'local-target', roomCode: foreign.session.roomCode,
    playerId: foreign.session.playerId, targetEnemyId: local.enemyId,
    damage: 1000000, remainingHealth: 0, defeated: true,
    position: { x: 10000, y: 10000, z: 10000 },
    transform: { position: { x: 10000, y: 10000, z: 10000 } }
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.enemyId, local.enemyId);
  assert.equal(outcome.damage, 20);
  const localState = local.snapshot();
  assert.equal(localState.enemies[local.enemyId].health.current, 80);
  assert.equal(localState.players[local.session.playerId].metrics.damageDealt, 20);
  assert.deepEqual(localState.players[local.session.playerId].transform.position, { x: 0, y: 0, z: 0 });
  assert.equal(foreign.snapshot().enemies[foreign.enemyId].health.current, 100);
  await delay(70);
  assert.deepEqual(foreignHits, [], 'another room receives no local combat event');
});

test('target action replay survives reconnect and cannot bypass cooldown or a downed player', async (t) => {
  const { app, client, room } = await fixture(t);
  const current = await room();
  const { host, peer, session, enemyId, snapshot } = current;
  const strike = await host.rpc('combat:attack', { actionId: 'remembered-strike', targetEnemyId: enemyId });
  assert.equal(strike.ok, true);
  const cooldown = await host.rpc('combat:attack', { actionId: 'remembered-cooldown', targetEnemyId: enemyId });
  assert.equal(cooldown.error, 'ATTACK_COOLDOWN');
  const disconnected = peer.waitFor('room:snapshot', (state) =>
    state.players[session.playerId]?.connection === 'DISCONNECTED');
  host.close();
  await disconnected;
  const replacement = await client();
  const rejoined = await replacement.rpc('room:rejoin', {
    roomCode: session.roomCode, reconnectToken: session.reconnectToken
  });
  assert.equal(rejoined.ok, true);
  assert.equal(rejoined.playerId, session.playerId);
  assert.notEqual(rejoined.reconnectToken, session.reconnectToken);
  await delay(470);
  assert.deepEqual(await replacement.rpc('combat:attack', {
    actionId: 'remembered-strike', targetEnemyId: 'changed-target'
  }), strike, 'rejoining cannot apply a remembered strike to another target');
  assert.deepEqual(await replacement.rpc('combat:attack', {
    actionId: 'remembered-cooldown', targetEnemyId: enemyId
  }), cooldown, 'an elapsed cooldown cannot turn a remembered failure into a new strike');
  assert.equal(snapshot().enemies[enemyId].health.current, 80);

  assert.equal(app.applyDamage({ roomCode: session.roomCode, playerId: session.playerId,
    amount: 1000000 }), true);
  assert.equal((await replacement.rpc('combat:attack', {
    actionId: 'downed-strike', targetEnemyId: enemyId, health: { current: 1000000 }
  })).error, 'PLAYER_DOWN');
  assert.equal(snapshot().enemies[enemyId].health.current, 80);
  assert.equal(snapshot().players[session.playerId].metrics.damageDealt, 20);
  assert.equal((await replacement.rpc('room:leave')).ok, true);
  assert.equal((await replacement.rpc('combat:attack', {
    actionId: 'departed-strike', targetEnemyId: enemyId,
    roomCode: session.roomCode, playerId: session.playerId
  })).error, 'NOT_IN_RUNNING_ROOM');
  assert.equal(snapshot().players[session.playerId], undefined);
  assert.equal(snapshot().enemies[enemyId].health.current, 80);
});

test('a connected session resists takeover and a stale transport cannot attack after rejoin', async (t) => {
  const { app, client, room } = await fixture(t);
  const { host, peer, session, enemyId, snapshot } = await room();
  const replacement = await client();
  assert.equal((await replacement.rpc('room:rejoin', {
    roomCode: session.roomCode, reconnectToken: session.reconnectToken
  })).error, 'INVALID_REJOIN', 'a currently connected player cannot be taken over');
  const first = await host.rpc('combat:attack', { actionId: 'before-takeover', targetEnemyId: enemyId });
  assert.equal(first.ok, true);

  // Test-only transport fixture: invoke the bound disconnect handler while retaining
  // the old WebSocket. This models a delayed stale frame after session replacement
  // without introducing a production debug endpoint or exposing a private room Map.
  const oldServerSocket = [...app.io.sockets.sockets.values()][0];
  const disconnectHandler = oldServerSocket.listeners('disconnect')[0];
  assert.equal(typeof disconnectHandler, 'function');
  disconnectHandler('target-boundary-fixture');
  assert.equal(snapshot().players[session.playerId].connection, 'DISCONNECTED');
  const rejoined = await replacement.rpc('room:rejoin', {
    roomCode: session.roomCode, reconnectToken: session.reconnectToken
  });
  assert.equal(rejoined.ok, true);
  assert.notEqual(rejoined.reconnectToken, session.reconnectToken);
  await delay(470);
  assert.equal((await host.rpc('combat:attack', {
    actionId: 'stale-transport', targetEnemyId: enemyId
  })).error, 'NOT_IN_RUNNING_ROOM');
  assert.equal(snapshot().enemies[enemyId].health.current, 80);
  host.close();
  await delay(40);
  assert.equal(snapshot().players[session.playerId].connection, 'CONNECTED',
    'the obsolete transport closing cannot disconnect its replacement');
  assert.equal((await replacement.rpc('combat:attack', {
    actionId: 'replacement-strike', targetEnemyId: enemyId
  })).ok, true);
  assert.equal(snapshot().enemies[enemyId].health.current, 60);
  const disconnected = peer.waitFor('room:snapshot', (state) =>
    state.players[session.playerId]?.connection === 'DISCONNECTED');
  replacement.close();
  await disconnected;
  const tokenReuser = await client();
  assert.equal((await tokenReuser.rpc('room:rejoin', {
    roomCode: session.roomCode, reconnectToken: session.reconnectToken
  })).error, 'INVALID_REJOIN');
  assert.equal((await tokenReuser.rpc('room:rejoin', {
    roomCode: session.roomCode, reconnectToken: rejoined.reconnectToken
  })).ok, true, 'only the rotated token can reclaim the now-disconnected session');
});

test('malformed requests and a defeated selected enemy never become an automatic strike', async (t) => {
  const { room } = await fixture(t);
  const { host, enemyId, snapshot } = await room();
  for (const payload of [null, [], 'attack', 42, true, { actionId: '' }, { actionId: 'x'.repeat(65) }]) {
    assert.equal((await host.rpc('combat:attack', payload)).error, 'INVALID_ACTION');
  }
  for (const targetEnemyId of [null, [], {}, false, 1, '', 'bad id', 'x'.repeat(81)]) {
    assert.equal((await host.rpc('combat:attack', { actionId: 'invalid-target', targetEnemyId })).error,
      'INVALID_TARGET');
  }
  assert.equal(snapshot().enemies[enemyId].health.current, 100);
  let finalStrike;
  for (let strike = 0; strike < 5; strike += 1) {
    if (strike > 0) await delay(470);
    finalStrike = await host.rpc('combat:attack', { actionId: `defeat-${strike}`, targetEnemyId: enemyId });
    assert.equal(finalStrike.ok, true);
    assert.equal(finalStrike.damage, 20);
  }
  assert.equal(finalStrike.defeated, true);
  assert.deepEqual(await host.rpc('combat:attack', {
    actionId: 'defeat-4', targetEnemyId: 'changed-after-defeat'
  }), finalStrike);
  await delay(470);
  assert.equal((await host.rpc('combat:attack', {
    actionId: 'dead-selected', targetEnemyId: enemyId
  })).error, 'TARGET_UNAVAILABLE');
  assert.equal((await host.rpc('combat:attack', { actionId: 'automatic-after-defeat' })).error, 'OUT_OF_RANGE');
  assert.equal(snapshot().enemies[enemyId].health.current, 0);
  assert.equal(Object.values(snapshot().players).find((player) => player.displayName === 'Target lead')
    .metrics.damageDealt, 100);
});

test('public Socket.IO progression reaches airborne Barkwings and preserves target authority',
  { timeout: 120000 }, async (t) => {
    const bounds = { min: { x: -12, y: -2, z: -12 }, max: { x: 12, y: 8, z: 12 } };
    const space = { bounds, obstacles: [], discoveryNodes: [] };
    const world = { ...space, spaces: { 'amber-vault': space, 'violet-vault': space } };
    const { app, room } = await fixture(t, { world, playerSpeed: 25 });
    const { host, peer, session, snapshot } = await room();
    let sequence = 0;
    let action = 0;
    const liveEnemies = () => Object.values(snapshot().enemies).filter((enemy) => enemy.health.current > 0);
    async function waitFor(predicate, label, limit = 125) {
      for (let attempt = 0; attempt < limit; attempt += 1) {
        const state = snapshot();
        if (predicate(state)) return state;
        await delay(40);
      }
      assert.fail(`Timed out waiting for ${label}; stage=${snapshot().floor.phase}`);
    }
    async function moveNear(position, tolerance = 0.9) {
      for (let attempt = 0; attempt < 125; attempt += 1) {
        const origin = snapshot().players[session.playerId].transform.position;
        const dx = position.x - origin.x;
        const dz = position.z - origin.z;
        const distance = Math.hypot(dx, dz);
        if (distance <= tolerance) {
          assert.equal((await host.rpc('player:input', {
            inputSeq: ++sequence, moveX: 0, moveZ: 0
          })).ok, true);
          return;
        }
        assert.equal((await host.rpc('player:input', {
          inputSeq: ++sequence, moveX: dx / distance, moveZ: dz / distance
        })).ok, true);
        await delay(40);
      }
      assert.fail(`Could not approach target during ${snapshot().floor.phase}`);
    }
    async function strikeUntil(done, label, limit = 100) {
      for (let attempt = 0; attempt < limit; attempt += 1) {
        if (done(snapshot())) return;
        const target = liveEnemies()[0];
        if (!target) { await delay(40); continue; }
        await moveNear(target.transform.position, 1.2);
        const result = await host.rpc('combat:attack', {
          actionId: `public-strike-${++action}`, targetEnemyId: target.enemyId
        });
        if (result.ok) {
          assert.equal(result.enemyId, target.enemyId);
          await delay(470);
        } else {
          assert.ok(['OUT_OF_RANGE', 'ATTACK_COOLDOWN'].includes(result.error), `${label}: ${result.error}`);
          await delay(60);
        }
      }
      assert.fail(`${label} did not complete`);
    }
    async function enterPortal(label) {
      const portal = snapshot().portals[0];
      assert.equal(portal.state, 'AVAILABLE', `${label} portal must be available`);
      await moveNear(portal.position, 0.8);
      const outcome = await host.rpc('portal:enter', {
        actionId: `public-route-${++action}`, portalId: portal.id
      });
      assert.equal(outcome.ok, true, `${label}: ${outcome.error}`);
    }

    await strikeUntil((state) => state.floor.requiredObjectives.sentinelDefeated, 'entry Sentinel');
    await enterPortal('entry gate');
    await moveNear(snapshot().trap.position, 1.2);
    const disarmed = await host.rpc('trap:disarm', {
      actionId: `public-route-${++action}`, trapId: 'vault-trap'
    });
    assert.equal(disarmed.ok, true);
    await enterPortal('floor one exit');
    await enterPortal('floor two recovery exit');
    await strikeUntil((state) => state.encounter?.stage === 'CLEARED', 'floor two bosses');
    await enterPortal('floor two exit');
    await enterPortal('floor three recovery exit');
    await waitFor((state) => state.encounter?.waveIndex >= 1, 'floor three wave');
    await strikeUntil((state) => state.encounter?.phase === 'REST_AVAILABLE', 'floor three waves');
    await enterPortal('floor three exit');
    await enterPortal('Deepwood recovery exit');
    assert.equal(snapshot().floor.phase, 'DEEPWOOD');
    assert.equal(snapshot().players[session.playerId].xp.base, 300);
    await strikeUntil((state) => Object.values(state.enemies).some((enemy) =>
      enemy.kind === 'BARKWING' && enemy.health.current > 0), 'Deepwood airborne summon');
    const barkwing = liveEnemies().find((enemy) => enemy.kind === 'BARKWING');
    assert.ok(barkwing.transform.position.y > 1, 'server publishes a genuinely airborne target');
    await moveNear(barkwing.transform.position, 1.2);
    await delay(470);

    // Test-only geometry fixture: insert a low wall into the already supplied
    // trusted world. It is deliberately below the sloping 3D line to the wing;
    // horizontal combat visibility must still block the strike. No private room
    // state, server clock, enemy health, or client snapshot is rewritten.
    const beforeWall = snapshot();
    const origin = beforeWall.players[session.playerId].transform.position;
    const wingPosition = beforeWall.enemies[barkwing.enemyId].transform.position;
    assert.ok(Math.hypot(origin.x - wingPosition.x, origin.z - wingPosition.z) <
      app.config.combat.playerAttackRangeMeters, 'the blocked airborne target is within horizontal strike range');
    const midpoint = { x: origin.x * 0.25 + wingPosition.x * 0.75,
      z: origin.z * 0.25 + wingPosition.z * 0.75 };
    const wall = { min: { x: midpoint.x - 0.15, y: -1, z: midpoint.z - 0.15 },
      max: { x: midpoint.x + 0.15, y: 0.5, z: midpoint.z + 0.15 } };
    const obstacles = app.config.world.spaces['violet-vault'].obstacles;
    obstacles.push(wall);
    const blocked = await host.rpc('combat:attack', {
      actionId: 'airborne-wall', targetEnemyId: barkwing.enemyId,
      position: wingPosition, damage: 1000000
    });
    assert.equal(blocked.error, 'OUT_OF_RANGE');
    assert.equal(snapshot().enemies[barkwing.enemyId].health.current, barkwing.health.current);
    assert.equal(obstacles.pop(), wall);

    const bossBefore = snapshot().enemies['deepwood-sentinel'].health.current;
    const peerHit = peer.waitFor('combat:enemy-hit', (event) => event.enemyId === barkwing.enemyId);
    const hit = await host.rpc('combat:attack', {
      actionId: 'airborne-selected', targetEnemyId: barkwing.enemyId,
      damage: 1000000, altitude: 0, defeated: true
    });
    assert.equal(hit.ok, true);
    assert.equal(hit.enemyId, barkwing.enemyId);
    assert.equal(hit.damage, 20);
    assert.equal(snapshot().enemies[barkwing.enemyId].health.current, 8);
    assert.equal(snapshot().enemies['deepwood-sentinel'].health.current, bossBefore);
    const event = await peerHit;
    assert.equal(event.currentHealth, 8);
    assert.equal(event.attackerPlayerId, session.playerId);
    assert.deepEqual(await host.rpc('combat:attack', {
      actionId: 'airborne-selected', targetEnemyId: 'deepwood-sentinel'
    }), hit, 'changing the replay target cannot hit the guardian');
    assert.equal(snapshot().enemies['deepwood-sentinel'].health.current, bossBefore);
    await delay(470);
    const defeated = await host.rpc('combat:attack', {
      actionId: 'airborne-defeat', targetEnemyId: barkwing.enemyId
    });
    assert.equal(defeated.ok, true);
    assert.equal(defeated.damage, 8, 'damage is bounded by remaining airborne health');
    assert.equal(defeated.defeated, true);
    await delay(470);
    assert.equal((await host.rpc('combat:attack', {
      actionId: 'airborne-stale', targetEnemyId: barkwing.enemyId
    })).error, 'TARGET_UNAVAILABLE');
    assert.equal(snapshot().enemies['deepwood-sentinel'].health.current, bossBefore);
  });
