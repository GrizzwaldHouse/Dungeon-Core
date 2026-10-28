# Next executable actions

1. From this repository, read `AGENTS.md` and `docs/GIT_WORKFLOW.md`; inspect branch, HEAD, Git status, and all uncommitted diffs.
2. Deepwood now occupies the approved slot after Floor Three recovery and before the existing Floor Four rune trial. Preserve the `design/dusk-qa` title-cover line, now reconciled with Deepwood at merge `c70683b`, as the canonical art reference; it still needs browser crop and form-interaction QA before branch integration. The party intro skip contract and accessible lobby control are implemented through `73c7e4f`; verify them in two browsers and the phone pass. Next add explicit server-validated target intent for airborne Barkwings, then an approved flying silhouette, ice guardian, and mage counterplay. Prioritize the approved victory-after-Floor-Five flow with optional harder-cycle selection and rapid portal regression coverage.
3. Start the exact candidate with `npm start`, open two browsers, and visually capture independent mock exploration, boss combat, a downed human, a server-confirmed mock revive, recovery, and resumed play. A screenshot sequence is incomplete evidence if video recording remains unavailable.
4. Extend the passing local timing and snapshot-size baseline with a 30-minute memory-growth run; later repeat latency checks against the authorized public staging URL.
5. Complete Marcus's computer-plus-phone acceptance pass: join the same room, exercise movement/combat/pickups/floor transition, disconnect/rejoin, touch controls, sound unlock, and snapshot agreement. Keep this gate open until observed on both devices.
6. Audit rendered collision across every floor and rerun `npm run check` plus `npm test` after any change. The Three.js timer deprecation warning is resolved and covered by a regression test.
7. Update evidence documents and create the next reviewed local milestone with explicit paths. Do not push, deploy, or publish without authorization.

Figma and Notion require sign-in before the local SVG/CSV can become cloud boards. Their import instructions are in `docs/FIGMA_DESIGN_REVIEW.md` and `docs/NOTION_BOARD_HANDOFF.md`.

## Computer-plus-phone acceptance steps

1. Connect both devices to the same reachable server URL. On the computer, create a room and keep the four-character code visible.
2. On the phone, enter a distinct explorer name and join that code. Confirm both rosters show the same two human players before starting.
3. Start from the computer. Move each player separately with keyboard and touch controls; confirm neither client teleports or controls the other.
4. Fight the same enemy from both devices, collect a personal supply on each, and compare health, enemy health, objectives, floor state, and party roster after each acknowledged action.
5. Down one player, complete a revive from the other client or a server-owned mock, and confirm the revived health and healing-charge change match on both screens.
6. Transition one floor, then disconnect the phone, reconnect with its retained session, and verify identity, XP, health, and inventory continuity.
7. Toggle sound after a direct touch, rotate the phone once, and verify the touch controls remain usable without covering critical HUD actions.
8. Record the candidate commit, temporary room code, device/browser versions, observed latency, console/runtime errors, and pass/fail for every step. Do not check the release gate if any state diverges.
