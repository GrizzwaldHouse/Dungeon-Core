# Dungeon Core Crawler

**Accountless cooperative 3D dungeon · 2–6 players · Three.js · Node.js · Socket.IO**

Dungeon Core Crawler is a portfolio game built around an authoritative 30 Hz simulation. Explorers join with a four-character code. The browser sends movement and action intents; the server owns transforms, AABB collision, health, enemy decisions, discoveries, portals, inventory, and rewards. Room-scoped snapshots feed a separate Three.js renderer. Remote actors interpolate; the local actor uses bounded position prediction and resets cleanly when the party changes spaces.

The five-floor candidate begins with a Sentinel tutorial and a server-selected shifting vault. Floor two has sequential Keeper and Hexer bosses. Floor three offers finite mob waves and personal claims on shared caches. Floor four combines ordered runes, telegraphed traps, and a guardian. The Shifting Core Warden ends floor five with health-gated phases and bounded Shardling spawns. Recovery spaces separate encounters; victory starts a stronger cycle for the same party.

Server-recorded exploration and objective progress govern the first portal. Entering early applies a bounded rush penalty, so a client cannot skip investigation by claiming an invented location. Portal, attack, item, trap, and revive actions are range-checked and replay-safe. Every eligible human earns equal base XP at floor completion. A capped contribution score weights damage, portals, trap disarms, and support; a fixed bonus pool uses integer largest-remainder allocation and stable player-ID tie breaks. The server issues each floor award once.

The client keeps network transport, input, audio, HUD, and WebGL rendering in separate modules. This lets a local single-player Three.js scene retain its graphics code while replacing local gameplay mutations with validated multiplayer intents and snapshots.

## Run locally

```powershell
npm ci
npm start
```

Open the printed HTTP address in two independent browsers. Use `npm run check`, `npm test`, and `npm run measure -- --duration=4 --rooms=2 --players=6` for local verification.

**Release status:** 33 focused and transport-free checks pass; progression is proven through entry into floor four. Full Socket.IO, two-browser, mobile, floor-five cycle, and public-host acceptance remain open. See [test evidence](TEST_RESULTS.md), [release gates](RELEASE_CHECKLIST.md), [optimization specification](docs/PRODUCTION_OPTIMIZATION_SPEC.md), and [deployment runbook](docs/RENDER_DEPLOYMENT.md).
