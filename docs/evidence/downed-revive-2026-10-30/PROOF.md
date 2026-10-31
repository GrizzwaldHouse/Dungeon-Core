# Natural downed and revive capture

The local browser player and a second human Socket.IO client entered a normal room. The second player defeated the first Sentinel, disarmed the vault trap, claimed the rest supply, and brought the party to floor two. A floor-two enemy downed the browser player through ordinary server attacks. The second player moved into range and used the normal `player:revive` intent.

Run `node scripts/capture-downed-revive.js` with the repository's installed dependencies available. The capture uses headless Chrome with SwiftShader and an isolated local server configured with 80 maximum HP and speed 25 for this evidence run. It does not change server code or author damage or position directly. It hides room codes in saved screenshots and records no reconnect token.

The accepted run is `run-2026-10-30T20-33-48-131Z/`. Its `report.json` records the source revision, renderer hash, authoritative ticks, health, downed flag, healing charges, and support count. The desktop downed frame shows the fallen actor and 0/80 HP. The portrait downed frame shows the downed banner and 0/80 HP. The portrait revived frame shows 25/80 HP. The rescue partner's healing charges went from one to zero and support actions from zero to one. Browser console/page errors: zero. The only network warning was the optional favicon 404.

A repeat run, `run-2026-10-31T00-21-08-538Z/` (UTC directory name; October 30 Pacific), adds `player-revived-844x390.png`. Its server report records 0/80 HP and `downed=true` at ticks 935 and 959, then 25/80 HP and `downed=false` at ticks 990 and 996 in portrait and landscape. The partner again spent one earned charge and gained one support action. Browser errors remained zero. The source renderer hash matched the committed character candidate `819e81e020f31e12c1add8c9121faa8e2cf4f63e`.

This is local headless browser evidence. Physical phone and public-host behavior remain unverified. The portrait HUD continues to obscure most of the actor scene and needs its separate HUD integration.
