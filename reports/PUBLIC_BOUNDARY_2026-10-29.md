# Public-demo room and socket boundary

October 29, 2026. Parent checkout baseline: `448e6fcb6bf1d60cc1879d9f4395c5a56a745690` on `gameplay/release-integration`. This report accompanies the containing hardening commit; it does not certify a deployed host or a full public release.

## Ownership and implementation

Read AGENTS.md, Git workflow, secret-handling guidance and the prior security-boundary report before edits. Only `server/server.js`, `server/config/game-parameters.js`, new `tests/public-boundary.test.js` and this report are owned by this slice. Parent-owned static client/story/README changes and original untracked concepts were preserved. No staging, commit, push, infrastructure or credentials were changed by this worker.

- Room creation, joining and reconnect attempts share one per-socket fixed window: 30 attempts per 60 seconds by default. Invalid attempts consume that budget. Budgets are held in a WeakMap with one fixed-size record per socket, so disconnected socket records can be collected.
- One process-wide fixed counter admits at most 300 such attempts per 60 seconds, including attempts from replacement sockets. This avoids an unbounded address map and prevents reconnecting alone from evading all attempt limits. A depleted socket does not continue burning the aggregate budget.
- Live room allocation is capped at 64 rooms, independently of attempt budgets. Capacity rejection occurs before allocating a new room/player/token. New Engine.IO connections are capped at 256. Existing sessions can continue and upgrade while capacity is full.
- CORS configuration is reused as an actual origin admission boundary. Exact HTTP(S) origins come from `corsOrigin` option, then `CORS_ORIGIN`, then Render's `RENDER_EXTERNAL_URL`; multiple exact origins may be configured as a comma-separated list or array. Malformed origin configurations fail before server startup.
- Local default `*` mode permits browser origins matching the actual request Host only. It does not admit arbitrary browser origins. Origin strings with paths, credentials, opaque `null` origins or unsupported schemes are rejected. No X-Forwarded-Host or X-Forwarded-For header is trusted.
- `allowRequest` checks initial polling/WebSocket admission and connection capacity. Engine.IO middleware also checks requests with existing session IDs, covering subsequent polling and transport upgrades. This closes a sid-based gap that an initial-handshake-only check would leave.
- Missing Origin remains allowed for native Node probes and non-browser clients. This is a deliberate compatibility policy: origin validation provides browser isolation, not authentication. Room codes remain public-access locators; reconnect tokens remain the separate opaque capability.
- Copied, aggregate `getMetrics().publicBoundaryRejections` counts expose room-attempt, room-capacity and socket-request refusals. They contain no room codes, tokens, player IDs or addresses, and no new raw diagnostic logging was added.

All rate/capacity numbers are validated bounded server options. They are conservative demo defaults, not measured production capacity. Public hosting must verify Render's actual assigned origin and public HTTPS/WSS before linking the demo.

## Fresh acceptance evidence

`node --test tests/public-boundary.test.js` passed **8/8**, with permitted loopback networking. `npm run check` passed **43 JavaScript files** in the current shared worktree, including the parent's concurrently added story client. `git diff --check` passed. The independent QA lead is responsible for the final whole-worktree suite after this worker freezes its files; this report does not substitute the focused run for that suite.

Covered behavior: failed create/join/rejoin share one socket budget; expiry restores eligibility; other sockets retain their local budget; aggregate limits persist across socket replacement; room cap does not mutate allocation; explicit valid origin is admitted and invalid/opaque origins rejected on polling and WebSocket; native probes work; local same-host origin works while forged forwarded Host does not; connection cap rejects new transports; existing Engine.IO sid cannot bypass origin validation and a valid-origin upgrade still succeeds; invalid bounds and origin configuration reject; explicit CORS_ORIGIN overrides Render's default. Rejection counters are asserted for attempt and room-capacity failures.

The first focused run exposed a test expectation mismatch: Engine.IO responds with HTTP 403/Forbidden to denied polling, but HTTP 400/Forbidden to a denied WebSocket upgrade. Tests now check each transport's actual refusal semantics and positive controls. Existing-sid middleware rejection is HTTP 400/Bad request. No server checks were weakened to fit the tests.

## Limits and open gates

No per-client-IP identity is inferred behind a proxy. Global throttling bounds work but can itself be exhausted by an attacker and temporarily deny legitimate new joins. An attacker can use a native client with no Origin or forge an Origin outside the browser security model. This is not distributed-denial-of-service protection, authentication, account access control or a penetration-test result. Edge/provider defenses and operational monitoring remain necessary for sustained public service.

Public assigned-origin checks, TLS/WSS, polling fallback, restart/reconnect limits, real phone, campaign/browser acceptance, measured free-instance capacity, memory stability and external abuse monitoring remain open until directly exercised. Existing CORS/header settings must not be described as authentication. Hosting remains restricted to the owner's approved $0 option; no paid upgrade is authorized by this slice.
