# Test results — October 24, 2026

## Confirmed in this session

- `npm test`: **52 passed, 0 failed** on `main` after extending the transport-free campaign test. This includes current Socket.IO loopback coverage plus the complete in-process route through ordered Floor Four runes, Rune Guardian defeat, Floor Five Warden health phases, Shardling cleanup, the fifth floor award, and the stronger-cycle return to Floor One.
- `node --test tests/five-floor-integration.test.js`: **2 passed, 0 failed**. The complete campaign case passed in about 19.8 seconds and now proves Floor Four through the cycle-two Sentinel using only acknowledged player intents and public snapshots.
- `npm run check`: passed for every server and client JavaScript entry in the package manifest.
- `node --test tests/client-ui.test.js tests/touch-controls.test.js tests/floor-two.test.js tests/floor-three.test.js tests/floor-four.test.js tests/floor-five.test.js`: **31 passed, 0 failed** after floor-four/five integration edits.
- The complete campaign test accelerates attack cooldown with a monotonic test clock; it proves ordering and authority, not real-time pacing.
- Figma SVG XML parsed and Notion CSV parsed to 26 task cards and 9 columns by their assigned agents.

## Not yet established

- Mock-party behavior is a **failed release gate**, not an untested claim. Current bots receive a rotating `PATROL` input vector only. No authoritative goal selection, independent room exploration, enemy targeting, attack request, downed-ally detection, revive action, recovery-room objective, or post-recovery resume subsystem exists. The current test named `host creates a moving mock party that shares authoritative collision` proves movement and collision only.
- The complete campaign now passes automated transport-free and local network tests, but no current two-browser visual capture, real mobile client, public URL, or six-human acceptance run has been recorded.
- Browser evidence must show this sequence before the mock-party gate can pass: four mocks split toward distinct dungeon goals; at least one mock changes target when an enemy appears; mocks damage the Sentinel and a boss through server events; a mock detects and approaches a downed human; one healing charge is consumed by a server-confirmed revive; the revived human and helper separate and resume objectives; the party enters a recovery room and later resumes combat. Capture snapshots, `combat:enemy-hit`, `player:downed`, `player:revived`, stage transitions, and browser console errors. Visual orbiting alone is a failure.
- Phone/computer multiplayer remains reserved for Marcus's morning acceptance pass. It must validate room joining, shared movement, combat, pickups, floor transitions, disconnect/rejoin, responsive touch controls, and consistent authoritative snapshots across both devices.

Run `npm run measure`, complete the browser evidence sequence above after mock-party AI exists, and perform the real phone/computer pass. Record exact command, revision, timestamp, client count, and failures before checking those release gates.
