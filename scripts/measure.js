// measure.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Sample room snapshot cadence and server tick timing under repeatable local load.

'use strict';

const { createGameServer } = require('../server/server');
const { ProbeClient } = require('../tests/socket-client');

function argument(name, fallback, max) {
  const raw = process.argv.find((part) => part.startsWith(`--${name}=`));
  const value = raw ? Number(raw.split('=')[1]) : fallback;
  if (!Number.isInteger(value) || value < 1 || value > max) throw new RangeError(`${name} must be 1..${max}`);
  return value;
}
function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Number(sorted[Math.ceil(p * sorted.length) - 1].toFixed(2));
}
function summary(values) { return { samples: values.length, p50: percentile(values, .5), p95: percentile(values, .95), p99: percentile(values, .99) }; }

async function main() {
  const seconds = argument('duration', 4, 60);
  const roomCount = argument('rooms', 2, 10);
  const playersPerRoom = argument('players', 6, 6);
  if (playersPerRoom < 2) throw new RangeError('players must be 2..6');
  const app = createGameServer({ host: '127.0.0.1', port: 0 });
  const clients = [];
  const intervals = [];
  const rtts = [];
  let snapshots = 0;
  let timer;
  try {
    await app.listen();
    const url = `http://127.0.0.1:${app.httpServer.address().port}`;
    for (let roomIndex = 0; roomIndex < roomCount; roomIndex += 1) {
      const host = new ProbeClient(url); clients.push(host); await host.ready;
      const created = await host.rpc('room:create', { displayName: `Host${roomIndex}` });
      let last = null;
      host.on('room:snapshot', () => {
        const now = performance.now();
        snapshots += 1;
        if (last !== null) intervals.push(now - last);
        last = now;
      });
      for (let i = 1; i < playersPerRoom; i += 1) {
        const peer = new ProbeClient(url); clients.push(peer); await peer.ready;
        const joined = await peer.rpc('room:join', { displayName: `P${i}`, roomCode: created.roomCode });
        if (!joined.ok) throw new Error(`Join failed: ${joined.error}`);
      }
      if (playersPerRoom > 1) {
        const started = await host.rpc('room:start');
        if (!started.ok) throw new Error(`Start failed: ${started.error}`);
      }
    }
    const endAt = performance.now() + seconds * 1000;
    let sequence = 0;
    timer = setInterval(async () => {
      if (performance.now() >= endAt) return;
      try {
        const started = performance.now();
        const answer = await clients[0].rpc('player:input', { inputSeq: ++sequence, moveX: 0.5, moveZ: 0.5 });
        if (answer.ok) rtts.push(performance.now() - started);
      } catch {
        // An individual lost probe is reflected in sample count.
      }
    }, 100);
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    clearInterval(timer);
    const metrics = app.getMetrics();
    const memory = process.memoryUsage();
    process.stdout.write(JSON.stringify({
      configuredTickHz: app.config.tickHz, durationSeconds: seconds, rooms: roomCount, playersPerRoom,
      snapshotsObserved: snapshots, snapshotIntervalMs: summary(intervals), inputAckRttMs: summary(rtts),
      serverTickDurationMs: summary(metrics.recentTickDurationsMs), scheduleLatenessMs: summary(metrics.recentScheduleLatenessMs),
      schedulerTicks: metrics.schedulerTicks, roomTicks: metrics.roomTicks, snapshotsBroadcast: metrics.snapshotsBroadcast,
      inputRejections: metrics.inputRejections, inputRejectionsByReason: metrics.inputRejectionsByReason,
      heapUsedBytes: memory.heapUsed, residentBytes: memory.rss
    }, null, 2) + '\n');
  } finally {
    if (timer) clearInterval(timer);
    clients.forEach((client) => client.close());
    await app.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
