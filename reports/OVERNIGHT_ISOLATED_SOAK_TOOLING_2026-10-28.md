# Isolated server memory measurement — October 28, 2026

## Scope and ownership

Owned only scripts/measure.js, scripts/measure-server.js, tests/measure.test.js and this report. Started from gameplay/release-integration at 795728489d9e00539d48e20b770f6a83adbaf812. Required instructions, handoff, jury, automation memory and active chat ownership were checked before edits. Preserved the active touch owner's six files; that owner completed its reviewed milestone as 29459ca4f65f51e1f605a594e7476fa3b0d6144a during this run. Its report and completion were inspected. This is intentional client advancement, not unexplained drift.

Main remains eeabf4108d5def29c8bf38605ab269096913e549; design/dusk-qa remains c70683b9c6ed719ad2ea5dcd5fa7cf5878a07f2f. Eleven concept PNGs remain untracked and unstaged. No server gameplay, assets, infrastructure, push or deployment changes.

## Measurement contract

- `node scripts/measure.js --isolated --duration=1800 --rooms=2 --players=6` runs the existing authoritative server in a separate loopback-only child process. Probe WebSockets, snapshot serialization and retained observation arrays stay in the parent. Server metrics and process memory travel over local IPC every ten seconds and at the endpoint.
- Each timing/payload metric retains at most 6,000 values. `observations` counts all arrivals; `samples` counts retained values. Percentiles now explicitly describe recent observations, not full-run distributions. This also bounds arrays in default shared-process mode.
- The output records Node version, OS and architecture. Heap/RSS fields in isolated mode belong to the child server only. No forced GC or server retention fix is applied.
- After the load, probes close and the tool samples memory and remaining rooms after the configured reconnect grace plus one second (31 seconds with current defaults). Intentional disconnects are excluded from load counters. This is a post-disconnect sample, not a full idle-room-expiry test: completedRoomTtlMs is 120 seconds, so two rooms at 31 seconds are expected and do not establish a leak.
- A complete JSON aggregate is emitted only after `app.close()` and successful worker exit; it includes `serverShutdownVerified: true`. Startup/sample timeouts and shutdown failure return a nonzero error instead of a completed result. Parent IPC loss also closes the server. This establishes local process shutdown, not a public restart/reconnect result.

## Fresh validation

- Final `npm run check`: 34 JavaScript files passed.
- Final `npm test`: 79/79 passed with approved local loopback access. Initial sandbox run failed existing WebSocket setup tests; no test was weakened. Focused additions cover window eviction/counts and real worker startup/memory/shutdown.
- Isolated smoke: duration 12 seconds, two rooms, six probes each; process exit 0, empty stderr, successful JSON and shutdown marker. Aggregate: reports/errors/isolated-smoke-2026-10-28-0648.json; matching .log. Both ignored, never staged. Filename is a label; validation occurred around 06:47–06:49 PDT.
- Observed 736 host snapshots; recent interval p95/p99 47.03/49.04 ms; input ACK p95 8.73 ms; recent server tick p95 6.57 ms. Zero unexpected disconnects, socket errors, input failures, probe rejections and server input rejections.
- Isolated load memory: heap 9,787,488 -> 14,869,688 bytes; RSS 62,898,176 -> 78,852,096 bytes. At 31.02 seconds after probe close: two rooms, heap 25,404,504 and RSS 89,968,640 bytes. Node v24.22.1, win32/x64. A short sample and unforced GC cannot establish stable memory or explain the earlier combined-process growth.

## Remaining evidence

The isolated 30-minute follow-up must be reviewed separately after completion; a launch is not acceptance. Do not compare its bounded-window percentiles directly as full-run percentiles against the earlier unbounded measurement. Server and probes still share a host; this is stationary transport load, not campaign, browser frame-time or physical-phone evidence. Full room expiry and heap attribution remain separate questions.

Touch implementation is now committed. Next serialized gameplay work is server-owned victory/results with explicit harder-cycle continuation, followed by results UI. Jury remains 71/100 HOLD. The public URL, HTTPS/WSS, phone, continuous demo and complete asset rights gates remain open. DigitalOcean still awaits the previously requested region and size; no repeat question or paid provisioning.
