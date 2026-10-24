# Architecture decisions for the October 30 candidate

## ADR 001 — Preserve the running JavaScript and 30 Hz implementation

**Decision date:** 2026-10-24
**Status:** Accepted for the current release candidate

`Technical-Architecture.md` and `Runtime-File-Architecture.md` are design blueprints. They propose a TypeScript package layout, an initial 20 Hz simulation rate, and a separately tuned snapshot cadence. They do not describe the files currently executed by `npm start`.

The current release candidate uses plain JavaScript. `server/server.js` owns the authoritative room simulation and Socket.IO transport; `server/config/game-parameters.js` fixes `TICK_HZ` at 30; `client/network.js` accepts `room:snapshot`; `client/render.js` owns Three.js objects; and `client/app.js` composes input, network, and presentation. `package.json` starts `server/server.js` and runs syntax checks against the JavaScript modules. The server broadcasts room-scoped snapshots on its 30 Hz simulation tick. A browser may interpolate or predict presentation, but the server remains authoritative.

**Release contract:** Keep the installed Node.js/CommonJS and browser JavaScript stack and the 30 Hz room snapshot contract through the October 30 candidate. Implement remaining gameplay within these boundaries. A TypeScript/Vite/package migration or a tick-rate change requires a separate decision, migration plan, and current regression and latency evidence; no existing blueprint silently authorizes one.

**Limits:** A nominal 30 Hz scheduler is not a hard real-time guarantee. Local syntax and protocol checks do not establish public-host cadence, smoothness, or scaling. The readiness plan still requires 2/4/6-player, two-room, long-soak, and public-browser evidence. The single-process in-memory room model must not be described as horizontally scalable without shared authority and a compatible Socket.IO adapter.

**Source of truth:** Executed source and `package.json` define current behavior. `docs/PUBLISH_READINESS_AND_TEST_PLAN.md` defines release gates. The older architecture documents remain proposals for future evolution and must be read with this decision.
