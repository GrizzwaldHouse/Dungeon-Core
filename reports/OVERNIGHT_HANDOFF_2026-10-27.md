# Dungeon Core Crawler overnight handoff — October 27, 2026

## Exact starting point

- Worktree: `C:\Users\daley\Projects\HandshakeGame_MSI\ChatGPT_MSI\DungeonCoreCrawler`
- Branch: `gameplay/release-integration`
- HEAD: `b96c06ac109f97237bdca00639dac4b41a55cf85` (`Record two-client intro vote evidence`)
- Code candidate: `d637aabdcd8e4c019de746f976cd6bc8eeb11435`; `b96c06a` changes documentation only.
- `main` remains preserved at `eeabf4108d5def29c8bf38605ab269096913e549`.
- `design/dusk-qa` remains at reconciled merge `c70683b9c6ed719ad2ea5dcd5fa7cf5878a07f2f`.
- The integration worktree has no tracked edits. Eleven generated concept PNGs remain untracked and must stay unstaged until a human approves provenance and an asset milestone.

## Fresh evidence

- `npm run check`: 30 JavaScript files passed.
- `npm test`: 72 of 72 tests passed.
- Two independent browser tabs joined one room, showed the same two-human roster, moved from 0/2 to 1/2 votes, completed the skip on the second vote, and removed the briefing from both clients.
- Both browser consoles showed zero warnings and zero errors during that check.
- This is desktop evidence, not physical-phone evidence.

## Short demo tonight

1. In this repository, run `npm start`.
2. Open the printed HTTP address in a browser.
3. Create a room and add mock explorers, or join from a second browser.
4. Confirm the Guild briefing; cast all connected-human votes to skip it.
5. Begin the expedition, move and attack, switch between angled and top-down camera modes, claim a supply, and enter a portal.

Do not present a LAN or public URL until the server binding and network path are verified. A public-phone demo remains a separate hosting gate.

## Construction pipeline

The game is built as server-authoritative vertical slices, not as a visual-only level stack. Browser clients send movement and action intent. The Node.js and Socket.IO server owns collision, health, damage, loot, encounter state, portals, XP, reconnect continuity, and the fixed 30 Hz simulation. The client renders snapshots and provides keyboard, touch, camera, audio, and accessibility controls.

The current campaign route is:

`Floor One -> Rest -> Floor Two -> Rest -> Floor Three -> Rest -> Deepwood -> Floor Four -> Rest -> Floor Five -> stronger-cycle restart`

Each encounter has a bounded server module and focused tests. It is integrated into the transition pipeline only after its state and failure behavior are deterministic. Floor Five currently restarts a stronger cycle; the approved victory/results choice is still open work.

## Overnight agent-team queue

1. **Builder + server tests:** add explicit server-validated target intent for airborne Barkwings. Keep client actions as intent only; reject stale, unavailable, or invalid targets. Add focused state and transport tests before client controls.
2. **Builder + QA:** add the approved post-Floor-Five results state and an optional harder-cycle selection. Preserve the existing stronger-cycle code behind that explicit choice and add rapid/double portal regression tests.
3. **QA:** run browser-sized checks at 390 x 844 portrait and landscape for intro voting, live-region stability, camera preference, reconnect, focus, scrolling, safe controls, and console errors. Keep physical touch, rotation, safe-area, and audio-unlock gates open for the real phone.
4. **QA + performance:** run the 30-minute local soak and record memory growth, timing, disconnects, and console/server errors against the exact commit.
5. **Design QA:** review the dusk cover and layout boards for crop, text size, contrast, and gameplay readability. Do not merge `design/dusk-qa` back into integration and do not stage generated concept PNGs without provenance approval.
6. **Git lead:** before every milestone, re-check branch, HEAD, status, ownership, ignored files, and staged diff. Stage explicit paths only; never push, reset, clean, delete, or change remotes.
7. **Asset/audio leads:** inventory gaps and write contracts only. Do not claim Blender models, rigs, animation sets, finished audio, or licensed production assets without direct files and runtime evidence.

## Tomorrow's physical-phone acceptance gate

1. Record the exact commit, phone model/OS/browser, desktop browser, and verified reachable address.
2. Create on desktop and join on the phone with distinct names; compare rosters.
3. Cast one intro vote on each device; confirm 1/2 and then shared completion.
4. Move each player independently, fight the same enemy, claim supplies, and cross one portal; compare health, enemy state, inventory, floor, and objective.
5. Background and reconnect the phone; confirm identity and progression continuity.
6. Test portrait/landscape, physical touch, safe areas, keyboard appearance, camera modes, and direct-touch audio unlock.
7. Record all browser/server errors and keep the gate open on any mismatch.

## Copy-paste prompt for a new conversation

Continue the Dungeon Core Crawler release sprint from `C:\Users\daley\Projects\HandshakeGame_MSI\ChatGPT_MSI\DungeonCoreCrawler`. First read `AGENTS.md`, `docs/GIT_WORKFLOW.md`, and `reports/OVERNIGHT_HANDOFF_2026-10-27.md`. Verify the exact branch, HEAD, worktree status, all active worktrees, and current automation state before changing anything. The expected integration baseline is `gameplay/release-integration` at `b96c06ac109f97237bdca00639dac4b41a55cf85`; stop and report a handoff regression if it differs unexpectedly. Preserve `main`, the reconciled `design/dusk-qa` worktree, and all untracked concept PNGs. Coordinate Git, QA, and Builder leads with non-overlapping ownership. Continue only bounded local work: server-validated Barkwing target intent, post-Floor-Five results with optional harder cycle and portal regression tests, responsive browser QA, and the 30-minute soak. Run `npm run check` and `npm test` after code changes, inspect staged diffs, and commit verified milestones using explicit paths. Do not push, deploy, install tools, reset, clean, delete, expose secrets, or claim physical-phone, public-hosting, remote-GitHub, Blender/3D, or finished-audio gates without fresh direct evidence. Surface meaningful progress and blockers in phone-readable summaries.
