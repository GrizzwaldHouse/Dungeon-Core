# Claude Code build prompt: continue Dungeon Core Crawler

Copy the instruction packet below into Claude Code while its working directory is this repository root. It is an incremental build brief for the existing game, not a request to create a second application.

```text
TITLE: Extend the Existing Authoritative Dungeon Core Crawler

PROJECT ROOT:
C:\Users\daley\Projects\HandshakeGame_MSI\ChatGPT_MSI\DungeonCoreCrawler

OBJECTIVE:
Advance the existing 2–6 player cooperative 3D dungeon prototype through its next playable vertical slice: server-owned shifting portals, exploration-sensitive trap consequences, and group floor progression. Preserve the working lobby, movement, discovery, sentinel combat, reconnect, and browser rendering. Do not build a separate production_game directory.

NONNEGOTIABLE GAME CONTRACT:
- Players use unique four-character room codes without accounts or client downloads. Temporary reconnect capabilities are separate from room codes.
- Node.js and Socket.IO own room membership, transforms, health, collisions, enemy behavior, portal routing, exploration, combat results, and rewards. Clients send intent; they do not choose a destination or award XP.
- Keep the 30 Hz fixed server simulation and room-scoped snapshots. Continue server-side AABB collision and input validation. Handle duplicate commands and disconnects without double-applying actions or corrupting another room.
- Keep Three.js rendering isolated in client/render.js, Socket.IO and recovery in client/network.js, and UI/input orchestration in client/app.js. Preserve the existing CDN approach and DOM HUD. Do not introduce a new bundler, framework, or authentication stack just for this slice.
- Treat DESIGN_BOARD.csv and Technical-Architecture.md as design intent. Code and observed behavior determine what is implemented.

STEP 1 — AUDIT BEFORE EDITING:
1. Inspect the file tree and working state without resetting, cleaning, deleting, or overwriting user work. If git status fails, report the error and continue using a file inventory.
2. Read DESIGN_BOARD.csv, README.md, Technical-Architecture.md, Runtime-File-Architecture.md, package.json, server/server.js, server/config/game-parameters.js, shared/dungeon-layout.js, client/index.html, client/app.js, client/network.js, client/render.js, and existing tests/docs. Inspect .handshake/, SYSTEM_RULES.md, CODE_COMMENTING_STANDARD.md, AGENTS.md, and CLAUDE.md if present; report absent files rather than inventing them.
3. Record a short implemented-versus-planned matrix. In the current baseline, shifting portals, anti-rush penalties, floor completion, and contribution-weighted XP are planned; verify this against the source before work.
4. Choose the smallest complete vertical slice and state the event contract, state owner, expected UI change, and acceptance evidence before editing. Prefer portal transition first, then trap consequences, then floor progression. Preserve the baseline after each slice.

STEP 2 — IMPLEMENT SERVER-OWNED GAMEPLAY:
A. Model a room's dungeon graph, active space, portal volumes, destination choices, discovered chambers, objective/exploration progress, trap state, and floor status as explicit server-owned data. Keep private destination information out of snapshots until revealed or entered. Put stable tuning values in server/config/game-parameters.js and geometry/collision definitions in the existing shared layout or a focused server module. Avoid a parallel state tracker.
B. Accept portal interaction as an intent with an action identifier. Validate room membership, living player state, proximity/portal bounds, room phase, replay/duplicate action, and destination eligibility. Make the server choose the destination, update player placement and collision geometry atomically, and send only the state each player is allowed to know. Resolve disconnects and reconnects against the authoritative current room state.
C. Measure exploration with concrete server-side objectives such as discovered nodes, solved portal puzzles, or disarmed traps. If a player enters a portal early, apply a bounded, time-limited status penalty or a bounded enemy escalation according to DESIGN_BOARD.csv. Define the exact threshold and cap in configuration. Never infer completion solely from time spent or client-reported metrics.
D. On validated floor completion, grant the same base floor advancement and base XP to eligible connected party members once. Calculate a capped contribution bonus from server-recorded damage, portal solutions, and trap disarms. Define tie handling, late join/reconnect behavior, and idempotent reward application. Persist only what this local accountless session actually supports; do not imply durable account progression.
E. If the design includes an amber trap warning, stamp its start/end in server ticks and use 45 ticks at 30 Hz for a 1.5-second telegraph. The client displays that server state; only the server activates damage or collision. Keep visual effects and scoring feedback purely presentational.

STEP 3 — PROJECT STATE INTO THE EXISTING CLIENT:
1. Extend the existing Socket.IO event adapter in client/network.js with validated command/ack and snapshot handling. Maintain reconnect and stale-snapshot handling. Do not put Three.js objects or renderer calls in this module.
2. Extend client/render.js to show permitted portal, chamber, hazard, enemy, and player state. Retain interpolation or bounded prediction for 30 Hz updates; snap only on authoritative space transitions or large corrections. Reveal or hide a secret wall only when a server snapshot/event confirms it. Keep dynamic lights bounded for six players and mobile-scale browsers.
3. Extend client/app.js and client/index.html with readable room, party, health, floor, portal, trap, and XP feedback as needed. Preserve WASD/arrow input, keyboard focus rules, create/join/rejoin controls, and accessible status text. Keep HUD text and button behavior in DOM instead of encoding them inside a WebGL canvas.
4. Any camera shake, particles, or hit feedback must follow authoritative events, be brief, and not obscure controls or game state.

STEP 4 — VALIDATION AND EVIDENCE:
1. Add focused automated tests for normal portal entry, premature entry, invalid distance, blocked geometry, duplicate action, cross-room isolation, simultaneous players, disconnect/reconnect during transition, trap timing, and one-time floor rewards. Keep test fixtures deterministic. Do not claim visual behavior from a Node test alone.
2. Run npm run check, npm test, and the existing measurement script: node scripts/measure.js --duration=4 --rooms=2 --players=6. Compare 30 Hz snapshot cadence and tick duration against the documented local baseline; report the sample conditions and any regression.
3. Follow docs/TWO_BROWSER_COMBAT_PLAYTEST.md for manual browser checks, and extend it for portal/trap/floor behavior. If browser control is unavailable, mark those checks unverified and give exact manual steps.
4. Run python validate_environment.py only if that file exists after the audit and its instructions apply. Its absence is not a reason to create a placeholder validator or to claim it passed.
5. Finish with a manifest of changed files, event/state contract, commands and actual results, browser observations versus unverified items, remaining risks, and the next bounded slice. Do not describe planned mechanics as working until implementation and tests support them.

SAFETY OF EXISTING WORK:
Never use destructive Git commands, delete data paths, or replace the existing server/client wholesale. Do not publish, deploy, or install unrelated dependencies. Work within this repository and preserve user changes discovered during the audit.
```
