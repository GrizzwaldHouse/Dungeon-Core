// measure.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Sample room snapshot cadence and server tick timing under repeatable local load.

'use strict';

const { createGameServer } = require('../server/server');
const { ProbeClient } = require('../tests/socket-client');

function argument(name, fallback, max, argv = process.argv.slice(2)) {
  const raw = argv.find((part) => part.startsWith(`--${name}=`));
  const value = raw ? Number(raw.split('=')[1]) : fallback;
  if (!Number.isInteger(value) || value < 1 || value > max) throw new RangeError(`${name} must be 1..${max}`);
  return value;
}
function options(argv = process.argv.slice(2)) {
  const seconds = argument('duration', 4, 1800, argv);
  const roomCount = argument('rooms', 2, 10, argv);
  const playersPerRoom = argument('players', 6, 6, argv);
  if (playersPerRoom < 2) throw new RangeError('players must be 2..6');
  return { seconds, roomCount, playersPerRoom };
}

// Sampled peaks are not continuous high-water marks. The probe and server share a process.
function memorySample(usage, elapsedSeconds) {
  return { elapsedSeconds: Number(elapsedSeconds.toFixed(2)), heapUsedBytes: usage.heapUsed, residentBytes: usage.rss };
}
function sampledMemorySummary(samples) {
  return {
    sampleCount: samples.length,
    sampledPeak: {
      heapUsedBytes: Math.max(...samples.map((sample) => sample.heapUsedBytes)),
      residentBytes: Math.max(...samples.map((sample) => sample.residentBytes))
    },
    samples
  };
}
function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Number(sorted[Math.ceil(p * sorted.length) - 1].toFixed(2));
}
function summary(values) { return { samples: values.length, p50: percentile(values, .5), p95: percentile(values, .95), p99: percentile(values, .99) }; }

// Why: A start/end comparison makes short probe memory numbers actionable without claiming leak proof.
// Input: Trusted process.memoryUsage snapshots captured by this local diagnostic.
// Output: Signed heap and resident byte deltas plus explicit start/end byte counts.
// Watch Out: Garbage collection timing can make a healthy short run report a negative delta.
function memorySummary(start, end) {
  return {
    start: { heapUsedBytes: start.heapUsed, residentBytes: start.rss },
    end: { heapUsedBytes: end.heapUsed, residentBytes: end.rss },
    delta: { heapUsedBytes: end.heapUsed - start.heapUsed, residentBytes: end.rss - start.rss }
  };
}

async function main() {
  const { seconds, roomCount, playersPerRoom } = options();
  const app = createGameServer({ host: '127.0.0.1', port: 0 });
  const clients = [];
  const intervals = [];
  const rtts = [];
  const snapshotPayloadBytes = [];
  let snapshots = 0;
  let timer;
  let memoryTimer;
  let unexpectedDisconnects = 0;
  let socketErrors = 0;
  let inputProbeFailures = 0;
  let inputProbeRejections = 0;
  let pendingProbe = null;
  function connect(url) {
    const client = new ProbeClient(url);
    clients.push(client);
    client.ws.addEventListener('close', () => { unexpectedDisconnects += 1; });
    client.ws.addEventListener('error', () => { socketErrors += 1; });
    return client;
  }
  try {
    await app.listen();
    const memoryStart = process.memoryUsage();
    const samplingStartedAt = performance.now();
    const memorySamples = [memorySample(memoryStart, 0)];
    function sampleMemory(usage = process.memoryUsage()) {
      const metrics = app.getMetrics();
      memorySamples.push({
        ...memorySample(usage, (performance.now() - samplingStartedAt) / 1000),
        recentServerTickDurationMs: summary(metrics.recentTickDurationsMs),
        recentScheduleLatenessMs: summary(metrics.recentScheduleLatenessMs)
      });
    }
    memoryTimer = setInterval(sampleMemory, 10000);
    const url = `http://127.0.0.1:${app.httpServer.address().port}`;
    for (let roomIndex = 0; roomIndex < roomCount; roomIndex += 1) {
      const host = connect(url); await host.ready;
      const created = await host.rpc('room:create', { displayName: `Host${roomIndex}` });
      if (!created.ok) throw new Error(`Create failed: ${created.error}`);
      let last = null;
      host.on('room:snapshot', (snapshot) => {
        const now = performance.now();
        snapshots += 1;
        snapshotPayloadBytes.push(Buffer.byteLength(JSON.stringify(snapshot), 'utf8'));
        if (last !== null) intervals.push(now - last);
        last = now;
      });
      for (let i = 1; i < playersPerRoom; i += 1) {
        const peer = connect(url); await peer.ready;
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
    timer = setInterval(() => {
      if (performance.now() >= endAt || pendingProbe) return;
      pendingProbe = (async () => {
        try {
          const started = performance.now();
          const answer = await clients[0].rpc('player:input', { inputSeq: ++sequence, moveX: 0.5, moveZ: 0.5 });
          if (answer.ok) rtts.push(performance.now() - started);
          else inputProbeRejections += 1;
        } catch {
          inputProbeFailures += 1;
        }
      })().finally(() => { pendingProbe = null; });
    }, 100);
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    clearInterval(timer);
    if (pendingProbe) await pendingProbe;
    clearInterval(memoryTimer);
    const metrics = app.getMetrics();
    const memoryEnd = process.memoryUsage();
    sampleMemory(memoryEnd);
    const memory = memorySummary(memoryStart, memoryEnd);
    process.stdout.write(JSON.stringify({
      configuredTickHz: app.config.tickHz, durationSeconds: seconds, rooms: roomCount, playersPerRoom,
      snapshotsObserved: snapshots, snapshotPayloadBytes: summary(snapshotPayloadBytes),
      snapshotIntervalMs: summary(intervals), inputAckRttMs: summary(rtts),
      serverTickDurationMs: summary(metrics.recentTickDurationsMs), scheduleLatenessMs: summary(metrics.recentScheduleLatenessMs),
      schedulerTicks: metrics.schedulerTicks, roomTicks: metrics.roomTicks, snapshotsBroadcast: metrics.snapshotsBroadcast,
      inputRejections: metrics.inputRejections, inputRejectionsByReason: metrics.inputRejectionsByReason,
      unexpectedDisconnects, socketErrors, inputProbeFailures, inputProbeRejections,
      measurementScope: 'Local server and probe share a process; host snapshots only; input probes use the first player; tick percentiles are recent server windows; memory includes retained probe samples.',
      heapUsedBytes: memory.end.heapUsedBytes, residentBytes: memory.end.residentBytes,
      memoryBytes: { ...memory, ...sampledMemorySummary(memorySamples) }
    }, null, 2) + '\n');
  } finally {
    if (timer) clearInterval(timer);
    if (memoryTimer) clearInterval(memoryTimer);
    clients.forEach((client) => client.close());
    await app.close();
  }
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });

module.exports = { memorySummary, memorySample, sampledMemorySummary, options, percentile, summary };
