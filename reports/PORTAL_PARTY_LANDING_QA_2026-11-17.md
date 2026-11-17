# Portal party landing check, 2026-11-17

**Checkout:** `qa/final-sprint-integration`, starting HEAD `5181b664469a6091f2d90581a7c58220e8a33852`.
**Scope:** One bounded part of the open Gate 1 portal item. Preserve the prior untracked capture and log artifacts.

## Finding and change

The prior landing check tested each traveler against destination bounds and obstacles, but it did not reserve the fallback coordinate chosen for another traveler. Two players could therefore receive the same valid point. The server now plans the full party with a minimum center spacing of twice the configured player collision radius. A vault shift, later floor transfer, or cycle restart rejects an unsafe landing before changing shared room geometry. The client still cannot choose a destination.

## Fresh local evidence

| Check | Result | Limit |
| --- | --- | --- |
| `node --test --test-name-pattern='portal landing reserves space' tests/five-floor-integration.test.js` with command-local `NODE_PATH` to the sibling main checkout's installed dependencies | Passed 1/1. Two travelers cannot fit in the narrow destination, so the portal returns `NO_SAFE_SPAWN` on first request and replay. Their positions, space revision, and trap state remain unchanged. Six travelers receive distinct positions at least 0.7 world meters apart in an open destination. | In-process fake transport and test geometry. |
| `node --test tests/five-floor-integration.test.js` with the same `NODE_PATH` | Passed 3/3, including the complete fixture route and cycle restart. | The campaign fixture uses boosted health and is not normal-health human play. |
| `npm run check` | Passed, 55 JavaScript files syntax checked. | Syntax only. |
| Focused `tests/server.test.js` portal command | Failed before assertions because the restricted command environment blocked the local WebSocket handshake. | No current real Socket.IO pass from this run. |
| `git diff --check` | Passed. | Formatting only. |

The broader portal gate remains open pending local Socket.IO and independent browser checks, including stale sessions, disconnects, and 2/4/6-player travel. The full release remains **NO-GO**. No player feedback was exported or issue-triggered AI repair enabled.
