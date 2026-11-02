# Single-process hosting decision, 2026-11-02

Reviewed local source: `qa/final-sprint-integration` at `1dc9b6580df68baeed2a4365f81cf967f511d63a`, plus the bounded test and checklist change in this milestone. This is a decision for the $0 portfolio preview, not an approval to publish or a deployed-host test.

## Decision and observed contract

Run one Node web service for static files and Socket.IO, with one authoritative process and temporary in-memory rooms. The checked-in `render.yaml` requests one Free service and contains no database, disk, replica count, or shared-state service. `server/server.js` owns room maps, socket bindings, reconnect-token digests, the simulation scheduler, and the `/healthz` response inside `createGameServer()`. Shutdown disposes rooms and closes Socket.IO. A new process cannot restore an active room or honor its former reconnect capability.

The new local `tests/server.test.js` regression creates a room, closes that server, starts a fresh instance, and verifies the old room code cannot join and the old token cannot rejoin. This establishes process-local behavior only. It does not simulate Render sleep, restart timing, public routing, or two-device reconnection.

Fresh local evidence on 2026-11-02: `node --test tests/server.test.js` passed 24/24 and the full `npm test` suite passed 126/126 with permitted loopback access. `npm run check` syntax checked 52 JavaScript files, and `git diff --check` passed. A restricted first attempt failed at WebSocket handshakes before assertions; the loopback run supplied the test evidence. The full suite is local automated evidence, not human or public-host acceptance.

## Player and operations impact

- Players must create a new room after a process restart or idle sleep. The game must not promise durable sessions or a recoverable in-progress campaign across that boundary.
- `/healthz` reports process health, room count, tick rate, and an optional deploy revision. A healthy response does not prove gameplay, reconnect, public WSS, or campaign completion.
- Keep deployment to one process. Adding replicas without shared authoritative room state can route players in one room to different processes. A future multi-process design needs explicit shared authority, a compatible Socket.IO adapter, and routing that also handles polling.
- Before linking a public preview, verify the assigned origin, exact deployed revision, HTTPS/WSS, two independent devices, full campaign, and a real restart with fresh room creation and player-facing recovery guidance. These remain open release gates.

No player feedback was exported. No issue-triggered repair workflow, hosting change, push, or deployment was made for this decision.
