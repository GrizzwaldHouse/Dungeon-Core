# Independent QA release preflight — October 29, 2026

## Candidate and scope

- Baseline: `gameplay/release-integration` at `448e6fcb6bf1d60cc1879d9f4395c5a56a745690`.
- Baseline command window ended at approximately 10:29 PDT. Node `v24.22.1`, npm `12.2.1`, Windows x64.
- Required reads: AGENTS.md, docs/GIT_WORKFLOW.md, README.md, RELEASE_CHECKLIST.md, TEST_RESULTS.md, reports/security-boundary-2026-10-29.md; relevant source/configuration and layout/mobile tests were inspected.
- No tracked or staged edits existed at baseline preflight or immediately after baseline testing. Eleven pre-existing concept PNGs remained untracked and untouched. No runtime, configuration, staging, push, main or design-worktree changes were made by this QA reviewer.
- Owned output is this report only. Public-source/push authorization and the firm zero-dollar hosting limit are recorded in the current human request. Neither authorization substitutes for actual public-host or device evidence.

## Fresh baseline evidence

| Check | Result | What it establishes |
| --- | --- | --- |
| `npm run check` | VERIFIED: 41 JavaScript files, exit 0 | Syntax of the enumerated source and test files |
| `npm test` with approved loopback access | VERIFIED: 98/98 tests passed, zero failed/skipped, 36.569 seconds, exit 0 | Local automated behavior on the baseline revision |
| `node scripts/validate-layout.js` | VERIFIED: exit 0; 21 objects, collider counts entry 13 / amber-vault 7 / violet-vault 8 | Exact shared-manifest static solid/AABB parity for three authored spaces |
| Initial restricted `npm test` | NOT ACCEPTED: exit 1; WebSocket handshake failures | Restricted networking prevented transport assertions; no source/tests were weakened |

The allowed-loopback suite includes real Socket.IO progression to airborne Barkwings (approximately 32.191 seconds), target identity/range/geometry/cooldown/replay checks, reconnect/stale-session checks, two-room isolation and capacity, first-floor movement and collision, scripted full-campaign progression through results and explicit continuation, contribution/reward behavior, warning-window deduplication, client VM/renderer contracts, and mobile CSS lane checks. Test fixtures, accelerated clocks where used, static styles and loopback sockets do not establish real-time human campaign pacing, physical touch or public-network correctness.

The historical 37-file/89-test figures in the existing release documents do not describe this fresh baseline command result. They remain evidence for their named earlier runs.

## Release blockers and limits

1. **Public server security — OPEN at the baseline.** The earlier security review remains applicable: `server/server.js` binds room:create/join/rejoin directly at lines 1608–1610 with no attempt budget; input movement throttling is separate. `server/config/game-parameters.js:186` defaults CORS_ORIGIN to `*`, and the Socket.IO constructor at `server/server.js:148–155` has no explicit request-origin admission check. A public endpoint needs bounded room-management attempts and verified intended-origin behavior. CORS alone is not authentication. A separate builder owns this hardening; this baseline does not certify its pending code.
2. **Exact deployed service — MISSING.** No public URL, deployed SHA, public health response, HTTPS/WSS, allowed/denied origin checks, restart behavior or rollback was exercised by this reviewer. `render.yaml` selecting Free is configuration only, not proof of a running free service or its spending controls.
3. **Two real browser campaign/device acceptance — OPEN.** This review ran no browser UI. Historical browser/fixture observations retain their original limits. Two independent live clients must visibly agree through create/join/vote, combat, portal, results and continuation; the physical phone must separately pass touch, background/reconnect, rotation, readability and direct-gesture audio acceptance.
4. **Dynamic collision and presentation — PARTIAL.** Static shared solids now pass exact proxy parity, but actual rendered movement, dynamic runes/markers, discoverable walls and combat warnings still require browser acceptance. Mobile tests inspect CSS and arithmetic; they do not demonstrate real layout or simultaneous touch on a phone.
5. **Public endurance and media — OPEN.** Prior isolated 30-minute local transport aggregates do not establish active campaign endurance, a server-memory leak verdict, public latency or browser frame time. No continuous human full-campaign recording or new screenshot was produced by this reviewer.
6. **Honest launch copy — REQUIRED.** The game must be described as a public prototype/demo until the full release checklist passes. Procedural gameplay visuals are distinct from illustrated concept/story assets. Existing client copy correctly says rooms last only while the server runs; free-host wake/restart guidance must also match the deployed service.

## QA decision

**Local automated baseline: PASS. Public-playable/full-release certification: HOLD.**

Publishing reviewed source is a separate repository-enforcer decision. A clearly labelled, zero-dollar public demo can become reviewable after the baseline security blocker is resolved, the exact deployed SHA is known, and public health/HTTPS/WSS plus two-client create/join/play/reconnect smoke checks pass. This is a conditional path, not a claim those checks have passed. Do not label the build production-ready or close physical-phone/full-campaign gates on this report.

## Integrated follow-up

### Final frozen-worktree verification — approximately 10:35 PDT

The parent and hardening builder froze runtime edits before this final pass. HEAD was still `448e6fcb6bf1d60cc1879d9f4395c5a56a745690`; this is a tested modified worktree based on that revision, not a claim that the original commit contains these additions. The parent must record its eventual containing commit and deployed SHA separately.

Integrated scope: modified `server/server.js`, `server/config/game-parameters.js`, `server/static-client.js`, `client/index.html`; new `client/story-preview.js`, `client/story-preview.css`, `client/story-preview.html`, `client/quest-storyboard-draft.png`, and `tests/public-boundary.test.js`. Parent-owned README/runbook/ledger changes are documentation. This reviewer changed only this QA report.

| Final check | Result |
| --- | --- |
| `npm run check` | VERIFIED: **43 JavaScript files**, exit 0 |
| `npm test` with approved loopback access | VERIFIED: **106/106**, zero failed/skipped, **36.733 seconds**, exit 0 |
| Before/after SHA-256 comparison | VERIFIED: **49** runtime/test/HTML/CSS/PNG files hashed; **zero content changes** during final commands |
| `server/server.js` SHA-256 | `0BDE3BC41EE60CCB262A02071C5B7FD961FFAEA3C5EEFEFE6D502B17B3C0C19B` |
| `tests/public-boundary.test.js` SHA-256 | `829366C1E875880492DFFCCAD9B74023C59864C9D36C8780A30AB52EF175D743` |

An earlier integrated pass passed 105 tests before the builder's existing-session-origin addition. A subsequent 106-test pass preceded the final aggregate-counter instrumentation. Those passing intermediate runs are superseded by the hash-stable final result above; they are not the acceptance evidence for the final worktree.

### Independent hardening review

The baseline security finding is now **addressed locally** by inspected code plus eight passing network regressions:

- Combined create/join/rejoin budget: 30 attempts per socket per 60-second window, including invalid attempts, plus a 300-attempt process-wide window that survives replacing sockets. Per-socket bookkeeping is a WeakMap; the aggregate is a fixed counter, not a growing address/token log.
- Default allocation bounds: 64 live rooms and 256 Engine.IO connections. Attempt and room-capacity rejection occurs before allocating a new room. Tests use reduced limits and verify non-mutating rejection and window recovery.
- Explicit origins are validated as exact HTTP(S) origins. CORS_ORIGIN overrides the Render-provided external URL. Local wildcard mode means matching the request Host, rather than unrestricted browser origins; arbitrary forwarded-host values do not grant access.
- Initial admission checks cover both polling and direct WebSocket handshakes. Engine.IO middleware additionally checks subsequent requests with an existing session ID, including WebSocket upgrades. Tests contain positive valid-origin controls and rejected wrong/null origins, forwarded-host forgery and wrong-origin requests reusing a valid session ID.
- Native clients without an Origin header remain intentionally admitted; this browser-origin defense is not authentication. Copied aggregate rejection metrics contain only counts, without identities, addresses, room codes or tokens.

No new blocking correctness defect was found in this focused diff review. These are bounded demo guardrails, **not** public penetration-test, denial-of-service resistance, or measured 64-room/free-instance capacity certification. Host/reverse-proxy behavior must still be verified on the actual deployment.

### Story-preview review and final QA decision

Source review confirms the illustrated sequence is optional, manually advanced, labelled DRAFT/concept artwork, uses HTML captions and image descriptions, has clamped Previous/Next boundaries, and is linked separately from the multiplayer game. It does not modify combat or shared room state. New HTML/CSS/JS/image routes are explicit entries in the existing static-file map. The approximately 3.45 MiB draft PNG still needs practical mobile-load acceptance; this reviewer did not run a new browser or resize the image. Parent-run browser observations belong to their separate evidence record.

**Final local integrated QA: PASS. Public-host acceptance: PENDING. Full release: HOLD.** The original baseline attempt/origin blocker is locally resolved, but a public-demo link must still be checked against its exact deployed revision for health, HTTPS/WSS, intended-origin behavior, two-client create/join/play/reconnect, wake/restart guidance and rollback. Physical-phone, full human campaign and public endurance gates remain open. Publishing reviewed source and labelling an experimental demo do not certify production readiness.

This report intentionally contains no room capabilities, raw diagnostics, billing credentials or player reports. No staging, commit or push was performed by this QA reviewer.
