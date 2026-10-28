# Overnight soak tooling — October 28, 2026

## Ownership and baseline

At 03:38 PDT the integration checkout was on `gameplay/release-integration` at `70afe6770217d70e08b7c00bcbda0a9b6a4cfe9d`. The previous automation chat (`01a181db-9f12-77f0-b426-68ceef231805`) was active, waiting on approval, and owned uncommitted touch changes in `client/app.js`, `client/index.html`, `client/styles.css`, `client/touch-controls.js`, `tests/client-ui.test.js`, and `tests/touch-controls.test.js`. Those changes were preserved and excluded from this milestone. Eleven concept PNGs remain untracked and unstaged. Main remains `eeabf4108d5def29c8bf38605ab269096913e549`; the design worktree remains `c70683b9c6ed719ad2ea5dcd5fa7cf5878a07f2f`.

This independent lane owns only `scripts/measure.js`, `tests/measure.test.js`, and this report. No server or client runtime source changed in this lane. This intentional measurement milestone may advance HEAD while the earlier touch owner is pending; it does not certify or include that owner's work.

## Implemented

- Duration accepts 1–1800 seconds, retaining the four-second default and existing room/player bounds.
- Memory sampling every ten seconds plus start and final samples; signed endpoint deltas and sampled heap/RSS peaks.
- Each periodic sample includes recent server tick and scheduling percentile windows.
- Explicit unexpected disconnect, socket error, input timeout/failure, and input rejection counters. Only one input probe may be outstanding; final output waits for it.
- Focused tests for 1800-second acceptance, invalid durations/load, and intermediate peaks above final memory usage.

## Verification

Final `npm run check`: 32 files. Final `npm test`: 76/76 passed using approved local-network access. The first sandbox attempt failed WebSocket connections; it was not counted as a passing transport result.

Final command: `node scripts/measure.js --duration=12 --rooms=2 --players=6` with approved loopback access, exit 0. It observed 739 host snapshots, p95/p99 intervals 47.28/50.18 ms, p95 input ACK 10.47 ms, p95 server tick 6.74 ms, and zero input rejections, probe failures, socket errors or unexpected disconnects. Memory samples at 0, 10.01 and 12.20 seconds: heap 9,359,064 / 19,498,536 / 23,912,216 bytes; RSS 63,729,664 / 85,893,120 / 87,203,840 bytes. Sampled peaks include the final endpoint. This short run overlapped final tests and is smoke evidence only.

## Thirty-minute run and interpretation

After this tooling commit, launch `node scripts/measure.js --duration=1800 --rooms=2 --players=6` with aggregate stdout in ignored `reports/errors/overnight-soak-2026-10-28-034x.json` and stderr in a matching `.log`. The automation memory records the exact output names, launch revision, time, and process ID. A started process is not completion evidence. Inspect the complete JSON and error file before reporting the soak result; do not stage either raw artifact. If absent/incomplete, keep endurance open.

The server and twelve socket probes share one process, so memory includes probe arrays retained throughout the run. Snapshot percentiles cover host observations; input RTT uses only the first client. Periodic tick percentiles describe overlapping recent server windows, not a full-run tick distribution. This is a stationary transport/timing soak, not an active campaign playthrough or browser rendering benchmark. No browser frame-time, cross-room-state, duplicate-reward, public-network, physical-phone, or restart/reconnect acceptance claim follows from it. A rising RSS requires investigation; no leak-free verdict follows from the sampled peak alone.

Mock jury remains 71/100 HOLD, without re-score. Touch QA belongs to the prior owner; server victory/results remains the next serialized gameplay slice. Deployment awaits the previously requested DigitalOcean region and size. No provisioning, asset promotion, push, or public deployment occurred in this lane.
