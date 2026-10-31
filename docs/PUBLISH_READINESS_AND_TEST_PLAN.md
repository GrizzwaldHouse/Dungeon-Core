# Dungeon Core Crawler — publish readiness and test plan

**Prepared:** 2026-10-23  
**Owner:** lead system architect  
**Scope:** accountless 2–6 player Three.js dungeon with an authoritative Node.js/Socket.IO server. This is the shared checklist for ChatGPT Work agents; Claude Code is not part of the execution plan.

## Evidence and status rules

- `[x]` means the named artifact or documented baseline was observed. It does **not** certify the live game or public deployment.
- `[ ]` means work or a fresh acceptance check remains. Put the result, date, command or browser, and evidence path beside the item before checking it.
- **Documented baseline:** `README.md` and `docs/TESTING_AND_METRICS.md` record 14 passing tests and a four-second local 12-player sample from 2026-10-21: 47.87 ms p95 snapshot interval and 3.41 ms p95 server tick work. These are historical, local measurements.
- **Fresh automated check, 2026-10-23:** `npm run check` passed and `npm test` passed 14/14 with no failures. A four-second two-room/six-player-per-room probe passed after retrying outside the network-restricted command sandbox: snapshot interval p50/p95/p99 **31.13/46.63/48.73 ms**; input acknowledgement RTT **2.08/8.94/10.82 ms**; server tick work **2.21/5.87/10.63 ms**; scheduler lateness **6.47/14.09/15.07 ms**; rejected inputs **0**. The sandboxed probe could not establish a WebSocket, so only the successful local rerun is performance evidence. These p95 values meet the repository's proposed local budgets in `docs/TESTING_AND_METRICS.md`.
- **Fresh browser status, 2026-10-23:** isolated browser control was unavailable. `http://localhost:3001/healthz` timed out; port 3000 returned a 30 Hz health response but may be an older process. No live visual or button result was verified today. The 2026-10-21 two-browser report covers joining, movement, six visible players, and one synchronized sentinel hit; it leaves full sentinel defeat, combat reconnect, and west-wall reveal open.
- **Repository baseline, 2026-10-23:** local root commit `712831bce7c72537030d35031ba15fb9e1e017e2` preserves 41 intended source, documentation, test, and workflow files. Immediately after the commit, `git status --short --branch` returned `## main`. `node_modules` remained ignored, and no remote was configured. See `AGENTS.md` and `docs/GIT_WORKFLOW.md` for the continuing agent policy. Read fresh status before reporting later worktree state.
- Never infer implementation from `Technical-Architecture.md`, `Runtime-File-Architecture.md`, or `DESIGN_BOARD.csv`. Mark a feature done only when code, automated checks, and a two-browser observation support it.

## Rubric coverage and remaining work

| Rubric / game requirement | Current evidence | Release gate |
| --- | --- | --- |
| No login or installation; four-character room codes; 2–6 players | Described in `README.md`; server and client files exist | Verify create/join, full-room rejection, invalid codes, two independent rooms, and reconnect in real browsers. |
| Server-owned 3D movement, health, damage, discovery, collision | Documented server vertical slice; past user reported a pillar/wall collision mismatch | Validate every wall and pillar face, corners, diagonal movement, secret-wall state, and server transform under malformed inputs. |
| 30 Hz snapshots with smooth client prediction/interpolation | Architecture and historical local measurement exist | Re-run cadence and visual tests at 2, 4, and 6 players; inspect corrections and late packets. |
| Networking validation and modular separation | `server/server.js`, `client/network.js`, `client/render.js`, and `client/app.js` are present | Review every socket command, input focus, stale snapshots, disconnect handling, and renderer independence. |
| Hidden chamber proximity reveal | Documented in current slice | Verify server proximity, collision opening, correct wall opacity, and room isolation in two browsers. |
| Shifting portal graph and server-chosen destinations | Specified, not evidenced as implemented | Build graph/state transition, validated intent, replay protection, safe spawn, destination secrecy, and two-browser transition test. |
| Anti-rush deterrent and telegraphed traps | Specified, not evidenced as implemented | Define exploration threshold and bounded penalty; implement 45-tick warning at 30 Hz if the 1.5-second design is retained; test early/normal entry. |
| Shared floor completion and contribution XP | Specified, not evidenced as implemented | Implement one-time group award and capped bonus from server-recorded contributions; test ties, reconnect, late join, and duplicate completion. |
| Cooperative survival loop | One sentinel melee encounter is documented | Decide and implement downed/revive and floor failure rules; test party wipe and recovery before calling the loop complete. |
| Distinct cooperative roles and tactical variety | `client/handshake_guidelines.md` names distinct classes and spatial combat as inspirations; current slice documents one sentinel | Decide whether classes/loadouts and additional encounters are in launch scope; implement and test any feature advertised to players. |
| Publishable 3D space, readable HUD, accessible controls | Three.js client and DOM shell exist; no current visual pass | Capture desktop/narrow viewport evidence, verify scene loading, readability, keyboard focus, reduced motion, and WebGL recovery. |
| Public WebSocket hosting and operations | Local server only; no verified public run | Choose a host that keeps the Node/Socket.IO process alive, add deployment configuration and operational checks, then run remote two-device QA. |

**Source-level UI findings from this review:** `client/app.js` handles Space/WASD globally while excluding only `INPUT` and `TEXTAREA`, so focused buttons or dialogs need an explicit gameplay input gate. At narrow widths `client/styles.css` hides the connection label text, leaving a color-only dot. `client/index.html` keeps roster/actions and a long controls hint open during play. `client/render.js` shares a material across secret walls and keeps one secret-floor reference, which will mis-target future multi-chamber reveals. Startup guidance hardcodes port 3000, and context loss lacks a clear recovery state. These are code-review findings; viewport impact remains unverified until a browser capture.

## Work sequence and check-off list

### Gate 0 — recoverable baseline and rubric lock (P0; estimate 1–2 working days)

- [x] Preserve the initial project in local Git root commit `712831bce7c72537030d35031ba15fb9e1e017e2` (2026-10-23). Reviewed the 41 staged paths, excluded ignored `node_modules`, confirmed `.env` and raw diagnostic formats are ignored, and found no staged private-key or credential patterns in a focused scan. There is no remote; off-machine recovery remains a separate release task.
- [x] Install continuing Git stewardship instructions in `AGENTS.md` and `docs/GIT_WORKFLOW.md`: each agent inspects status and HEAD before edits, stages reviewed explicit paths, and makes a bounded local recovery commit after a verified milestone. No destructive Git or publishing action is implied.
- [x] Resolve the specification drift between `Technical-Architecture.md` (proposed TypeScript and 20 Hz) and the actual plain JavaScript 30 Hz prototype. `docs/ARCHITECTURE_DECISIONS.md` records the current release contract and keeps the proposed migration separate (2026-10-24; source and package manifest review).
- [x] Run `npm run check` and `npm test`: both passed on 2026-10-23; 14/14 tests passed. The fresh result is recorded in `docs/TESTING_AND_METRICS.md`.
- [x] Run `node scripts/measure.js --duration=4 --rooms=2 --players=6`: the successful local rerun is summarized above. The 4-second sample is too short to establish endurance or remote latency.
- [x] Expand `npm run check` to enumerate JavaScript under `client/`, `scripts/`, `server/`, `shared/`, and `tests/` (2026-10-26; `scripts/check-js.js`). The check includes new files without editing a manual list. Syntax checking and the existing behavior tests are the bounded release checks for now; lint rules can be added after a specific defect class justifies them. See the fresh command result in `docs/TESTING_AND_METRICS.md`.
- [x] Standardize `docs/OPERATIONS.md` and the PowerShell helper messages on the committed npm workflow (2026-10-27). `scripts/check.ps1` now delegates to the full `npm run check`; the fresh result is in `docs/TESTING_AND_METRICS.md`. The older `docs/SESSION-HANDOFF.md` pnpm instruction is historical.
- [x] Make `reports/defects/` the canonical ledger for verified local defects (2026-10-27). Its template contract requires expected/actual behavior, repro, affected room/player count, source revision, severity, evidence, and redaction. The current camera UI harness failure has its own record. A player feedback issue form is prepared, but GitHub intake is pending remote access and issue-triggered AI repair is not active.

### Gate 1 — complete the dungeon core (P0; estimate 13–22 working days)

- [ ] Define a server-owned connectivity graph and room/space lifecycle. Write the portal command and snapshot contract before client UI work.
- [ ] Implement portal bounds, seeded/auditable server destination choice, atomic party placement, private destination state, and idempotent action acknowledgements. Test invalid distance, stale action, duplicate action, disconnect mid-transition, and cross-room isolation.
- [ ] Build one complete combat–exploration–puzzle/trap–exit floor with no route softlock; verify the party can finish it without using developer mocks or administrative actions.
- [ ] Implement exploration counters from authoritative discoveries/objectives. Specify anti-rush threshold and cap; test that normal exploration avoids penalty and premature entry applies exactly one bounded consequence.
- [ ] Implement trap telegraph, activation, damage/collision, and recovery. At 30 Hz, a 1.5-second warning is 45 ticks; the server owns the timing and result.
- [ ] Implement floor completion, shared base XP/level, capped contribution bonus, ties, late join/rejoin behavior, and one-time awards. Add deterministic server tests for each.
- [ ] Specify and implement cooperative downed/revive and party-wipe behavior, or explicitly narrow the published game description if these are outside the release scope.
- [ ] Decide whether distinct classes/loadouts are a release requirement. If advertised, give each a server-owned ability and a cooperative reason to choose it; test balance and reconnect state. Otherwise describe this first release honestly as shared explorer roles.
- [ ] Reconcile every visible mesh with its authoritative collider, including pillars, portal thresholds, corners, and revealed walls. A screenshot alone cannot prove collision correctness.

### Gate 2 — UI, visual direction, and room presentation (P0/P1; estimate 5–9 working days)

- [ ] UI/UX agent audits `client/index.html`, `client/styles.css`, `client/app.js`, and `client/render.js` against a shifting-fantasy visual brief. Record a before image and a target layout.
- [ ] Keep health/threat, room code, and immediate objective legible in a compact DOM HUD. Collapse the currently persistent roster/actions/controls hint while playing; protect the center and lower-middle playfield. Target at most roughly 20–25% persistent HUD coverage on desktop.
- [x] Fix the global keyboard handler so focused buttons, dialogs, and menus cannot trigger movement or Space combat. Keep a visible focus indicator and clear held movement when gameplay focus is lost. On 2026-10-31, `client/app.js` was reviewed for its connected, running, alive, focus, and modal gates; `client/styles.css` retains the visible `:focus-visible` outline. The `tests/client-ui.test.js` VM harness exercised playfield movement, immediate release on menu focus, blocked Space and movement on a focused button or open dialog, and no movement restart on focus return. `node --test tests/client-ui.test.js` passed 13/13, `npm run check` passed 52 files, and the full local suite passed 124/124 with permitted loopback. This closes the source-level focus gate; physical keyboard and assistive-technology acceptance remain part of the independent browser QA gate.
- [ ] Keep textual connection state on narrow screens; the current color-only dot is insufficient. Provide a clear recovery action and non-color danger cues.
- [ ] Make ally, enemy, portal, secret wall, trap warning, and destination visually distinct. Trigger hidden-wall changes only after a server confirmation. Give each secret wall independent material/state before adding more chambers. Provide reduced-motion behavior for shake and effects.
- [ ] Replace the startup helper's hardcoded `localhost:3000` with current-origin guidance. Give WebGL context loss a readable status and retry/reload path.
- [ ] Check resize, narrow viewports, 200% zoom, high/low contrast scenes, low frame rate, and WebGL context loss/recovery. Document a usable fallback message.
- [ ] Decide whether the current procedural room is sufficient for a portfolio release. If an authored Blender/Meshy room is chosen, prepare a room brief and opening plan; pass the Build 3D Game Rooms Function, Form, and Runtime review gates in order. Paid assets and exports need their own approvals; a proxy render is not runtime proof.

The optional Game Development Studio capture/asset workflow is not available in this session: `game-dev --version`, `game-dev capabilities --json`, and `game-dev doctor --json` each returned command-not-found. Do not treat that CLI as a dependency for the playable release or substitute a paid service silently.

### Gate 3 — two-browser QA and hostile-input QA (P0; estimate 4–7 working days)

- [ ] QA tester A runs protocol checks and records exact commands/results. Cover malformed, missing, NaN, infinite, oversized, stale, duplicate, and burst inputs; attack distance/cooldown/replay; room isolation; 2–6 limit; 7th-player rejection; disconnect/reconnect; and independent room cleanup.
- [ ] QA tester B runs `docs/TWO_BROWSER_COMBAT_PLAYTEST.md` in two independent Windows browsers or profiles. Create a room, join it, enter names, start play, move with WASD and arrows, and watch both representations update. Record video or screenshots and each browser's console result.
- [ ] Record a mock-party cooperation scene. Four mocks must select independent server-owned intents rather than orbiting the host: investigate separate dungeon targets, engage regular enemies and a boss, change to `RESCUE` when a human is down, approach through authoritative collision, perform a validated revive using server inventory, and resume combat/exploration. Evidence must show snapshots/events and the rendered result.
- [ ] Test perimeter walls, every pillar face, corners, diagonal sliding, secret wall before/after reveal, portal threshold, trap bounds, and collision after a space transition. Compare the server-approved position to what each client renders.
- [ ] Test sentinel combat in and out of range, cooldown, duplicate attack, player/enemy health, disconnect mid-combat, and reconnect with a current snapshot.
- [ ] Test portal routing, early-entry penalty, trap warning duration, floor completion, and XP summary with at least two real clients. Repeat at 2, 4, and 6 players; mock explorers do not replace multi-browser proof.
- [ ] Repeat the end-to-end session in a second room at the same time. No player, enemy, discovery, portal destination, or reward may leak between rooms.

### Gate 4 — endurance, security, and publish path (P0; estimate 4–7 working days)

- [ ] Run a 30-minute local soak at 2/4/6 players and at least two simultaneous rooms. Record snapshot cadence, server tick duration, process RSS trend, browser frame times, packet size/throughput, disconnects, and uncaught errors. Agree target hardware before enforcing a frame-rate gate.
- [ ] Use provisional targets for the first soak: nominal snapshot period 33.3 ms; p95 interval at most 50 ms; p99 at most 67 ms; p95 server tick work below 8 ms; zero uncaught exceptions, duplicate awards, cross-room state leaks, or unbounded memory growth. Revise only with recorded hardware and measurement evidence.
- [ ] Inspect room-code guessing/rate limits, name and payload validation, reconnect-token secrecy, origin/CORS policy, log redaction, and denial-of-service bounds. Record what accountless access intentionally permits.
- [ ] Check the pinned Three.js CDN load and its failure message from the public host. A zero-install browser game must explain a blocked renderer dependency instead of remaining on a loading screen.
- [ ] Decide whether publication uses one Node process with ephemeral in-memory rooms or adds persistence/multiple instances. A multi-instance deployment needs shared room/state design and a Socket.IO adapter; polling across instances also needs sticky routing. Do not claim horizontal scaling from a single-process prototype. See the [Socket.IO adapter guidance](https://socket.io/docs/v4/adapter).
- [ ] Add reproducible deployment configuration, health/startup/shutdown checks, HTTPS/WSS, environment variable documentation, and a rollback method. Test from two separate devices over the public URL, including reconnect after a server restart.
- [ ] Tag a reviewed release only after the lead, UI/UX, QA A, and QA B evidence links are present and the user approves publication.

### Gate 5 — approved asset and motion polish (blocked until functional QA passes)

- [ ] Present exactly three grounded character/enemy concept directions for Marcus to approve or reject. Do not silently select or integrate one.
- [ ] After approval, use Blender as the browser-asset production path: model/rig/animate, optimize topology and textures, preserve license/provenance, and export glTF 2.0/GLB with bounded geometry, materials, bones, clips, and texture sizes.
- [ ] Use motion work for readable gameplay clips at the overhead camera: locomotion, attack anticipation, hit reaction, downed, revive, recovery, boss phase change, and minion spawn. Validate state-to-clip transitions against authoritative events.
- [ ] Treat Unreal Engine as a separate high-fidelity art/cinematic reference or asset-development track. It cannot replace the Three.js runtime or prove browser performance; only tested GLB assets and browser captures count as web-game evidence.
- [ ] Re-run collision parity, loading, memory, frame-time, mobile, reduced-motion, and two-device tests after every approved asset replacement.

## Exact local test sequence

Run from `C:\Users\daley\Projects\HandshakeGame_MSI\ChatGPT_MSI\DungeonCoreCrawler`. Save outputs to the QA evidence ledger with date, revision, and machine. Do not mark a step passed from a previous run.

```powershell
npm run check
npm test
node scripts/measure.js --duration=4 --rooms=2 --players=6
npm start
```

Open the printed local URL in two independent browsers/profiles. If port 3000 is occupied, set `$env:PORT = 3001` before `npm start` and use `http://localhost:3001/`. Follow `docs/TWO_BROWSER_COMBAT_PLAYTEST.md`, recording **pass / fail / blocked / not implemented** for each interaction. Never put reconnect capabilities or raw room logs in a public report.

Socket.IO orders messages but its default delivery is at most once, so durable gameplay actions need identifiers, acknowledgements, and server-side replay protection; reconnecting clients need a fresh authoritative snapshot. See the [Socket.IO delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/). WebGL context loss is a separate visual recovery test; Three.js exposes context-loss/restore hooks for diagnostics in its [renderer documentation](https://threejs.org/docs/pages/WebGLRenderer).

## Agent ownership and autonomous handoff

| Role | Owns | Handoff evidence |
| --- | --- | --- |
| Git steward | Baseline and milestone recovery discipline, staged scope, secret/log exclusions, change provenance | Full local commit SHA, staged path review, latest status, unresolved backup or remote gap. |
| Lead system architect | Server rules, protocol/state contracts, integration, release decision | File diff, command output, state schema, open risks, updated checklist. |
| UI/UX expert | Visual brief, DOM HUD, input focus, responsive layout, scene readability | Before/after captures at desktop and narrow widths, keyboard/focus notes, reduced-motion result. |
| QA tester A | Automated protocol, concurrency, abuse, reconnect, and performance | Reproducible commands, results, timing tables, bug reports; no unsupported pass claims. |
| QA tester B | Two-browser gameplay, collisions, combat, room and floor rules, visual review | Browser/profile details, screenshots/video, server-vs-render observations, console notes. |

Each agent should claim one unchecked item, inspect current files and user changes, define its acceptance evidence, make a bounded change only within its ownership, and update this document with the actual result. QA agents may propose fixes but should leave server/UI implementation to the respective owner to avoid conflicting edits. Follow `CODE_COMMENTING_STANDARD.md` when changing JavaScript. Ignore `CLAUDE_CODE_DUNGEON_BUILD_PROMPT.md` as an execution channel; ChatGPT Work agents own this plan.

## Timeline and publication decision

The October 30 exact-candidate QA audit is recorded in [reports/OCT30_EXACT_CANDIDATE_AUDIT.md](../reports/OCT30_EXACT_CANDIDATE_AUDIT.md). Clean `1063f366` passed 48 syntax files and 114/114 local tests, while the modified worktree passed 50 and 119/119. Two read-only QA reviewers assessed progression/game logic and player experience. The verdict is **NO-GO**: public revision and phone/two-client human campaign evidence are missing, and the current landscape HUD capture shows clipping. No Gate 1–5 release checkbox is closed by this audit.

The remaining P0 work is approximately **27–47 focused working days** across the gates above. With one lead implementing the core while UI and QA work in parallel, a realistic planning range is **6–9 calendar weeks** for a tested single-instance portfolio release, starting only after Gate 0 succeeds. This is an estimate, not a committed launch date; missing gameplay, collision parity, and live browser proof are the main uncertainty. A custom authored room may add **1–3 weeks** because Function, Form, and Runtime reviews are sequential. A trailer is optional after real gameplay capture; label any generated footage as illustrative so it does not imply an unimplemented mechanic.

**Publish only when:** every P0 item is checked with current evidence, the complete cooperative floor can be played by two real browsers, the 2–6 player and room-isolation gates pass, the target public host passes a remote test, and the user approves the final build.
