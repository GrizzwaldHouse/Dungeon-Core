# Dungeon Core functionality report — 2026-10-21

## Launch and interface

The user-facing failure came from opening `client/index.html` with a `file:///` URL. The old page referenced `/styles.css`, `/app.js`, and `/socket.io/socket.io.js`, which require the Node server at the site root. The revised page loads its stylesheet relative to the HTML file and shows a styled launch instruction instead of an indefinite loading message when opened directly. The working game address is `http://localhost:3000/` after `npm start`.

The lobby has a dungeon doorway poster while WebGL starts, a room code display, connection state, an explorer roster, a player count, keyboard instructions, and status messages. The room form shows Create and Join actions. The Start action is visible only to the host and disabled until two players are connected. The screen also adapts to narrow viewports and reduced-motion preferences. The 3D scene was subsequently viewed in the ChatGPT in-app browser and Chrome; the user confirmed that the Chrome view shows the mock players running.

## Verification matrix

| Capability | Result | Evidence |
| --- | --- | --- |
| File-open launch guidance | Verified in simulated document test | HTML bootstrap displays server instructions and removes unusable form |
| Explorer name, Create, Join, Start, Leave controls | Verified in simulated DOM test | `tests/client-ui.test.js` exercises handler flow and host/guest state |
| Wall opacity and visibility after discovery | Verified in isolated renderer logic test | `tests/client-ui.test.js` checks reveal and session reset |
| Four-character room codes, room isolation, capacity, lobby and host rules | Verified over real local Socket.IO transport | `tests/server.test.js` |
| Authoritative movement, speed cap, world bounds, AABB wall collision | Verified over real local Socket.IO transport | `tests/server.test.js` |
| Six-player snapshots and static assets | Verified over real local Socket.IO transport and HTTP | `tests/server.test.js` |
| Disconnect grace, reconnect token rotation, host transfer | Verified over real local Socket.IO transport | `tests/server.test.js` |
| Proximity discovery, room-scoped reveal, trusted health damage | Verified over real local Socket.IO transport | `tests/server.test.js` |
| WebGL scene, camera, lights, keyboard movement | Visually checked in two browsers | Held D and Left Arrow moved the host avatar; both views rendered the same room |
| Static pillars and columns, server collision, host mock party | Automated collision and mock movement checks passed; six-player scene rendered in both browsers | `tests/server.test.js` and live room LE6K |
| One sentinel, player strikes, shared enemy health | Automated and two-browser checks passed | One Chrome strike reduced sentinel health from 100 to 80 in both views |
| Shifting portals, anti-rush penalties, floor completion, contribution XP | Not implemented | Parameters/specification exist; no runtime handlers or verified tests |

`npm run check` and `npm test` passed after the combat slice (14 tests). The four-second 12-player timing sample is in `docs/TESTING_AND_METRICS.md`; it is not a browser frame-rate or internet-latency measurement.

## Remaining browser check

The two-browser visual check covered room creation and join, six-player rendering, movement from D and Left Arrow, sentinel rendering, and shared strike damage. Full sentinel defeat, reconnect during combat, and the west-wall reveal still need the later manual steps in [Two browser playtest](TWO_BROWSER_COMBAT_PLAYTEST.md). The updated preview runs at `http://localhost:3001/` while an older process occupies port 3000.
