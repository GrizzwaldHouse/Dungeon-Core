# Multiplayer test and measurement baseline

## Run locally

From this repository, run `npm run check`, `npm test`, and `node scripts/measure.js --duration=4 --rooms=2 --players=6`. On Windows, `powershell -ExecutionPolicy Bypass -File scripts/verify.ps1` runs all three in order and returns a failing exit code if a step fails. Tests and measurement bind to loopback on an ephemeral port, never port 3000. The test probe implements the Socket.IO v4 websocket framing needed for this project; it exercises the real server transport without an added package. Close handling is in test teardown and measurement `finally` blocks.

## Metrics and proposed budgets

| Metric | Definition | Proposed local budget |
| --- | --- | --- |
| Snapshot interval p95 | Time between consecutive snapshots received by the room host | ≤ 50 ms at two rooms × six players |
| Input acknowledgment RTT p95 | Round trip for an accepted `player:input` command over loopback | ≤ 15 ms |
| Server tick duration p95 | Time spent executing one scheduler pulse | ≤ 10 ms of the 33.33 ms budget |
| Scheduler lateness p95 | Time the pulse begins after its target deadline | ≤ 20 ms |
| Rejected inputs | Count by server error code | 0 in a valid load run |
| Resident memory | Process RSS at sample end | Record trend; no fixed ceiling yet |

These are proposed development thresholds, not production service promises. The measured interval includes Node scheduling and local websocket delivery. Samples are short and do not represent internet latency or browser rendering.

## Static collision and mock-party coverage

`shared/dungeon-layout.js` is the single serializable registry for visible static geometry and the server's AABB obstacles. The browser receives the same registry through `/dungeon-layout.js`; it uses the data only to render meshes. The server owns movement resolution.

`npm test` now verifies that sustained player movement is blocked by the authored inner column and that a host can add four server-owned mock explorers. After the host starts the room, the test observes at least one bot position change from authoritative snapshots. Mock explorers use the same movement and collision path as human players, and do not reveal secret rooms.

## Measured baseline, 2026-10-21

Command: `npm run measure -- --duration=4 --rooms=2 --players=6` on Windows, Node v22.13.1. Two rooms held six connected players each for four seconds.

| Metric | Result |
| --- | ---: |
| Host snapshots observed | 258 |
| Snapshot interval p50 / p95 / p99 | 31.48 / 47.43 / 49.00 ms (256 samples) |
| Input acknowledgment RTT p50 / p95 / p99 | 1.27 / 4.01 / 7.04 ms (36 samples) |
| Server tick duration p50 / p95 / p99 | 1.12 / 2.79 / 3.51 ms (125 samples) |
| Scheduler lateness p50 / p95 / p99 | 6.58 / 14.60 / 14.95 ms (125 samples) |
| Scheduler ticks / room ticks / snapshots broadcast | 125 / 246 / 260 |
| Rejected inputs | 0 |
| Heap used / resident memory | 12,272,144 / 62,308,352 bytes |

That initial nine-test baseline predates the mock-party and combat slices. It is retained above as a comparison point.

## Combat build sample, 2026-10-21

Command: `node scripts/measure.js --duration=4 --rooms=2 --players=6` outside the command sandbox, using two rooms with six connected players each. Each room had one server-controlled sentinel.

| Metric | Result |
| --- | ---: |
| Host snapshots observed | 259 |
| Snapshot interval p50 / p95 / p99 | 31.11 / 47.87 / 48.47 ms (257 samples) |
| Input acknowledgment RTT p50 / p95 / p99 | 1.59 / 4.95 / 9.61 ms (37 samples) |
| Server tick duration p50 / p95 / p99 | 1.33 / 3.41 / 4.79 ms (126 samples) |
| Scheduler lateness p50 / p95 / p99 | 6.74 / 14.04 / 15.43 ms (126 samples) |
| Scheduler ticks / room ticks / snapshots broadcast | 126 / 247 / 261 |
| Rejected inputs | 0 |
| Heap used / resident memory | 16,650,528 / 67,919,872 bytes |

`npm test` passed 14 of 14 after combat implementation. Added cases cover authored column collision, moving mock explorers, server-owned sentinel movement, attack range, cooldown, replay protection, shared health, and melee line of sight through solid walls. The [two-browser playtest](TWO_BROWSER_COMBAT_PLAYTEST.md) records visual checks. A first measurement attempt inside the command sandbox could not establish its WebSocket probe; the successful sample above used the normal local network context.

## Fresh pre-publish check, 2026-10-23

`npm run check` exited 0. `npm test` exited 0 with 14 passed, 0 failed, 0 skipped, and 0 todo in 6203.76 ms. The test set remains a baseline for the current combat slice; it does not exercise shifting portals, anti-rush penalties, floor completion, revives, or contribution XP.

`node scripts/measure.js --duration=4 --rooms=2 --players=6` first failed in the restricted command sandbox because its WebSocket probe could not establish a connection. A local-network rerun exited 0 at 30 Hz with two rooms and six connected players per room. Only the successful rerun is used below.

| Metric | Result |
| --- | ---: |
| Host snapshots observed | 262 |
| Snapshot interval p50 / p95 / p99 | 31.13 / 46.63 / 48.73 ms (260 samples) |
| Input acknowledgment RTT p50 / p95 / p99 | 2.08 / 8.94 / 10.82 ms (37 samples) |
| Server tick duration p50 / p95 / p99 | 2.21 / 5.87 / 10.63 ms (129 samples) |
| Scheduler lateness p50 / p95 / p99 | 6.47 / 14.09 / 15.07 ms (129 samples) |
| Scheduler ticks / room ticks / snapshots broadcast | 129 / 250 / 264 |
| Rejected inputs | 0 |
| Heap used / resident memory | 13,694,000 / 65,130,496 bytes |

All four p95 metrics met the proposed four-second local budgets above. This sample does not establish browser frame rate, public-network latency, or long-run memory behavior. The next evidence gate is a longer soak and two real browser clients; see `PUBLISH_READINESS_AND_TEST_PLAN.md`.

## Integrated first-floor source check, 2026-10-23

After server commit `59a0618f03f73c48fcee142c176801580c4db3ad` and client commit `79c8bd96d08f28dc2a06572687177caf4dbbee04`, `npm run check` exited 0 and `npm test` passed **18/18** with zero failures. New tests exercise private/atomic portal routing, out-of-range and outside-socket rejection, a 45-tick trap warning, once-only trap damage, replay-safe floor rewards, reconnect-grace eligibility, and a non-rushed route after defeating the sentinel. They do not yet cover the complete multi-floor design or browser visuals.

On October 24, the distinct-vault geometry milestone passed `npm run check` and **21/21** automated tests. New assertions cover authored mesh/AABB parity for entry, amber, and violet spaces; a portal transition that activates destination collision; and renderer visibility for the active space and shared perimeter. These are local automated checks, not independent browser or public-network proof.

The four-second `node scripts/measure.js --duration=4 --rooms=2 --players=6` probe failed to open a WebSocket in the restricted command sandbox, then passed in the normal local network context. The successful run observed 259 host snapshots; p50/p95/p99 snapshot intervals were **31.00/46.75/47.23 ms**, input ACK RTT **1.59/4.02/12.42 ms**, server tick work **1.43/3.65/7.31 ms**, and scheduler lateness **6.47/13.95/15.35 ms**. It recorded 0 rejected inputs and 69,963,776 bytes RSS at the sample end. This is a smoke result for two rooms with six connected clients each, not a soak or Internet benchmark.

## Two-tab browser smoke, 2026-10-23

A fresh server on port 3002 returned `/healthz` with `ok: true` and `tickHz: 30` after running outside the command network sandbox. In two tabs of the **same ChatGPT in-app browser**, two test explorers created and joined one room, the roster updated to 2/6 in both tabs, the host started the run, and both tabs showed Floor 1 and the sentinel HUD. A held W key in the first tab and Up arrow in the second visibly moved the rendered explorers and camera. The WebGL scene loaded with the wall, pillars, portal marker, and sentinel. This is a local two-tab smoke check only: no independent Chrome/Edge profiles, portal entry, collision parity, full combat, floor completion, reconnect, or public URL were verified in the browser.

## Reading failures

An interval above budget can reflect event-loop delay or websocket delivery. Compare it with tick duration and scheduler lateness: high tick duration points to simulation work, while low tick duration and high lateness point to scheduling or host contention. A high RTT with stable tick metrics points toward transport pressure. A rejection count above zero in this measurement means the generated input stream or server limits need investigation. Repeat a longer run before drawing capacity conclusions.
