# October 30 release gate

October 29 public-demo preparation: the owner now permits public source publication and reviewed pushes; hosting must remain $0. Independent final worktree checks: 43 syntax files, 106/106 local tests. See reports/QA_RELEASE_PREFLIGHT_2026-10-29.md. This supersedes older counts below without closing missing deployed/device gates.

- [x] Recoverable local milestones exist for the authoritative mock-party and client-feedback/concept baselines; no secrets or ignored files were staged.
- [x] October 28 integrated modified tree based on `c8dc460`: `npm run check` passes 37 JavaScript files and `npm test` passes 89/89 (36.469 seconds after the final selection-marker and diagnostic-duration changes). Local measurements record snapshot bytes and sampled memory; historical test counts are not the current count.
- [x] Server-owned Floor Five victory/results and explicit host-only harder-cycle choice are implemented (`06cf914`), with replay/reconnect/reward regression coverage; warning-window cues are one-shot (`c8dc460`).
- [x] Explicit airborne target intent has focused authority tests; procedural wings, native-select focus, touch labels, live selection text, and downed/disconnected reset have automated client coverage. Procedural Barkwings remain prototypes.
- [ ] Two real clients traverse all five floors and a stronger reset cycle without a stuck portal or duplicate reward.
- [ ] Six-player room remains isolated from a second room; disconnect/rejoin, down/revive, host departure, and party wipe are exercised.
- [ ] Mock-party AI visibly explores independently, attacks enemies and bosses, responds to a downed human, performs a server-validated revive, and resumes play; deterministic tests and recorded browser evidence exist.
- [ ] Every visible wall, pillar, secret boundary, rune, warning, cache, and portal has consistent server collision/range behavior.
- [ ] Desktop keyboard and mobile touch controls work; reduced-motion, legibility, audio toggle, and error messages are reviewed.
- [ ] Boss phases and minion caps, personal loot, floor XP, anti-rush, 45-tick warnings, and 30 Hz snapshots have test and browser evidence.
- [ ] Deepwood's 70%/35% phases and flying minion cap have automated evidence. Two independent IAB tabs showed fixture-assisted selected Barkwing HP agreement and clean consoles before the final marker correction; final-source responsive/touch review, authored-world encounter, mage counterplay, and physical-phone proof remain open.
- [x] A 30-minute baseline isolated loopback run with two rooms of six probes completed October 28 without unexpected disconnects, socket errors, failed/rejected input probes, or shutdown errors. It does not establish 30 minutes of active campaign combat, a memory-leak verdict, public latency, or device performance.
- [ ] Party intro skip voting has automated state, transport, accessibility, timeout, and disconnect evidence plus a two-tab desktop check; verify the shared result on the real phone before closing this gate.
- [ ] Public HTTPS staging on an authorized Node/WebSocket host passes room creation, multi-client join, reconnect, and health checks.
- [x] README describes the current candidate, honest demo/acceptance limits, solo rehearsal, optional illustrated quest draft and the free Render deployment path.
- [ ] Complete the measured production-optimization acceptance matrix on the actual release host; local diagnostic summaries do not establish public performance.
- [ ] Marcus reviews the Figma direction and Notion acceptance board; a final go/no-go is recorded before publication.
- [ ] Marcus approves one of three character/enemy design directions before any Blender, motion, or Unreal-derived art replaces the tested procedural visuals.

The [release and access plan](docs/OCT30_RELEASE_AND_ACCESS_PLAN.md) and [test plan](docs/PUBLISH_READINESS_AND_TEST_PLAN.md) provide the broader rubric. Current status: **no-go, integrated candidate still needs end-to-end proof**.
