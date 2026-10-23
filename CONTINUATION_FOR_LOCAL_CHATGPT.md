# Continuation Brief — Dungeon Core Crawler

You are continuing the HandShake Dungeon Core Crawler project in the local repository:

```text
C:\Users\daley\Projects\HandshakeGame_MSI\ChatGPT_MSI\DungeonCoreCrawler
```

Work in this repository. Start by reading its `README.md`, `AGENTS.md` files if present, `Technical-Architecture.md`, `Runtime-File-Architecture.md`, `package.json`, and `server/server.js`. Preserve user-supplied archives and reference files in the parent `ChatGPT_MSI` folder. Do not publish a remote repository, commit, deploy, or modify the parent archives unless the user asks.

## Current verified state

- The repo contains the initial authoritative Socket.IO server at `server/server.js`, architecture documents, `package.json`, local start/check scripts, error-report guidance, and a multiplayer bug issue form.
- `package.json` declares `socket.io` and currently has `start` and syntax-only `check` scripts.
- The user reports that `npm install` completed successfully in this exact repository on 2026-10-20: 21 packages added, 22 audited, zero vulnerabilities. `node_modules/` and `package-lock.json` are present. Treat that as user-reported evidence; verify the current files before relying on it.
- A syntax-only check passed on the server file before it was copied into this repo. No behavioral or multiplayer integration tests have been run.
- The client engine, automated tests, measured performance baseline, portal gameplay, progression logic, and final portfolio documentation are not implemented yet.

## User-provided target configuration and grading guidelines

Create `client/handshake_guidelines.md` and include this text faithfully (minor Markdown cleanup is fine; do not change requirements):

```markdown
# Target Project Configuration & Grading Guidelines

## Core Inspirations
- Gameplay Dynamics: Inspired by 'Gauntlet' (multiplayer co-op dungeon exploration, distinct classes, shared survival).
- Combat & Pacing: Inspired by 'Halo 2' (tight map control, tactical positioning, real-time spatial awareness).
- Aesthetic & World Rules: A shifting fantasy environment (Alice in Wonderland/Narnia). Portals randomly transition players to entirely different 3D room segments or trap zones. Hidden walls reveal secret chambers upon proximity.

## Technical Framework Constraints
- Architecture: Authoritative server-client architecture. The client only sends inputs and renders what the server permits.
- Network State Layer: Real-time 3D coordinate syncing (X, Y, Z positions) over WebSockets using Socket.io.
- Viewport Engine: 3D browser rendering utilizing vanilla HTML5 Canvas or Three.js.
- Matchmaking Rules: Strict compliance with the Handshake Challenge—zero login, zero downloads. Session access must be granted purely via 4-character room codes.

## Academic Quality & Grading Rubric
1. Client-Side Prediction: Basic interpolation or extrapolation must be planned for player positions to avoid visual rubber-banding at 30Hz network ticks.
2. Complete Error Handling: No placeholders or 'stub functions' in the networking loops. All socket event listeners must include clear validation checks.
3. Modular File Architecture: Separation of concerns—networking logic must remain entirely separated from the 3D graphics rendering loops.
```

## Required work sequence

### 1. Audit and establish a test baseline

Inspect the implementation before changing it. Keep a short checklist of confirmed behavior, missing behavior, and defects found. Add automated tests and a repeatable test script; this continuation explicitly authorizes creating and running tests.

Use Node's built-in test runner where practical. Add `socket.io-client` as a development dependency only if needed for black-box integration tests. Bind tests to loopback and an ephemeral port (`port: 0`); never depend on or overwrite port 3000. Make every test close clients, timers, sockets, and server even after assertion failures.

At minimum, test:

1. Room creation returns a unique four-character code from the allowed alphabet; invalid codes fail with a stable error.
2. Two clients in different rooms never receive each other's snapshots or events.
3. Capacity, lobby phase, host start rules, malformed payloads, and duplicate/old input sequence numbers are enforced.
4. Client-supplied positions are ignored; movement intent is speed-clamped, normalized, constrained to world bounds, and blocked by server-owned AABBs.
5. Six-player movement and snapshot delivery work; measure actual snapshot interval distribution and server tick duration rather than assuming the configured 30 Hz is achieved.
6. Disconnect freezes that player's movement, preserves the room, permits valid reconnect within grace, rotates the reconnect token, rejects stale sockets/tokens, and handles grace expiry.
7. Proximity discovery is server-validated, idempotent, and room-scoped. Verify a forged/out-of-range discovery request cannot reveal a node.
8. Health/damage cannot be changed through a client event. Exercise `applyDamage` as a trusted server API and verify the snapshot updates.

Do not claim the server is production-ready merely because syntax checks pass. Report commands, pass/fail counts, timing samples, known gaps, and reproducible defects.

### 2. Build testing scripts, measurements, and game parameters

- Add `test/` (or `tests/`) with unit/integration coverage and a package script such as `npm test`.
- Add a repeatable local PowerShell entry point that runs checks and tests and returns a failing process code on failure.
- Add a small load/measurement script that creates several rooms and up to six clients per room, records tick/snapshot counts and interval p50/p95/p99, command round-trip p50/p95/p99, rejected input counts, and server process memory. Keep run duration and room/player counts configurable. Keep it bounded and safe for a developer machine.
- Centralize gameplay/network tunables in a validated parameter module or JSON file: 30 Hz target tick, 2–6 players, speed, collider radius, world bounds, disconnect grace, input limits, room-code TTL, exploration thresholds, rush penalty caps, portal weights, health, and progression/contribution weights. Preserve the behavior already defined in the approved architecture. Validate units and ranges at startup; avoid duplicated magic numbers.
- Produce a `docs/TESTING_AND_METRICS.md` that explains exact commands, what each metric means, target budgets, and how to interpret failures. Label proposed targets separately from measured results. Do not invent measurement results.

### 3. Complete the vertical slice in small, testable increments

Follow `Runtime-File-Architecture.md` and keep rendering, network transport, game rules, and UI decoupled.

1. Implement/fix the server room and movement behavior based on tests.
2. Add portal commands whose destination, gate checks, state transition, and outcome are chosen and validated by the server. Make retries idempotent. Keep the whole-party versus split-party policy explicit.
3. Add anti-rush exploration gates, readable warnings, capped penalties/enemy scaling, and tests proving optional secrets do not accidentally trigger required-content penalties.
4. Add floor completion and group XP with a shared base award plus a bounded contribution bonus. Ensure deterministic remainder distribution and idempotent rewards.
5. Build `client/index.html` and `client/app.js` (or a well-justified modular client structure) with Three.js, keyboard input, local prediction/reconciliation, remote interpolation, and server-authorized hidden-wall reveal. Client rendering must never choose portal destinations or authoritative outcomes.
6. Test reconnect/resync across the client/server boundary and verify visible snapshots exclude undiscovered secrets and server-private fields.

Keep scope paced: finish and verify a vertical slice before polishing or adding unrelated features. Preserve the user's 4-character, no-account join requirement; reconnect tokens are transient session capabilities, not accounts.

### 4. Portfolio and production handoff

- Update `README.md` to under 400 words, recruiter-facing, and accurate to tested implementation. Explain authoritative state, 30 Hz behavior with measured caveats, prediction/interpolation, room lifecycle, and contribution design only where implemented and verified.
- Add a production optimization checklist covering payload size, per-room interest management, snapshot/delta strategy, backpressure, security/rate limits, observability, horizontal scaling, persistence, and hosting constraints for long-lived WebSocket connections.
- Do not claim Render/Vercel compatibility without verifying the current deployment model. Note any platform-specific limits as unresolved research if not checked.

## Working rules for this continuation

- Read local instructions first and preserve user data. Keep secrets, room codes, reconnect tokens, IPs, and raw logs out of commits/issues.
- Make small, reviewable edits. Do not silently replace the approved architecture; record necessary changes and why.
- Install only needed dependencies, preserve the lockfile, and keep TLS verification enabled.
- Run the new automated checks after implementation because testing is expressly requested here.
- Finish with a concise report linking changed files, commands/results, measured values, and the remaining gaps. Do not state that unimplemented work is done.
