# Local accountless-room security boundary review — 2026-10-29

Revision inspected: `c8dc4606843e9cd439e9f4d8db39daaefc7b9182` on `gameplay/release-integration`. This is a source review and one local protocol test, not a public-host penetration test. Concurrent uncommitted client, test, and release-document changes were present and left untouched.

## Observations

- Room codes use four symbols from a 32-symbol alphabet (`server/server.js:30-31, 115-124`), giving 1,048,576 possible codes. `room:join` validates the format, lobby phase, name, and capacity (`server/server.js:461-481`). Codes are access locators, not authentication secrets.
- `room:create`, `room:join`, and `room:rejoin` are bound directly to socket events (`server/server.js:1608-1610`). The reviewed server path has no per-socket or per-address attempt budget. A public host needs bounded create/join/rejoin attempts and monitoring before this gate can pass. Avoid logging room codes or reconnect tokens in that monitoring.
- Reconnect uses a random token, stores a SHA-256 digest, requires a disconnected player in the matching room, and rotates the token on success (`server/server.js:132-134, 486-506`). The positive rotation and stale-token behavior have existing tests, but this review did not run an abuse or timing probe.
- Socket.IO limits payload size through `config.maxPayloadBytes` (`server/server.js:149-150`), and input accepts only safe sequence integers and finite vectors (`server/server.js:586-609`). Display names strip control characters and are length limited (`server/server.js:69-73`). This is source-level validation evidence only.
- Socket.IO CORS uses `config.corsOrigin`, whose default is `*` (`server/server.js:149`, `server/config/game-parameters.js:186`). The staging deployment must set an explicit origin and verify actual browser and non-browser connection behavior. CORS alone is not an authorization boundary.

## Fresh local check

`node --test tests/protocol-boundary.test.js` passed 1/1 with permitted loopback WebSocket access. The restricted sandbox first failed at the WebSocket handshake before assertions; the same command passed with loopback permission. This checks six joins and seventh-player rejection, not guessing resistance, rate limiting, public origin enforcement, or a real-device session.

## Release decision for this item

Gate 4 security inspection remains **open**. Before staging: implement and test attempt budgets, set and verify the intended origin, probe malformed/oversized payloads and reconnect replay, and review logs for capability redaction without exporting player reports. Keep confirmed defects in `reports/defects/` for local human review.
