# Dungeon Core Crawler

**Accountless cooperative 3D dungeon · 2–6 players · Three.js · Node.js · Socket.IO**

**Public demo preparation:** source publication and reviewed pushes are authorized. Hosting must stay **$0**. A public game URL is not verified yet; the GitHub repository is source code, not the playable game.

Explorers join with a four-character code. Browsers send movement and action intents; the authoritative 30 Hz server owns collision, transforms, health, enemy decisions, discoveries, portals, inventory, and rewards. Room-scoped snapshots feed the Three.js renderer, which interpolates remote actors and bounds local movement prediction.

The five-floor candidate begins with a Sentinel tutorial and a server-selected shifting vault. Floor two has sequential Keeper and Hexer bosses. Floor three offers finite mob waves and personal claims on shared caches. After Floor Three recovery, the Deepwood Sentinel and airborne Barkwings precede Floor Four's ordered runes, telegraphed traps, and guardian. The Shifting Core Warden ends Floor Five with health-gated phases and bounded Shardling spawns. Recovery spaces separate encounters. Floor Five victory presents authoritative expedition results; a stronger cycle starts only after the host explicitly chooses to continue.

Server-recorded exploration and objectives govern the first portal; early entry applies a bounded rush penalty. Portal, attack, item, trap, and revive actions are range-checked and replay-safe. Each floor awards eligible humans equal base XP once, plus contribution-weighted bonuses from a fixed pool.

Separate client modules handle transport, input, audio, HUD, and WebGL rendering.

Use the target select, Q with the playfield focused, or the touch Target button to select a particular enemy, including an airborne Barkwing. Gold markers and target text identify the local selection. Automatic targeting remains available. Selection submits an enemy ID only; the server still enforces live target availability, reach, visibility, health, cooldown, and bounded replay protection. See the [target contract](docs/BARKWING_TARGET_CONTRACT.md).

## Run locally

```powershell
npm ci
npm start
```

Open the printed HTTP address in two independent browsers. Use `npm run check`, `npm test`, and `npm run measure -- --duration=4 --rooms=2 --players=6` for local verification.

For a solo rehearsal, create a room, select **Invite mock party**, then **Begin expedition**. For multiplayer, a friend opens the same game address and joins with the room code before the host begins. Focus the playfield: WASD/arrows move, Q cycles targets, Space strikes, E enters a nearby available portal, and F disarms a nearby live trap. Use the labelled touch controls on a phone. Health, range, damage and rewards are resolved by the server.

## Illustrated quest preview

Open `/story-preview.html` on the running game server, or use **Preview the illustrated quest · draft** in the lobby. Four manually advanced scenes cover the Guild charter, silent outpost, Deepwood battle and a proposed aftermath. Captions stay separate from the artwork for readable text; Previous/Next and arrow keys navigate, with no autoplay or combat-state changes. These are generated concept illustrations, not gameplay screenshots. The selected canonical cover is unchanged. See the [draft asset review](docs/design/QUEST_SLIDES_2026-10-29.md).

## Deploy a free demo

[Deploy this branch to Render](https://render.com/deploy?repo=https://github.com/GrizzwaldHouse/Dungeon-Core/tree/gameplay/release-integration)

The checked-in Blueprint creates one Node **Free** web service with `npm ci`, `npm start` and `/healthz`; it requests no database, disk or paid service. Confirm **Free** in the account before creating it. Do not enable a paid workspace, upgrade, payment method or optional paid extras for this demo. Render has usage limits; a free service may sleep after 15 minutes without traffic and take about a minute to wake. Rooms are temporary and disappear on restart or sleep. See [free-service limits](https://render.com/docs/free) and the [deployment runbook](docs/RENDER_DEPLOYMENT.md).

The GitHub Actions workflow checks syntax and tests after push. A passing workflow establishes those automated checks, not physical-phone, public WSS or full-campaign acceptance. Publish the assigned game URL only after its health, browser connections and two-client smoke checks pass. Public source visibility does not grant an open-source license; no general reuse license is currently declared.

**Release status:** Local candidate; public release remains **NO-GO**. Automated coverage includes authoritative five-floor progression, victory results, explicit harder-cycle choice, and warning-window cues. Current commands, revision, counts, and browser/soak limits are recorded in the [test evidence](TEST_RESULTS.md) and [October 28 sprint report](reports/barkwing-sprint-2026-10-28.md). Physical phone/computer acceptance, a complete browser campaign, collision parity, public HTTPS/WSS, and exact-revision release gates remain open. See the [release checklist](RELEASE_CHECKLIST.md), [optimization specification](docs/PRODUCTION_OPTIMIZATION_SPEC.md), and [deployment runbook](docs/RENDER_DEPLOYMENT.md).
