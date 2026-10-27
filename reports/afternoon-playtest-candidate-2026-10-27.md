# Afternoon playtest candidate — 2026-10-27

**Branch:** `gameplay/release-integration`

**Candidate revision:** `259f0af254f77f6be588179f311dfed5de10ff05`

**Evidence captured:** 2026-10-27 23:23 UTC, local Windows / Node 24.22.1.

## Fresh checks

- `npm run check`: pass, 28 JavaScript files.
- `npm test` with local loopback networking enabled: pass, 62/62; zero failures. A restricted-network attempt earlier failed to open test WebSockets, so the successful run is the accepted automated evidence.
- Local server on a nondefault port: `/healthz` HTTP 200 JSON, `/` HTTP 200 HTML, `/title-cover-deepwood.png` HTTP 200 PNG.
- Selected cover SHA-256: `B7332DB53BB3D3D91E1D8540BDF3E2433A3DBD2C7738F2E2E7D1E2CA993A820B`.
- Chrome at desktop and 390 × 844 viewport: title remained readable in the opaque entry panel without covering the guardian. The image was visible in the gate, hidden after creating a room, and visible again after leaving. One live local lobby create/leave succeeded.
- Phone quick actions: source and focused UI test confirm Sound and Leave stay outside the collapsed party details during running play. In one Chrome room with a mock party, both controls remained visible and inside a 390 × 844 viewport after starting floor one. Physical touch and audio behavior are unverified.
- Combat HUD: a focused UI test confirms it shows the nearest living snapshot enemy and uses the generic `Strike` label. The server still applies range and line-of-sight checks to decide the actual hit; this is not explicit target selection and has not been browser-playtested.
- Audio source audit: the Sound button resumes Web Audio on a direct click; a mocked context check covered cue generation and mute/unknown-cue guards. Combat, pickups, healing, revive, transitions, clear, cycle, and failure have source wiring. The defined warning cue is not wired, and no audible playback has been verified on a real device.

## User playtest still required

Use the same game server address on computer and phone. On the phone, `localhost` refers to the phone, so use the computer's local-network address on the same Wi-Fi or a verified public staging URL. Create/join one room, start a mock party, test movement and combat, sound after a direct touch, down/revive, portal, phone background/rejoin within 30 seconds, rotation, and the Deepwood progression. Record device/browser, pass/fail, and any defect without storing a live room code or reconnect token in this report.

This single-browser local check does not establish two-device multiplayer, actual touch/audio, public HTTPS/WSS, long-session stability, or release readiness. GitHub `origin` is configured but no branch has been pushed; Render staging is not deployed. The separate design worktree has an in-progress merge and was not merged. Eleven pre-existing concept images remain untracked and untouched.
