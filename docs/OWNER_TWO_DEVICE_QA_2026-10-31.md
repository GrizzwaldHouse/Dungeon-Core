# Owner computer and phone QA record

Use this on the approved **public** revision after deployment. Before that, use the local computer build for a visual preview only. Do not put room codes, reconnect tokens, private IP addresses, or account details in screenshots or this record.

## Session identity

- Date and time:
- Public URL:
- /healthz revision:
- Computer OS and browser:
- Phone model, OS and browser:
- Connection: same Wi-Fi or separate networks:
- Recording or screenshot paths:

## Two-human acceptance

Mark each row PASS, FAIL, or NOT TESTED. Capture a screenshot or short video for a failure and note the floor, device, and action that led to it.

| # | Test | Result | Evidence or defect |
| --- | --- | --- | --- |
| 1 | Computer creates a room; phone joins with a different name before Begin. Both rosters show two humans. | NOT TESTED | |
| 2 | Each person moves independently. Test WASD, arrows, touch directions, and release on phone blur or rotation. | NOT TESTED | |
| 3 | Compare player positions, enemy health, damage, and target selection on both screens. Try melee and ranged roles. | NOT TESTED | |
| 4 | Walk around each side of a pillar and wall. Confirm the companion can leave the first boss arena without getting stuck. | NOT TESTED | |
| 5 | Inspect portrait and landscape HUD, title art, all controls, portal, boss, and player readability. Note clipped or hidden elements. | NOT TESTED | |
| 6 | Pick up a supply, use healing below full health, and compare charge count and health on both screens. Record before and after values. | NOT TESTED | |
| 7 | Down a player and perform a nearby revive with another human or a server-owned companion. Confirm resumed movement and no duplicate rewards. | NOT TESTED | |
| 8 | Progress through Floor Two's Keeper and Hexer, Floor Three recovery, Deepwood, Floor Four runes, and Floor Five Warden. Record any missing encounter or repeated portal. | NOT TESTED | |
| 9 | Confirm victory results once, host-only optional harder cycle, and Leave expedition. Confirm defeat screen and exit in a separate run if feasible. | NOT TESTED | |
| 10 | Disconnect and rejoin the phone. Verify the same identity, health, level, XP, and inventory with no ghost player. | NOT TESTED | |
| 11 | Unlock and toggle sound after a touch. Listen for attack, damage, pickup, portal, warning, victory, and defeat cues. | NOT TESTED | |
| 12 | Confirm no endless loading, browser error, frozen controls, or stale room state. Compare both clients after a floor transition. | NOT TESTED | |

## Defect record

| ID | Severity P0/P1/P2 | Floor and device | Steps to reproduce | Expected | Observed | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |

P0 means the game or submission cannot proceed, P1 means a major gameplay or visual defect, and P2 means a smaller polish issue. Leave every untested row as NOT TESTED. Automated tests and headless captures cannot close a physical-phone row.

## Release decision

- Exact approved revision:
- All P0 rows passed:
- Known accepted defects:
- Marcus's decision: GO / HOLD
- Public revision after deploy:
- Handshake submission confirmation time and link or screenshot:
