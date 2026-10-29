# Barkwing target intent and sprint ownership

## Starting point

The October 28 sprint starts from `gameplay/release-integration` at
`c8dc4606843e9cd439e9f4d8db39daaefc7b9182`. Optional target intent, Q cycling,
a native target select, and a touch target button already exist at this revision.
This increment strengthens their usability and evidence; it does not introduce
a second combat system.

## Wire and authority boundary

`GameNetwork.attack(targetEnemyId?)` sends `combat:attack` with a fresh
`actionId` and, for an explicit selection, `targetEnemyId`. Automatic selection
omits the target property. Client selection never changes snapshots or applies
damage locally.

- `actionId` must match `[A-Za-z0-9_-]{1,64}`. A supplied target must match
  `[A-Za-z0-9_-]{1,80}`; `null` is not automatic selection.
- The server obtains the player and room from the current socket/session
  binding. Payload room/player identifiers, positions, altitude, health,
  rewards, and damage confer no authority.
- A supplied target is resolved only against the live room's enemy map. Missing
  or defeated targets return `TARGET_UNAVAILABLE`; there is no fallback strike
  against another enemy. Automatic mode chooses the nearest reachable live
  enemy under the existing horizontal-distance rule.
- Explicit targets obey the same configured range, obstacle visibility,
  player-health, and cooldown checks as automatic attacks. Barkwing altitude
  does not supply extra reach or bypass walls: the existing visibility helper
  uses the horizontal plane, consistent with the server's movement collision.
- The current configuration allows 2.3 m horizontal reach, 20 maximum damage,
  and a 450 ms cooldown. `server/config/game-parameters.js` remains authoritative
  for tuning; these values are not client inputs.
- Within the existing bounded 32-entry per-player combat action cache, replay
  returns the original result even if a subsequent payload names another
  target. This is bounded replay protection, not indefinite action history.
- `PLAYER_DOWN`, `ATTACK_COOLDOWN`, and `OUT_OF_RANGE` retain their existing
  semantics. The room must be running before attacks are accepted.

Room-scoped `combat:enemy-hit` events and authoritative snapshots report the
outcome. The renderer may interpolate transforms and animate wings, but cannot
select damage, encounter phases, rewards, or teleports. Simulation remains 30 Hz.

## Client presentation boundary

The native select, Q key while the playfield owns keyboard input, and touch
target button select a local enemy ID. They continue to call the same optional
target API. UI feedback must identify an airborne target in text as well as
through a gold selection marker. State from another room, cycle, or space must
not carry a target forward; defeated or unavailable selections must clear.

Procedural Barkwings are gameplay prototypes informed by the canonical
`client/title-cover-deepwood.png`: charcoal bark, slate/moss surfaces, jagged
wing silhouettes, and restrained ember accents. They are not approved final
GLB assets. The canonical image and every user concept remain unchanged.
The airborne selection marker projects to world Y `-0.35`, compensating for
the existing actor impact scale so a hit cannot move the marker below its plane.

## Exclusive ownership during implementation

| Owner | Files | Interface to other owners |
| --- | --- | --- |
| Authority/combat agent | `server/combat-target.js`, `server/server.js`, `tests/combat-target.test.js`, new `tests/target-intent-boundary.test.js` | Preserve optional target API, server range/visibility, cooldown, and replay semantics; report any necessary contract change before integration. |
| Client/UI agent | `client/app.js`, `client/render.js`, `client/index.html`, `client/styles.css`, `client/touch-controls.js`, `tests/client-ui.test.js`, `tests/touch-controls.test.js`, optional new `tests/barkwing-render.test.js` | Consume authoritative snapshots; call unchanged `network.attack(targetEnemyId?)`; add no shared imports without coordinating. |
| Multiplayer QA agent | `TASKS.md`, `TEST_RESULTS.md`, `RELEASE_CHECKLIST.md`, `NEXT_SESSION.md`, new `reports/barkwing-sprint-2026-10-28.md` | Reconcile existing milestones, collect browser/runtime evidence, use existing isolated measurement harness, and preserve unresolved release gates. |
| Lead integrator | This contract, `README.md`, `scripts/measure.js`, `tests/measure.test.js`, shared contracts, review, integration, full-suite verification, explicit staging, local commit | Agents do not stage or commit; ownership changes require coordination. Lead owns final evidence after QA handback. |

The separate `design/dusk-qa` checkout is read-only for this sprint. No agent
owns concept images or approved art. There are no overlapping write assignments.

## Evidence rules

Baseline `npm run check` passed for 35 JavaScript files. Baseline `npm test`
passed 81/81 in 26.289 seconds with local loopback access. An earlier sandboxed
run passed 58/81 and failed 23 tests at WebSocket handshakes; rerunning outside
the sandbox resolved those failures without source changes.

Focused tests, the final syntax/full suite, two-browser observations, and any
soak must name their revision/tree and limitations in the sprint report.
Private server fixtures may arrange an encounter for browser checks, but must
be labeled fixture-assisted and must not add public debug endpoints. A local
loopback soak does not prove browser campaign completion, public-host behavior,
physical-phone input/audio, collision parity, or approved final art.

The integrated run after the impact-marker correction and bounded diagnostic
duration change passed `npm run check` for 37 JavaScript files and `npm test`
for 89/89 tests in 36.469 seconds.
New coverage includes a real
Socket.IO public-intent route into Deepwood with real combat cooldowns. That
route uses an open test arena, 25 m/s configured player speed, and high player
health; it is authority/progression evidence, not default-layout or difficulty
acceptance. A low wall is inserted into trusted test geometry for the airborne
visibility assertion. The stale-transport case invokes the bound disconnect
callback while retaining its transport; it proves stale binding rejection,
not real network recovery races. A separate read-only peer review found no
actionable defects in these fixtures or assertions.

## API references

- [Socket.IO 4.x socket identity](https://socket.io/docs/v4/server-socket-instance/#socketid): socket IDs change across reconnects; application identity must remain tied to the validated session binding.
- [Three.js ShapeGeometry](https://threejs.org/docs/pages/ShapeGeometry.html) and [Group](https://threejs.org/docs/pages/Group.html): procedural geometry and local transforms are presentation. The browser import map pins Three.js `0.186.1`.

See `reports/barkwing-sprint-2026-10-28.md` for final observed evidence and
`RELEASE_CHECKLIST.md` for remaining release gates.
