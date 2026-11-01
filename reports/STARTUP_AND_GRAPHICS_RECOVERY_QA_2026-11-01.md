# Startup and graphics recovery QA, 2026-11-01

Candidate: local `qa/final-sprint-integration` at `d34b5da375319c552ce953e663ef30c4a5c8415d` before this test-only milestone. This report covers source-level UI behavior, not the deployed `e641fb0` revision.

## Verified behavior

- The `file:` launch path hides room entry and tells the player to start the server and use its printed address and port.
- On an HTTPS page with a nondefault port, the reload link uses `location.origin + '/'`. A Socket.IO script load failure reveals startup help and a textual `STARTUP ERROR` state.
- The app's `graphics-state` handler shows a readable overlay for lost or failed graphics, removes it on `ready`, and the Reload game button calls page reload. The renderer emits those states from WebGL context handlers, but this run did not force a real GPU context loss.

## Checks and limits

- `node --test tests/client-ui.test.js`: 14 passed, 0 failed after the final reload-button assertion.
- `npm run check`: 52 JavaScript files passed.
- `npm test`: 125 passed, 0 failed with root `node_modules` through `NODE_PATH` and permitted local loopback. The first sandboxed full-suite attempt failed at WebSocket handshakes before multiplayer assertions and is not counted as a pass.
- No browser rendering, physical phone, accessibility-technology, or public-host recovery was tested here. The October 30 full-release verdict remains NO-GO. Player feedback remains for local human review.
