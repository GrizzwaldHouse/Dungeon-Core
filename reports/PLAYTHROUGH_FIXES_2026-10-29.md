# Dungeon Core Crawler playthrough fixes — October 29, 2026

## User-observed issues

- Mock explorers selected the first-floor enemy but could keep pushing into a blocking pillar or wall.
- The level label was easy to miss during a floor transition.
- A portal was represented mainly by a small ring and UI button; the world did not clearly say “walk here.”
- Four colored point lights read as floating dots instead of authored fixtures.

## Bounded milestone

- `server/server.js`: mock explorers now probe safe obstacle corners when direct line-of-sight is blocked, then continue through the same authoritative movement collision.
- `client/app.js` / `client/index.html` / `client/styles.css`: added a live floor/cycle banner and an explicit walk-to-the-gate objective hint whenever a portal is available.
- `client/render.js`: replaced floating light orbs with wall-fixture geometry and upgraded portals with a beacon pillar, emissive beacon, ground arrow, and sealed/available color states.

The changes are presentation and bot-navigation support only. Server-owned combat, portal validation, floor routing, and collision remain authoritative.

## Evidence

- `npm run check`: passed; 43 JavaScript files.
- `npm test`: passed; 106/106 tests, 0 failures, 0 skips.
- `git diff --check`: passed.

## Remaining release gates

- This milestone is local until its explicit commit is deployed and the public URL is rechecked against that commit.
- Physical-phone join, touch, orientation/readability, and reconnect evidence remain open.
- Handshake eligibility confirmation and final four-field submission remain pending; do not submit an older public revision with the reported playthrough defects.
