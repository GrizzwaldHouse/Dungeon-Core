# Production optimization specification

**Prepared:** 2026-10-23
**Target:** accountless 2–6-player rooms on a public HTTPS/WSS URL
**Status key:** **Current** means observed in this source tree; **Planned** needs code and fresh measurement before release.

## Current baseline and budgets

The server runs a fixed 30 Hz simulation and emits one full JSON `room:snapshot` to each room per tick. Each snapshot includes player transforms, health, metrics, XP, status, discovery IDs, enemy state, floor/space, portal, and trap presentation. Input is capped at 45 accepted commands per player per second, and the browser samples input at 30 Hz. The renderer buffers snapshots by 100 ms, interpolates remote actors, and extrapolates the local actor for at most 80 ms. It resets interpolation on a server-owned space revision. Server collision, attacks, discoveries, routing, trap damage, and XP remain authoritative.

The four-second local sample in `docs/TESTING_AND_METRICS.md` is a smoke measurement, not public performance proof. Provisional local budgets are p95 snapshot interval ≤50 ms, p99 ≤67 ms, p95 server tick work <8 ms, and zero room leaks, uncaught exceptions, or duplicate awards. Record browser frame time, RTT, payload bytes, CPU, and RSS on the actual host before adopting Internet latency targets.

## Payload plan

1. **Measure before encoding.** Add per-room counters for serialized snapshot bytes, bytes/s, player count, and full/delta ratio without logging room codes or reconnect tokens. Capture 2/4/6-player values for idle, combat, and portal phases.
2. **Separate immutable from changing state.** Serve the versioned dungeon layout once as a static asset. Send a reliable full keyframe on join/rejoin/space revision and periodically during play (initial target: every 30 ticks). Between keyframes, send only changed transforms/health/status/object states plus `tick`, `revision`, `spaceRevision`, and a state checksum. Do not emit a delta until the client acknowledges or otherwise has the correct base revision; a gap triggers a full resync.
3. **Quantize measured fields.** Encode positions in centimeters as signed integers within the known world bounds; encode yaw as an unsigned 16-bit turn and health/XP as bounded integers. Keep simulation in full precision and quantize only the network view. Prove ≤1 cm position and ≤0.006° yaw reconstruction error and verify that quantization never changes server collision decisions. Use short, versioned field keys only in the transport DTO; retain readable server models and a documented decoder.
4. **Use compression selectively.** Avoid default per-message deflate on tiny 30 Hz packets: CPU cost and latency can exceed byte savings. Benchmark uncompressed JSON, compact JSON, and batched larger keyframes with compression at 2/4/6 players on the free host. Enable WebSocket compression only if p95 tick work and end-to-end latency remain inside budget. Do not compress secrets into shared attacker-controlled payloads.

## Event rate and reliability

- **Movement:** send a 20–30 Hz input stream while a direction is held, send one neutral input on release/focus loss, and omit duplicate unchanged samples only after proving the server's 250 ms input-silence rule still stops movement safely. Keep the server's 45/s per-player cap and reject malformed, stale, oversized, and nonfinite values.
- **Snapshots:** after resync/keyframe support exists, mark disposable movement deltas as Socket.IO `volatile` so a slow client drops old frames instead of accumulating a stale queue. Keep room start, portal resolution, trap outcome, combat result, and floor award as acknowledged/idempotent actions or reliable events with action IDs. A reconnect must fetch a fresh authoritative full state because Socket.IO delivery is [at most once by default](https://socket.io/docs/v4/delivery-guarantees/).
- **Spatial culling:** for six-player rooms, retain all nearby party actors and relevant danger cues. Cull off-screen particles and decorative lighting on the client before culling gameplay state. Never hide a trap or enemy solely because a view cone misses it.
- **Room fanout:** keep one serialization per room/tick and measure cost before optimizing. The present `io.to(room.code).emit` full snapshot is single-process; multi-instance hosting would require shared room authority, a [Socket.IO adapter](https://socket.io/docs/v4/adapter), and compatible routing. Do not represent this build as horizontally scaled.

## Prediction and correction

The existing client uses a 100 ms snapshot delay plus at most 80 ms of local extrapolation, then eases toward the newest server position. This is visual smoothing, not full input reconciliation. For public latency, attach server-acknowledged `lastInputSeq` to each snapshot, retain an ordered 250 ms local input ring, and replay only unacknowledged inputs from the approved transform. Cap prediction at the server movement speed and world collision proxy. If correction exceeds 0.5 m, a collider changes, or `spaceRevision` advances, snap to the server position and clear the ring; otherwise blend the correction over 80–120 ms. Reject old `revision` values, cap the jitter buffer, and show a connection-state message during resync. Validate behavior under 50/100/200 ms RTT, 1–5% packet loss, and browser tab suspension.

## Release measurements

| Scenario | Evidence to record | Acceptance intent |
| --- | --- | --- |
| 2, 4, 6 real players; two rooms | p50/p95/p99 snapshot interval, ACK RTT, bytes/s, tick work, RSS, browser frame time | No state leak or duplicate gameplay result; no unbounded queue or memory trend. |
| 30-minute soak | Same counters plus reconnect count and heap trend every minute | No crash, room softlock, growing buffered packets, or unbounded RSS. |
| Public host over two devices | Loading/spin-up time, WSS establishment, portal/resync correctness, motion correction magnitude | Playable advertised loop without repeated rubber-banding or missing durable events. |
| Loss/reorder simulation | Last-input ACK, resync count, space change, duplicate action outcome | Server and both clients converge on the same revision and award exactly once. |

Any optimization is accepted only after a before/after capture on the same revision, player count, and hardware. Preserve correctness when a compression or culling experiment regresses gameplay.
