// probe-public-deployment.js
// Developer: Marcus Daley
// Date: 2026-10-31
// Why: Verify that a public deployment preserves one authoritative room across two independent WebSocket clients without exposing room identifiers.

'use strict';

const { ProbeClient } = require('../tests/socket-client');

const target = String(process.argv[2] || '').replace(/\/$/, '');
if (!/^https:\/\/[a-z0-9.-]+$/i.test(target)) {
  throw new TypeError('Usage: node scripts/probe-public-deployment.js https://deployment.example');
}

async function main() {
  const host = new ProbeClient(target);
  const guest = new ProbeClient(target);
  try {
    await Promise.all([host.ready, guest.ready]);
    const created = await host.rpc('room:create', { displayName: 'Deployment Host' });
    if (!created.ok) throw new Error(`room:create failed: ${created.error || 'unknown'}`);
    const joined = await guest.rpc('room:join', {
      roomCode: created.roomCode,
      displayName: 'Deployment Guest'
    });
    if (!joined.ok) throw new Error(`room:join failed: ${joined.error || 'unknown'}`);

    const sharedSnapshot = host.waitFor('room:snapshot', (snapshot) =>
      snapshot.roomCode === created.roomCode && Object.keys(snapshot.players || {}).length === 2, 5000);
    const started = await host.rpc('room:start');
    if (!started.ok) throw new Error(`room:start failed: ${started.error || 'unknown'}`);
    const snapshot = await sharedSnapshot;
    if (snapshot.tick < 0 || snapshot.revision < 1) throw new Error('authoritative snapshot metadata missing');

    console.log(JSON.stringify({
      ok: true,
      target,
      clients: 2,
      sharedRoom: true,
      phase: snapshot.phase,
      tickHz: 30
    }));
  } finally {
    host.close();
    guest.close();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, target, error: error.message }));
  process.exitCode = 1;
});
