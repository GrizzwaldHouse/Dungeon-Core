# Two browser multiplayer and combat playtest

## Open the current build

The existing server on port 3000 may be an older Node process. Use the combat preview already open at `http://localhost:3001/` in the ChatGPT in-app browser and Chrome. If it has stopped, run this in PowerShell and leave the window open:

```powershell
cd C:\Users\daley\Projects\HandshakeGame_MSI\ChatGPT_MSI\DungeonCoreCrawler
$env:PORT = 3001
npm start
```

Open `http://localhost:3001/` in **both** the ChatGPT in-app browser and Chrome. Both should say **CONNECTED**. A room code is temporary, so create a fresh room when you return.

## Steps to perform while watching both views

| Step | Action | Expected in both browsers |
| --- | --- | --- |
| 1 | Enter `Aster` in the in-app browser and click **Create a room**. | A four-character code and a one-player lobby appear. |
| 2 | Enter `Briar` and that code in Chrome; click **Join a room**. | Both rosters show two players. Only Aster has **Begin expedition**. |
| 3 | Click **Invite mock party** in the host view. | Four mock explorers join, for six total. Their server snapshots report changing `PATROL`, `INVESTIGATE`, `ENGAGE`, or `RESCUE` intents; circling the host is a failure. |
| 4 | Click **Begin expedition** in the host view. | Both show `RUNNING`, a red sentinel in the 3D room, and `100 / 100 HP` for the sentinel. |
| 5 | Click open dungeon floor to focus a browser, then hold **D** or **Right Arrow** for a second. Try **W/A/S** and the other arrows too. | The local avatar moves smoothly; the other browser sees the same movement shortly after. Both controls use server-approved positions. |
| 6 | Walk into an outer wall and then an interior pillar or column. | Movement stops at each visible solid surface. The hidden wall also blocks movement until discovery. |
| 7 | Press **Space** or click **Strike sentinel** while far away. Then approach the sentinel from the east side of the room and strike again. | The far strike says to move closer. A valid strike removes 20 HP in **both** views. Rapid repeats respect a 450 ms server cooldown. |
| 8 | Approach within about 5 meters of the sentinel, stay close briefly, then back away. | The sentinel chases a connected player and deals 6 HP per hit in melee range; both rosters update. At 0 HP, that player's movement and strike control stop, while the other player can continue. It stays idle while all players remain at the spawn point. |
| 9 | After defeating or avoiding the sentinel, walk toward the purple hidden wall on the west side. | Once the server detects proximity, the wall disappears in both browsers and its floor area appears. |
| 10 | Reload one browser during the run. | It should rejoin with its saved room capability; the other player's room keeps ticking. Click **Leave room** in both views when finished. |
| 11 | Continue into a boss encounter with mocks present. Observe at least two mocks without moving the host. | Mocks navigate toward authoritative targets, stop in attack range, attack the boss, and render clear attack/hit feedback. They do not form an orbit around the host. |
| 12 | Keep one human alive while another is downed near the mock party. | At least one equipped mock switches to `RESCUE`, approaches through collision, spends a server-owned healing charge, revives the human to bounded health, then resumes an objective. Capture the scene and the matching event/snapshot evidence. |

## Current behavior and evidence

- `npm run check` passed, and `npm test` passed **14/14** after this slice. The tests cover room isolation, authoritative movement and collision, mock players, discovery, sentinel movement, attack range, cooldown, replay protection, wall-blocked melee, and shared enemy health.
- On October 21, 2026, the in-app browser and Chrome joined one room. Both rendered the dungeon and sentinel. Held **D** and **Left Arrow** inputs visibly moved the host avatar. One Chrome strike reduced the sentinel from 100 to 80 HP in both views. A fresh room, `LE6K`, then displayed two human explorers and four moving mocks in both browsers; the user confirmed the Chrome view. Both human explorers stayed at 100 HP while idle after the sentinel aggro radius was reduced.
- The sentinel is the first combat slice. It does not yet award floor completion, spawn waves, or revive fallen players. The live two-browser session did not verify the complete defeat path or reload recovery; those remain manual checks above.

## If either browser stays on loading

Confirm the PowerShell server prints `listening on 0.0.0.0:3001 (30 Hz)`, then reload both `http://localhost:3001/` tabs. Do not open `client/index.html` as a `file:` URL; the Socket.IO client and dungeon layout are served by Node. If port 3001 is occupied, close the old preview PowerShell window before starting another preview server.
