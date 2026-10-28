# Dungeon Core Crawler submission package

Prepared October 28, 2026, approximately 05:50 PDT. **Draft for local review; submission remains HOLD.**

## Candidate and ownership

Source review: `gameplay/release-integration` at `19f333b2d8dfebe5ef8741541de7f87636fcedf2`. The advance from `714ddfbef71f1e4910aac872a1217cc0c463e423` contains only protocol tests and their QA note, confirmed against the release-sprint memory and completed chat. No unexpected runtime drift was found.

Touch owner `01a181db-9f12-77f0-b426-68ceef231805` remains active/waiting on approval. Its edits to `client/app.js`, `client/index.html`, `client/styles.css`, `client/touch-controls.js`, `tests/client-ui.test.js`, and `tests/touch-controls.test.js` are excluded from this documentation milestone. Eleven concept PNGs remain untracked and unpromoted. Main and the design worktree are preserved. This package does not certify that dirty worktree as a deployable candidate.

## Submission fields

**Title:** Dungeon Core Crawler

**Cover:** `client/title-cover-deepwood.png`. Use the selected exact file; provenance, dimensions, runtime use and remaining rights review are in `docs/design/ASSET_LEDGER.md`. It is concept/title artwork, not a gameplay screenshot.

**Project URL:** BLOCKED — no verified public HTTPS/WSS address is recorded. Do not submit localhost, a LAN address, a repository URL, or a guessed host address as the playable link.

**Description draft, to verify against the eventual deployed build:**

> Gather a party with a four-character room code and explore Dungeon Core Crawler, a cooperative browser dungeon for two to six players. No account or installation is required. Investigate shifting paths, fight guardians, share supplies and help fallen explorers through a five-floor expedition. A mysterious Guild briefing sets the journey in motion; connected humans can vote together to skip it. Choose an angled or top-down view, select a combat target, and send movement and action intent while the server resolves the shared world. The project combines accountless access with authoritative combat, exploration and party recovery. The current prototype uses a procedural 3D scene; the illustrated cover expresses its visual direction. Completing Floor Five currently starts a stronger cycle automatically. An explicit victory/results choice is still in development.

Before publication, replace the final sentence only after the deployed results flow is directly verified. Confirm touch targeting before advertising that interaction. Describe room state as temporary: restarting the server loses the expedition. Do not advertise persistent saves or cross-restart recovery.

## Balanced rubric evidence

| Criterion | Material to show | Gate still open |
| --- | --- | --- |
| Execution | Two clients agree on roster, combat, portal and reconnect state | Public WSS, exact deployed revision, phone and restart behavior |
| Creativity | Guild briefing, shifting vaults, distinct guardian encounters and Deepwood direction | Runtime silhouette/readability review; concept art is not runtime proof |
| Usefulness / Value | A friend joins using only the room code, without an account or installer | Real computer-plus-phone session and clear recovery guidance |
| Polish / Thoughtfulness | Target feedback, view choice, readable objectives and restrained announcements | Touch/390x844 QA, results choice, audio deduplication and media |

Panel remains **71/100 HOLD**; this package is not a re-score. Re-judge only after the existing mock-jury report's four gates pass.

## Capture and demo plan

Capture three to five honest runtime images on the final deployed SHA: title/room entry, two-human roster and briefing vote, target selection during combat, shared portal progression, and victory/results once implemented. Keep room codes, reconnect capabilities and private diagnostics out of published media. Label cover/concept art separately. No screenshots or video are claimed as produced by this milestone.

The following is a **90-second continuous capture plan**, not completed evidence:

| Time | Action | Narration / accepted evidence |
| --- | --- | --- |
| 0–15s | Show live title, create on desktop and join on phone | “No account or installation; join the expedition with a code.” Show both rosters agreeing. |
| 15–25s | Each human votes, then host begins | Show shared vote completion and both clients entering the run. |
| 25–45s | Move separately, select a reachable enemy, strike | Show target ring, health change and matching enemy state. |
| 45–60s | Help a downed ally and cross an unlocked portal | Show recovery and both clients in the same destination. |
| 60–75s | Finish the campaign and show results | Blocked until results exist and actual human completion is timed. |
| 75–90s | Choose harder cycle explicitly; briefly reconnect a client | Blocked until continuation exists; show identity/state continuity on the same live server. |

Time a rehearsal before recording: the whole campaign is not proven to fit this duration. Do not cut, accelerate, inject state, use debug progression or present separate rooms as one continuous playthrough. If it cannot fit, use a continuous 90-second opening/combat excerpt and a separate, honestly labelled full-run recording with timestamps for revive, later portals, results and reconnect. Keep the full campaign acceptance gate open until that recording exists. Never imply a server restart preserves in-memory rooms.

## Deployment verification and rollback card

The repository contains `render.yaml` and `docs/RENDER_DEPLOYMENT.md`; neither establishes a live deployment. DigitalOcean still requires the previously requested user choice of region and size; no choice is inferred and no provisioning is performed. Billing continues until resource deletion. Once chosen, use the required provision-droplet skill. Recheck hosting access and current provider settings before external changes; historical access failures and provider limits in older runbooks are not current proof.

1. Record a reviewed candidate SHA after touch/results integration, check/test results, host deployment ID, runtime version, exact HTTPS origin and prior known-good deployment. Verify private repository visibility before pushing. Do not deploy the pending dirty client tree.
2. Use one authoritative Node process for HTTP and Socket.IO. Local configuration currently binds `0.0.0.0`, reads `PORT`, and reads `CORS_ORIGIN` (default `*`). Configure the chosen exact origin; verify origin rejection for both polling and WebSocket transport rather than treating a CORS setting as a complete origin/security gate. Do not infer approved cross-origin behavior.
3. On the assigned public origin, request `/healthz`: require HTTP 200, JSON `ok: true`, `tickHz: 30`, and no cache. The source also exposes a room count; do not publish room diagnostics. Health does not identify the deployed SHA: verify the host's deployment record separately.
4. Load the title and its same-origin cover; confirm the pinned Three.js CDN loads, Socket.IO connects over WSS, and two independent devices create/join and agree on state. Test the physical-phone checklist in `reports/OVERNIGHT_HANDOFF_2026-10-27.md`, including orientation, audio unlock, background/reconnect and a portal.
5. Record a controlled process restart: existing rooms may disappear, stale reconnect must fail clearly, and new room creation/join must work. Distinguish this from a temporary transport disconnect, where same-process recovery should preserve eligible identity and state.
6. Rehearse rollback using the host's verified deployment controls or a separate checkout of the recorded known-good SHA. Never reset or switch this shared active worktree. Restore the previous artifact/configuration, repeat health and two-client creation/join, and record the observed result. Notify players before process replacement; do not promise room restoration. Do not label rollback ready merely because a Git SHA exists.

### Deployment evidence record — fill from observation

| Field | Current value |
| --- | --- |
| Deployed SHA / deployment ID | MISSING |
| Public HTTPS URL / health result / time | MISSING |
| Host region, size, cost and lifecycle | Awaiting required DigitalOcean selection; no resource created here |
| WSS, polling and allowed/denied origin results | MISSING |
| Desktop + physical phone models / browsers | MISSING |
| Same-process reconnect / restart recovery | Public evidence MISSING |
| Previous good artifact / rollback rehearsal | MISSING |
| Final screenshot set / continuous recording | MISSING |

## Evidence carried forward, with limits

- The completed release-sprint run records 33 syntax-checked files and 77/77 current-worktree tests for the protocol-QA milestone. Those are historical results, not tests rerun for this document or a clean final candidate certification. See `docs/QA_PROTOCOL_BOUNDARY_2026-10-28.md`.
- `reports/OVERNIGHT_DESKTOP_TARGETING_2026-10-28.md` records desktop selection/strike evidence with its final-edit limitations; touch and Barkwing playthrough remain open.
- `reports/OVERNIGHT_SOAK_RESULT_2026-10-28.md` records a completed local 1800-second transport sample. Its shared-process memory growth remains an investigation gate; no public endurance, full campaign or server-only memory verdict follows.
- This milestone changes only this package and the asset ledger. Source/hash/dimension checks and staged documentation review are its validation; no new runtime or provider behavior is claimed.
