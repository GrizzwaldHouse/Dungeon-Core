# Dungeon Core Crawler

**A cooperative 3D browser dungeon for 2 to 6 players.** Create a room with a four-character code, invite friends, and play without accounts or installs. [Play the public game](https://dungeon-core-crawler.onrender.com/).

## Engineering

Three.js renders the world and interpolates room snapshots. A Node.js and Socket.IO server runs the authoritative simulation at 30 Hz. Clients send movement and action intents; the server resolves collision, health, target reach, enemy behavior, portal routes, inventory, revives, and rewards. Transport, input, HUD, audio, and rendering live in separate client modules so the canvas layer can be reused by other web games.

The five-floor expedition includes sequential bosses, finite mob waves, personal resource claims, recovery spaces, an ordered rune trial, and a final Shifting Core Warden encounter. A Deepwood Sentinel and airborne Barkwings appear after the Floor Three recovery room. Floor Five victory displays results, and the host can choose an optional harder cycle.

Exploration and objective checks gate portals. Entering the first portal too early triggers a bounded anti-rush penalty. Attack, trap, item, and revive commands are checked for distance, state, and replay. Each completed floor grants equal base experience to eligible humans, then distributes a capped bonus pool according to server-recorded contribution. This keeps advancement shared while recognizing individual play.

## Run and test

```powershell
npm ci
npm start
npm run check
npm test
```

Open the printed local URL in two browser windows. One player creates a room; the other joins before the host begins. For a solo rehearsal, use **Invite mock party**. WASD or arrow keys move, Q cycles targets, Space attacks, E enters an available portal, and F disarms a nearby trap. Touch controls are included. An optional four-scene illustrated quest draft is available at `/story-preview.html`.

The consolidated local candidate passed **138 automated tests** and **59 JavaScript syntax checks** on October 31, 2026. These checks establish code behavior, not physical-phone acceptance. The public Render service currently serves an earlier revision; verify `/healthz` before attributing local changes to it. The full default-balance campaign, two-human phone and desktop session, 95% visual gate, and exact public revision match remain release checks. See the [test evidence](TEST_RESULTS.md), [owner QA checklist](docs/OWNER_TWO_DEVICE_QA_2026-10-31.md), and [release checklist](RELEASE_CHECKLIST.md).
