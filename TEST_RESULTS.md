# Test results — October 24, 2026

## Confirmed in this session

- `node --test tests/client-ui.test.js tests/touch-controls.test.js tests/floor-two.test.js tests/floor-three.test.js tests/floor-four.test.js tests/floor-five.test.js`: **31 passed, 0 failed** after floor-four/five integration edits.
- `node --test tests/five-floor-integration.test.js`: **1 passed, 0 failed**. In-process two-human path verified first-floor Sentinel, shift, trap disarm, one-time XP, recovery supplies, and entry into the sealed floor-two Keeper encounter.
- `node --check server/server.js`, `node --check client/app.js`, and `git diff --check`: passed on the working-tree candidate before this handoff.
- Figma SVG XML parsed and Notion CSV parsed to 26 task cards and 9 columns by their assigned agents.

## Not yet established

- The full `npm test` result is not clean for the new revision. The legacy server test still assumed floor one ends the entire room; it was updated to expect the new rest transition, but the exact integrated revision has not passed the entire network suite.
- A focused Socket.IO run failed to establish a loopback WebSocket under this session's network restriction (`WebSocket connection failed: unknown`). This is an environment restriction result, not proof that the game server passed or failed. The in-process transport test proves only the path named above.
- No current two-browser, real mobile, public URL, or six-human acceptance run has been recorded.

Run `npm run check`, `npm test`, and `npm run measure` in a local environment with loopback WebSocket access. Record exact command, revision, timestamp, client count, and failures before checking release gates.
