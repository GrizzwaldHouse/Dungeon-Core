# DC004 and DC007 results

Candidate: `553b1b779648b7ee5a898bd50181eeea1e793825`

## DC004: Floor Two read-only audit

The implemented design is sequential: Threshold Keeper, then Mirror Hexer, then minion cleanup. It is not a simultaneous two-boss fight and is not the Shifting Core Warden encounter. The current five-floor integration specification and Floor Two tests expect this same sequence.

| Expected contract | Current implementation and evidence |
| --- | --- |
| Keeper begins once at a safe spawn | startFloorTwo is idempotent and rejects obstructed spawns before mutation. |
| Charge warns before damage | Keeper warning is45ticks, then collision-checked charge. |
| Disconnected players cannot be damaged | Active-player selection excludes disconnected players and pending warning damage rechecks eligibility. |
| Keeper defeat advances to Hexer once | Threshold Keeper health reaching zero creates Mirror Hexer and changes stage. |
| Health gates create bounded minions | Hexer70percent and35percent thresholds summon two Shardlings each, maximum four live. |
| Floor waits for cleanup | Hexer defeat enters CLEANUP; live minions keep completion false. |
| Repeated steps cannot duplicate rewards/spawns | Tests cover repeated ticks, lethal skip, bounded summons, and phase completion. |

Fresh command: `node --test tests/floor-two.test.js`. Result:8passed,0failed,164.86ms. This is unit evidence; the earlier assisted full-campaign capture also crossed Floor Two through public attack/portal intents. Neither establishes default-difficulty human success through the full campaign.

## DC007: two actual browser clients

Command: `node scripts/qa-2026-10-31/two-real-browsers.js reports/qa-2026-10-31/two-real-browsers`

Configuration: default health100, movement speed5, default authored collisions and cooldowns. Two separate real headless Chrome processes used independent browser transports. No mock teammate and no ProbeClient performed the multiplayer actions.

The harness operated real client form buttons, dispatched keyboard events through Chrome's input protocol, and clicked the actual attack/portal buttons. It read actual Socket.IO network frames received by each browser and compared those snapshots with read-only server observations. It did not mutate browser or server game state to force success.

Seven checks passed:

1. Both independent browser clients joined and started the same room.
2. Axe Vanguard keyboard movement did not move Arcane Mage.
3. Arcane Mage keyboard movement was independently observed.
4. Natural Sentinel damage appeared consistently in both browser snapshots.
5. Axe Vanguard UI attack reduced the shared Sentinel health.
6. Arcane Mage UI attack reduced the same authoritative enemy health.
7. Legitimate Sentinel defeat and portal entry moved both browsers to amber-vault.

Browser errors:0. All seven source fingerprints remained stable during the run. Result:PASS for this bounded local two-client scenario.

## Visual evidence and limits

The output folder contains title views at1440x900,390x844,and844x390, a Sentinel-clear view, peer portal view, and a phone expanded-HUD capture. The first expanded-HUD capture includes the legitimate portal-story modal; it is not evidence that the expanded panel underneath is unobstructed. A follow-up run dismisses the story through its real Continue action before capturing the panel.

The follow-up `two-real-browsers-final` run also passed seven observations with zero browser errors at the same candidate and with all source hashes stable. Its expanded portrait panel is readable, has a visible Hide mission control and scrollable content, and does not overlap the bottom touch lane. It occupies roughly440px of the844px viewport while expanded. That intentional inspection state substantially obscures the scene; the compact state should be used for active combat. Physical-device collapse, scroll, and touch behavior remain owner acceptance.

The landscape title image no longer crosses under the entry panel; the image begins at the same390px boundary. Its form is below the initial short-landscape viewport and requires scrolling. Physical-phone reachability and browser chrome effects remain owner tests.

These are local headless browser results. They do not establish OBS recording, visible in-app playthrough, public-host revision match, physical-phone acceptance, default full-campaign healing balance, or a95percent visual pass. Those gates stay open.
