# Barkwing targeting sprint — October 28, 2026

Local candidate work only. Public release remains **NO-GO**. Phone/computer acceptance, complete authored-world browser campaign, collision parity, final art approval, public HTTPS/WSS, and exact published-revision audit remain open.

The autonomous session began October 28 at 12:40 PDT (19:40 UTC), with a four-hour window through 16:40 PDT. This report distinguishes completed checks from blocked or still-running work.

## Source and ownership

The complete handoff was read before edits. The starting checkout was `gameplay/release-integration` at `c8dc4606843e9cd439e9f4d8db39daaefc7b9182`, with no tracked edits and eleven untracked user concept PNGs. The separate design checkout remained `design/dusk-qa` at `c70683b9c6ed719ad2ea5dcd5fa7cf5878a07f2f`, with one untracked title derivative. Neither worktree was switched, reset, cleaned, pushed, deployed, or published. Approved cover art was not replaced.

The lead owns shared contract documentation, integration, final validation, explicit staging, and the local milestone commit. Authority agent owns selector/server boundary tests; client agent owns selection/render/HUD changes; QA owns this report plus TASKS, TEST_RESULTS, RELEASE_CHECKLIST, and NEXT_SESSION. See `docs/BARKWING_TARGET_CONTRACT.md` for interfaces and exclusive paths.

Target IDs and desktop/touch targeting already existed in the starting candidate. The increment preserves the production server/network behavior, adds authority-boundary tests, improves native-select focus and selection accessibility/state clearing, and replaces the flying placeholder with a charcoal/moss/slate procedural Barkwing prototype. A peer review caught impact scaling moving the floor marker; the client now compensates for actor scale, with a regression test. This is gameplay prototype art, not an approved final GLB.

The canonical cover remains SHA-256 `B7332DB53BB3D3D91E1D8540BDF3E2433A3DBD2C7738F2E2E7D1E2CA993A820B`. Its full art contract lives in the separate design worktree. Floor Five results/explicit host-only continuation (`06cf914`) and one-shot warning-window cues (`c8dc460`) remain implemented; docs were reconciled accordingly.

## Automated evidence

| Scope | Command | Observed result |
| --- | --- | --- |
| Starting syntax | `npm run check` | 35 JavaScript files passed |
| Starting full suite | `npm test` | 81/81 passed, 26.289 seconds |
| Focused authority | `node --test tests/combat-target.test.js tests/target-intent-boundary.test.js` | 7/7 passed, 36.065 seconds |
| Focused UI/touch/render | `node --test tests/client-ui.test.js tests/touch-controls.test.js tests/barkwing-render.test.js` | 19/19 passed after final marker correction |
| Integrated syntax | `npm run check` | 37 JavaScript files passed |
| Measurement bounds | `node --test tests/measure.test.js` | 6/6 passed; four-second default, 30-minute and three-hour accepted durations, invalid/oversized durations rejected |
| Integrated full suite | `npm test` | 89/89 passed, zero failures, 36.469 seconds after final marker and bounded diagnostic-duration changes |

The loopback sandbox initially caused WebSocket handshake failures. A focused escalated probe and full rerun passed outside that sandbox; the failed attempt was preserved as environment evidence, not hidden or counted as a pass.

Authority tests use real Socket.IO and public intents through an open arena with trusted high health/speed and real cooldowns to reach Deepwood. They cover explicit airborne damage, peer event agreement, no nearer-enemy fallback, replay, malformed/stale/dead/foreign targets, forged damage/position/identity, range/LOS, cooldown caching, downed and disconnected states, rejoin token rotation, and denial of a retained old transport. Low-wall geometry and retained transport scenarios are explicit test-side fixtures. This is authoritative contract proof, not default-map pacing, collision parity, or human campaign acceptance.

## Browser evidence and limits

At approximately 12:47–12:50 PDT, two independent IAB tabs joined one local party. These are separate tabs/clients in one browser backend, not two browser applications or physical devices. The private local fixture compiled server source in memory with one test-only private room accessor, placed two humans and airborne/ground enemies, paused encounter AI, and used normal 30 Hz snapshots plus production combat handling. No gameplay source edit or HTTP/Socket.IO debug endpoint was added. Fixture diagnostics remain ignored local files and are excluded from commits.

- Both tabs selected the same Barkwing. A host UI strike changed its health from 80 to 60 in both HUDs. The nearer Rootling stayed at 80; the guardian stayed at 150. The server applied the ordinary 20 damage.
- Both browser consoles returned zero warning/error entries after that interaction.
- Q while the native target select was focused preserved selection and focus. Q while the viewport was focused cycled to the next airborne target; striking that out-of-range selection displayed “Move closer and find a clear path to your target.”
- An inline screenshot showed the jagged moss/slate wings visibly elevated above the players and a gold floor selection ring. The screenshot API returned no local artifact path; this is an observed screenshot, not a retained recording.
- Responsive/touch emulation was attempted in a batched viewport/touch/screenshot call. It hung for approximately 1,498 seconds until interrupted. No result returned; responsive touch, final-source marker correction, and real-phone gates remain unverified from this pass. Interruption cleared temporary tab bindings; recovery inventory returned no browsers.

The browser pass preceded the final impact-scale marker correction. Source hashes at the final integrated automated pass were app.js `B259218A35BA199EAD9E95279E467FCF37E858F5FB4CA889371F4148D30A6D5A` and render.js `77DF010DCC0618E0CD0B7BBBFC512092A509F332C5D8B67DD64734F46D159378`. A final-source browser pass must be recorded separately; the earlier clean console cannot be promoted to it.

Recovery could not open a fresh IAB tab: `Browser is not available: iab`, with no browser backend in inventory. Native Chrome fallback stopped at `Computer Use app approval timed out` after approximately 300 seconds; no Chrome input occurred and the user's tabs were untouched. Further UI attempts stopped. Final-source visual, touch, reduced-motion browser behavior, and sound-unlock acceptance remain blocked or unverified, despite their automated source coverage. This was an access/tool failure, not an observed game failure.

At 13:34 PDT, the private fixture's exec session no longer existed and an approved read-only TCP inventory confirmed no listener on its dedicated loopback port. The earlier graceful-shutdown response was not retained; no user-owned process or browser was terminated.

## Local measurement host

Read-only CIM inventory identified an MSI Raider GE78HX 13VG, Intel Core i7-13700HX (16 cores / 24 logical processors), and 16,865,579,008 bytes of physical memory. GPU inventory includes an NVIDIA RTX 4070 Laptop GPU and Intel UHD Graphics; the active WebGL adapter was not established. Node reports `v24.22.1` on Windows. This identifies the local diagnostic machine; it is not a public-host or physical-phone performance result.

## Thirty-minute baseline

Command: `node scripts/measure.js --isolated --duration=1800 --rooms=2 --players=6`.

The server ran in a separate child process, with two rooms and six loopback probe clients per room for 1,800 seconds. The probe observes host snapshots and sends input from the first player only. It does not exercise sustained target-intent combat, record encounter phases, traverse the authored campaign, or render WebGL. Development and browser checks overlapped the baseline, so timing is not an uncontended benchmark. No production server source changed during this sprint.

| Observation | Result |
| --- | --- |
| Host snapshots | 108,012 |
| Unexpected disconnects / socket errors | 0 / 0 |
| Failed/rejected input probes / server input rejections | 0 / 0 / 0 |
| Server shutdown | Verified |
| Server tick p95 / p99 | 4.31 / 6.43 ms, most recent 600 samples |
| First-player input acknowledgement p95 / p99 | 4.54 / 8.99 ms, most recent 6,000 samples |
| Heap start / end / sampled peak | 9,609,432 / 73,207,848 / 88,090,336 bytes |
| RSS start / end / sampled peak | 61,308,928 / 237,150,208 / 241,082,368 bytes |
| Final five-minute sampled RSS min / max | 232,148,992 / 239,091,712 bytes |
| Final five-minute sampled heap min / max | 21,304,704 / 80,050,080 bytes |
| Post-load recovery | 31 seconds; two rooms still retained; normal room TTL not elapsed |

Most sampled RSS growth occurred in the first five minutes (initial 61,308,928 bytes; first-five-minute sampled maximum 221,835,264 bytes); the final five-minute interval stayed within the range above. Heap samples rose and fell repeatedly. These observations do not establish the cause of growth or leak freedom. Raw diagnostic JSON remains ignored under `reports/errors/`; only reviewed summaries are intended for staging. Later sequential final-source load configurations will be appended after completion by the lead.

## Sequential 30-minute matrix — in progress

Each configuration uses two rooms, a fresh isolated server process, and `node scripts/measure.js --isolated --duration=1800 --rooms=2 --players=N`. The continuous extended run overlaps the later part of the two-player measurement and the four/six-player measurements. These are process-isolated diagnostics, not uncontended host benchmarks. Counts cover the observation window; timing percentiles use the existing recent bounded buffers.

| Players per room | Host snapshots | Snapshot p95 / p99 (ms) | Tick p95 (ms) | Input RTT p95 (ms) | Transport / probe errors | Shutdown |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | 108,007 | 47.18 / 48.50 | 2.60 | 4.85 | 0 | Verified |
| 4 | Running | — | — | — | Pending | Pending |
| 6 | Not started | — | — | — | Pending | Pending |

Two-player sampled heap: 9,809,008 to 54,210,904 bytes, peak 78,352,744. RSS: 63,332,352 to 230,019,072, peak 234,196,992. There were 181 samples and the final sample elapsed time was 1,800.10 seconds. Final-five-minute RSS ranged 227,287,040 to 234,196,992 bytes; heap ranged 27,940,792 to 78,162,848. Unexpected disconnects, socket errors, probe failures/rejections, and server input rejections were all zero. Two rooms remained after 31-second recovery; normal room TTL had not elapsed, and the subsequent server shutdown was verified.

## Extended continuous observation — running

The initial growth leaves behavior beyond 30 minutes unmeasured. The lead extended only the diagnostic CLI ceiling from 1,800 to 10,800 seconds, preserving its four-second default, room/player limits, existing sampler, server, and gameplay rules. Boundary tests and the full suite passed after this change. This permits one continuous observation within the remaining sprint window rather than combining separate fresh processes into a false long-session claim.

Command: `node scripts/measure.js --isolated --duration=10500 --rooms=2 --players=6`.

Started at 13:38:35 PDT (20:38:35 UTC), with a configured 10,500-second window. Its ignored JSON and timestamp metadata are under `reports/errors/barkwing-sprint-extended-10500s-20261028*.json`. The 2/4/6-player matrix overlaps its early portion; process-isolated memory excludes probes but does not make CPU/timing uncontended. No result is claimed until completion and shutdown counters are reviewed. It retains the baseline's movement/snapshot-only, no-WebGL/no-sustained-campaign limits.

## Remaining acceptance and exact next action

1. Confirm the final local milestone SHA and fresh status recorded by the lead; preserve the eleven untracked concept PNGs and separate design worktree.
2. When browser access is available, start the ordinary game with `npm start` and use two independent browsers/profiles. Confirm their loaded app/render source matches the final candidate before checking selected airborne HP, final marker, Q/native-select, downed clearing, touch, narrow/landscape layout, reduced motion, console, and sound unlock. The earlier private fixture is not a public launch path; obtain native app approval through the app if required.
3. Complete an authored-world two-client campaign through victory/results and explicit optional continuation, including disconnect/rejoin, down/revive, personal supplies, traps, and collision parity. Fixture-assisted focused combat does not close this gate.
4. Run Marcus's physical computer-plus-phone acceptance and retain redacted device/browser/version evidence. No real-phone pass has been claimed.
5. Keep public hosting, private repository publication prerequisite, HTTPS/WSS, final art approval, and published-revision audit open. Do not push, deploy, publish, replace approved art, or enable report-to-AI repair automation.
