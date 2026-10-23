# Dungeon Core Crawler

A local 2–6 player cooperative dungeon prototype with a Three.js browser view and an authoritative Node.js/Socket.IO server. Players create or join rooms using four-character codes without accounts. Session reconnect tokens are temporary capabilities, separate from room codes.

## Run

1. In this folder, run `npm install` if dependencies are missing.
2. Run `npm start` and open `http://localhost:3000` in a browser. If port 3000 is already occupied, set `$env:PORT = 3001` in PowerShell before `npm start`, then open `http://localhost:3001`. Opening `client/index.html` as a file shows launch instructions because the game needs its Socket.IO server.
3. Run `npm run check`, `npm test`, and `node scripts/measure.js --duration=4 --rooms=2 --players=6`. The [two-browser playtest](docs/TWO_BROWSER_COMBAT_PLAYTEST.md) covers the visible controls and expected results.

Three.js loads from a pinned jsDelivr CDN version, so the browser needs internet access. The Socket.IO browser script and game files are served by the local server.

## Architecture

The browser sends keyboard movement and strike intent. The server owns player and sentinel positions, health, attack range and cooldown, room membership, AABB collision, discovery, and 30 Hz snapshots. `client/network.js` handles Socket.IO and session recovery; `client/render.js` handles WebGL, lighting, bounded local position prediction, and interpolation of remote snapshots. A hidden west wall is removed visually only after the server confirms proximity discovery; the server also opens its collision barrier. Inputs cannot set transforms or apply damage directly.

The baseline has 14 passing automated tests and a bounded 12-player local timing sample. On October 21, 2026, the combat build measured a 47.87 ms p95 snapshot interval and 3.41 ms p95 server tick duration over four seconds. These are local measurements, not public-network performance guarantees. Details and limits are in [Testing and metrics](docs/TESTING_AND_METRICS.md).

## Scope

This vertical slice covers room lifecycle, movement, reconnect, discovery, mock explorers, and one server-controlled sentinel with melee combat. Shifting portals, anti-rush penalties, floor completion, revives, and contribution-weighted XP remain specified in [Technical Architecture](Technical-Architecture.md) but are not implemented. [Functionality report](docs/FUNCTIONALITY_REPORT.md) separates verified behavior from browser checks still pending.

Do not post room codes, reconnect tokens, IP addresses, or raw logs in public issues.
