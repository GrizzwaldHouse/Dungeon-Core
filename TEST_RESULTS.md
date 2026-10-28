# Test results — October 27, 2026

## October 27 Deepwood integration branch

- On `gameplay/release-integration`, `npm run check` exited 0 for 28 JavaScript files and `npm test` passed **60/60** with zero failures after the Deepwood encounter and approved camera selector were integrated. `node --test tests/five-floor-integration.test.js` passed 2/2 through Deepwood, the rune trial, the Warden, and cycle restart.
- The three Deepwood unit checks prove one-time 70% and 35% health phases, bounded airborne Barkwing spawns, a 45-tick root telegraph, damage/root expiry, disconnected-player safety, and a one-time clear. The full campaign test proves the portal cannot advance before Deepwood clear and that Floor Four still starts afterward.
- These checks do not prove visual Barkwing silhouettes, deliberate player target selection, mage counterspells, a real-browser encounter, or phone controls. The selected Deepwood cover is displayed in this gameplay checkout; its canonical art contract and design QA history remain isolated on `design/dusk-qa`.

## October 27 intro-vote and camera QA milestones

- On `gameplay/release-integration` through `73c7e4f6188825f8859e99b59e541959c8b4e6f1`, `npm run check` exited 0 for 30 JavaScript files and `npm test` passed **72/72** with zero failures.
- State and Socket.IO tests prove connected-human unanimous voting, bot and unavailable-player exclusion, idempotent votes, a 1,500-tick/50-second server timeout, disconnect re-evaluation, one-way completion across reconnect, safe aggregate snapshot counts, invalid-vote rejection, and non-blocking room start.
- Client checks execute the real angled and top-down camera transforms, prove they emit no network actions, cover blocked storage, and verify the accessible dusk briefing sends an opaque vote while snapshots remain authoritative. The live region updates only when its displayed value changes, a final-vote acknowledgement uses accurate copy, and a same-session reconnect preserves the local submitted marker.
- GitHub workflow configuration now runs `npm ci`, `npm run check`, and `npm test` for pushes and pull requests. This is local configuration evidence only; no remote GitHub run is claimed.
- Real two-browser intro-vote behavior, desktop/mobile framing, touch voting, and the computer-plus-phone acceptance gate remain unverified.

## Confirmed in this session

- `npm test`: **57 passed, 0 failed** after migrating the renderer from deprecated `THREE.Clock` to the current `THREE.Timer` lifecycle and adding a regression check. This retains deterministic measurement-summary, mock-party cooperation, reconnect continuity, forged-event rejection, Floor Five reconnect, and full-cycle coverage.
- `node --test tests/five-floor-integration.test.js`: **2 passed, 0 failed**. The complete campaign case passed in about 19.8 seconds and now proves Floor Four through the cycle-two Sentinel using only acknowledged player intents and public snapshots.
- `npm run check`: passed for every server and client JavaScript entry in the package manifest.
- `node --test tests/client-ui.test.js tests/touch-controls.test.js tests/floor-two.test.js tests/floor-three.test.js tests/floor-four.test.js tests/floor-five.test.js`: **31 passed, 0 failed** after floor-four/five integration edits.
- The complete campaign test accelerates attack cooldown with a monotonic test clock; it proves ordering and authority, not real-time pacing.
- Figma SVG XML parsed and Notion CSV parsed to 26 task cards and 9 columns by their assigned agents.
- The mock-party test now proves bots select the authoritative enemy, move independently of the host, damage it through the shared server attack path, switch to `RESCUE` for a downed human, consume one server-owned healing charge, credit one support action, revive to bounded health, and resume `ENGAGE` behavior. Public snapshots expose only each bot's current intent and target ID for diagnostics.
- Client-focused checks passed **9/9** for HUD/touch behavior. A live localhost browser smoke created room `QQ9K`, added four mocks, started Floor One, displayed authoritative vitality/healing values, and showed all four bot intents as `investigate`. A 390 x 844 responsive render completed without a runtime error; the only console item was the existing Three.js `Clock` deprecation warning.
- Exactly three approval-only character/enemy concept sheets were generated from a rendered copy of the current SVG design board under `docs/design/concepts/`. None has been integrated into production.
- `npm run measure` passed at commit `9be2e77` with two rooms and six players per room for four seconds: input acknowledgement p95 **7.44 ms**, server tick p95 **4.19 ms**, tick p99 **5.42 ms**, 264 snapshots broadcast, zero input rejections, 16,936,720-byte heap use, and 82,354,176-byte resident memory.
- The enhanced `npm run measure -- --duration=8 --rooms=1 --players=2` passed with public snapshot payload p50 **1,999 bytes**, p95 **2,001 bytes**, and p99 **2,002 bytes**; input acknowledgement p95 **3.85 ms**, server tick p95 **1.16 ms**, tick p99 **1.72 ms**, 244 snapshots broadcast, and zero input rejections. Heap grew by 5,330,000 bytes and resident memory by 10,350,592 bytes during startup plus the short run. These are local loopback samples, not public Internet latency or long-session leak proof.
- The enhanced `npm run measure -- --duration=8 --rooms=2 --players=6` passed with **498** observed snapshots. Public snapshot payload was p50 **3,934 bytes**, p95 **4,016 bytes**, and p99 **4,018 bytes**; input acknowledgement p95 was **4.20 ms** and server tick p95 was **4.09 ms**. Heap grew by 7,031,608 bytes and resident memory by 20,303,872 bytes during startup plus the short run. The delta is diagnostic only and is not leak proof.
- A five-image browser sequence under `docs/evidence/` confirms a host plus four mocks in room `ZGMA`, visible `patrol` and `investigate` diagnostics, a server-accepted vault shift, party-reported enemy defeats, and a six-player Floor One render. This is partial evidence only.
- Fresh Chrome smoke at `http://127.0.0.1:3001/` confirmed `CONNECTED`, `webgl-ready`, recovery UI hidden, and zero warning/error console entries after the Timer migration. This removes the previously observed Three.js `Clock` deprecation warning without changing authoritative simulation state.

## Not yet established

- Mock-party code and deterministic attack/revive checks now pass, but the **recorded browser gate remains open**. Browser evidence has not yet shown four mocks selecting distinct goals, helping during a boss fight, rescuing a player, entering recovery, and visibly resuming play.
- The screenshot worker reached its usage limit before boss/down/revive/recovery capture, and no video-recording capability was available through the active browser tools. The retained screenshots must not be described as continuous-play or revive proof.
- The complete campaign now passes automated transport-free and local network tests, but no current two-browser visual capture, real mobile client, public URL, or six-human acceptance run has been recorded.
- Browser evidence must show this sequence before the mock-party gate can pass: four mocks split toward distinct dungeon goals; at least one mock changes target when an enemy appears; mocks damage the Sentinel and a boss through server events; a mock detects and approaches a downed human; one healing charge is consumed by a server-confirmed revive; the revived human and helper separate and resume objectives; the party enters a recovery room and later resumes combat. Capture snapshots, `combat:enemy-hit`, `player:downed`, `player:revived`, stage transitions, and browser console errors. Visual orbiting alone is a failure.
- Phone/computer multiplayer remains reserved for Marcus's morning acceptance pass. It must validate room joining, shared movement, combat, pickups, floor transitions, disconnect/rejoin, responsive touch controls, and consistent authoritative snapshots across both devices.

Measure long-session memory growth, complete the browser evidence sequence above, and perform the real phone/computer pass. Record exact command, revision, timestamp, client count, and failures before checking those remaining release gates.
