# Render deployment runbook

**Status, October 29:** reviewed public source pushes are authorized; the user selected their existing Render account and requires $0 hosting. Dashboard sign-in is verified. Billing shows the Hobby plan, no card on file and no pending charges. No public service/URL has yet been verified. Prior private-only publication instructions are superseded by the owner's explicit public approval.
**Target:** one Node.js web service for both static files and Socket.IO, initially at a Render URL and then, if approved, `dungeon.marcusdaley.dev`.

## Why this host

Render web services accept public inbound WebSockets and forward HTTP and WebSocket traffic to the same service port. The current game holds authoritative rooms in one Node process, so this is a direct deployment of the existing architecture. Render's free service can idle after 15 minutes without inbound traffic and takes roughly a minute to wake; it can restart, and local process state is ephemeral. Active inbound WebSocket messages now count as traffic. This is acceptable for a portfolio demonstration only if the lobby explains wake/restart behavior; it is not durable session hosting. See [Render WebSockets](https://render.com/docs/websocket) and [free-service limits](https://render.com/docs/free).

Static hosting alone does not run the authoritative Node/Socket.IO room server. Deploy the existing single-process service for this demo; splitting authority across short-lived processes would require a separate shared-state design.

## Prerequisites

1. A reviewed local Git commit with a clean intended release tree and no private keys, reconnect tokens, raw logs, or installed `node_modules`.
2. Public source repository `GrizzwaldHouse/Dungeon-Core`. GitHub CLI account access and public visibility were freshly verified October 29. Push only the reviewed release branch; preserve local main and the design worktree. The publication-enforcer report records the bounded history scan; it does not grant a reuse license.
3. The owner's existing Render account is signed in and lists the GitHub repository as an available source. Service creation is not yet verified. The root `render.yaml` is a Blueprint for a Free Node web service with `npm ci`, `npm start`, and `/healthz`.
4. The owner of `marcusdaley.dev` can edit DNS records or provide the exact DNS provider. Prefer a game subdomain to preserve the existing main site.

## Staging sequence

1. Push the reviewed release candidate to the chosen GitHub repository. Record the full SHA; configure Render to deploy that branch or exact commit. Render's [Blueprint reference](https://render.com/docs/blueprint-spec) supports the `render.yaml` fields used here.
2. In Render, create a Blueprint or Node web service from the repository. Select the free plan only after confirming its current limits. The server already binds to `0.0.0.0` and reads `PORT`; Render requires both for public routing. A Render service has one public HTTP/WebSocket port. See [web service port binding](https://render.com/docs/web-services).
3. After the first deploy, request `https://<assigned-service>.onrender.com/healthz`; require JSON `ok: true` and `tickHz: 30`. Load the page, confirm the pinned Three.js CDN and Socket.IO script, and create/join a room from two independent devices. Confirm the browser uses WSS on HTTPS, never plaintext WS. Check logs for startup, uncaught errors, and clean shutdown.
4. Run the full `docs/PUBLISH_READINESS_AND_TEST_PLAN.md` acceptance matrix on the public URL: 2/4/6 players, two rooms, movement/collision, discovery, combat, portals, traps, floor awards, reconnect, and 30-minute soak. Record the deployed SHA and timing evidence. A local-only test does not satisfy this gate.
5. Add `dungeon.marcusdaley.dev` in Render's Custom Domains settings. Copy the exact DNS target Render provides into the domain provider, verify the domain, then test TLS, HTTPS redirect, WSS, and the game from two devices. Render manages TLS for verified custom domains; do not guess DNS values. See [custom domains](https://render.com/docs/custom-domains).
6. Before switching any public link, record the prior working deploy and rollback method. Render free services currently offer rollback to the two previous deploys, but an in-progress room is lost on process replacement. Inform players before a deploy and confirm fresh room creation after restart. See [free-service limits](https://render.com/docs/free).

## Strict $0 and origin checks

- Use the [branch-specific deploy shortcut](https://render.com/deploy?repo=https://github.com/GrizzwaldHouse/Dungeon-Core/tree/gameplay/release-integration), then inspect the proposed Blueprint. Create only the Free web service. Do not add payment details, paid extras, databases, disks or custom-domain purchases.
- Check the account's current billing/usage state. Free bandwidth/build allowances can trigger charges when a payment method exists; with no payment method, exhausted allowances suspend services or builds instead. If the existing account cannot guarantee the $0 constraint, stop before creating anything and report the concrete billing choice. Never silently switch providers or upgrade.
- The server prefers explicit comma-separated `CORS_ORIGIN` values and can use Render's `RENDER_EXTERNAL_URL` when present. Confirm that the assigned HTTPS origin is used, browser handshakes from that origin pass, and an unrelated browser Origin is rejected for both websocket and polling. If Render has not supplied the expected external URL, set `CORS_ORIGIN` to the actual assigned origin before public acceptance.
- Do not disable the new room-attempt/connection/room budgets to hide a deployment failure. Their process-local limits reduce casual abuse; they do not provide distributed denial-of-service protection.

## Launch gate and operations

- **Go:** exact candidate revision passes automated, browser, multi-room, endurance, and public-host checks; custom domain and off-machine Git recovery are verified; README and release notes match the playable game.
- **No-go:** any missing full-design mechanic, client/server desync, room leak, duplicate award, blocker at 2–6 players, inaccessible public URL, or absent recovery path. Record the defect and continue staging rather than claiming a full release.
- **Operations:** `/healthz` is a process health signal, not a full dungeon correctness check. Watch process restarts, tick duration, RSS, active rooms, WebSocket errors, and CDN failures. Keep reconnect tokens and room codes out of public logs. A free instance's 15-minute idle spin-down and ephemeral state should be visible in player-facing launch guidance.
