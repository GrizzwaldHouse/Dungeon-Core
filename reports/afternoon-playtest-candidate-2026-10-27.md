# Afternoon playtest candidate — 2026-10-27

**Branch:** `gameplay/release-integration`

**Candidate revision:** `43e72dc2d4c5e7551fdc95c6db71242a61ef7aca`

**Evidence captured:** 2026-10-27 23:20 UTC, local Windows / Node 24.22.1.

## Fresh checks

- `npm run check`: pass, 28 JavaScript files.
- `npm test` with local loopback networking enabled: pass, 62/62; zero failures. A restricted-network attempt earlier failed to open test WebSockets, so the successful run is the accepted automated evidence.
- Local server on a nondefault port: `/healthz` HTTP 200 JSON, `/` HTTP 200 HTML, `/title-cover-deepwood.png` HTTP 200 PNG.
- Selected cover SHA-256: `B7332DB53BB3D3D91E1D8540BDF3E2433A3DBD2C7738F2E2E7D1E2CA993A820B`.
- Chrome at desktop and 390 × 844 viewport: title remained readable in the opaque entry panel without covering the guardian. The image was visible in the gate, hidden after creating a room, and visible again after leaving. One live local lobby create/leave succeeded.
- Phone quick actions: source and focused UI test confirm Sound and Leave stay outside the collapsed party details during running play. Physical touch and audio behavior are unverified.

## User playtest still required

Use the same game server address on computer and phone. On the phone, `localhost` refers to the phone, so use the computer's local-network address on the same Wi-Fi or a verified public staging URL. Create/join one room, start a mock party, test movement and combat, sound after a direct touch, down/revive, portal, phone background/rejoin within 30 seconds, rotation, and the Deepwood progression. Record device/browser, pass/fail, and any defect without storing a live room code or reconnect token in this report.

This single-browser local check does not establish two-device multiplayer, actual touch/audio, public HTTPS/WSS, long-session stability, or release readiness. GitHub `origin` is configured but no branch has been pushed; Render staging is not deployed. The separate design worktree has an in-progress merge and was not merged. Eleven pre-existing concept images remain untracked and untouched.
