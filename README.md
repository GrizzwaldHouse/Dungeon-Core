# Dungeon Core Crawler

**Cooperative 3D dungeon prototype · 2–6 players · Three.js · Node.js · Socket.IO**

Dungeon Core Crawler is a browser game built to demonstrate authoritative multiplayer engineering. Players create or join a four-character room without an account. The browser sends movement, attack, and portal *intent*; a 30 Hz server simulation owns transforms, health, collision, discoveries, room transitions, traps, and rewards. Room-scoped snapshots feed a separate Three.js renderer. Remote actors interpolate between snapshots; the local actor uses bounded prediction, with a hard visual reset when the server changes spaces.

The current playable slice has one sentinel encounter, a proximity-revealed wall, a server-selected shift into one of two vault variants, a 45-tick trap warning, and a terminal floor exit. A rushed party receives a bounded status penalty when it enters before sufficient server-recorded exploration. Client-supplied coordinates and combat outcomes are never accepted as state. AABB checks, input validation, attack cooldowns, portal proximity, room isolation, and replay-safe action IDs run on the server.

At floor completion, every eligible human receives 100 base XP. The server records damage and portal contributions and apportions a 60 XP bonus pool using integer weighted scores, largest-remainder rounding, and deterministic player-ID tie breaks. The schema also reserves trap-disarm and support metrics; those actions are not playable yet. Awards are issued once, including to players still within reconnect grace.

## Run and inspect

```powershell
npm ci
npm start
```

Open the printed local URL, usually `http://localhost:3000/`. Use two independent browsers to test a shared room. `npm run check`, `npm test`, and `npm run measure -- --duration=4 --rooms=2 --players=6` provide local checks. The latest integrated automated run passed **21/21 tests** on October 24, 2026, including distinct vault geometry and collision parity; public-network and full browser acceptance remain open.

`server/` owns simulation and room state; `client/network.js` owns transport; `client/render.js` owns WebGL; `shared/dungeon-layout.js` maps visual geometry to authoritative colliders. These boundaries let a local single-player scene keep its renderer while replacing local state mutation with validated network intent and snapshots.

## Release status

This is a **one-floor preview**, not yet the complete planned game. Puzzle/disarm, revive, multiple floors, full 2–6-player browser QA, endurance, and public hosting still need implementation or acceptance. See the [October 30 full-release plan](docs/OCT30_RELEASE_AND_ACCESS_PLAN.md), [production optimization specification](docs/PRODUCTION_OPTIMIZATION_SPEC.md), and [deployment runbook](docs/RENDER_DEPLOYMENT.md).
