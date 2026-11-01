# Owner computer and iPhone playtest: October 31, 2026

## Evidence and scope

Marcus operated an MSI laptop and physical iPhone, reporting synchronized room joining, movement, combat, UI updates, and campaign completion. This is one person operating two real devices. It does not establish an independently coordinated two-human campaign or four/six-human coverage.

Reviewed source: `post-release/polish-reconciliation`, documentation base `9e6ecdb91122f7133b99b1e623a29b2b5f7d9924`. The last public health check in this conversation confirmed runtime revision `b67aa7ba0398f0bb23be65798c4837b5402f4d36`, `ok:true`, 30 Hz and HTTP 200. Individual recordings have no embedded commit proof and must not be attributed to that revision without corroboration.

Original media root: `C:\Users\daley\Projects\HandshakeGame_MSI\ChatGPT_MSI\Final_Sprint_VideoReport`. Preserve originals locally. Screenshots and video contain room locators, player display names, browser tabs and incidental personal content; review and redact before portfolio publication.

## Confirmed by inspected screenshots

- `Iphone_DemoReport/ScreenShots/IMG_5258.PNG`: Render address visible; an expanded HUD covers most of the dungeon and older emoji arrow controls are visible. This is evidence of an earlier presentation, not proof that current SVG controls regressed.
- `IMG_5269.PNG`: Render address visible; Floor Two party-loss window and Leave expedition control are rendered on a real phone. A raw `NOT_IN_RUNNING_ROOM` strike error remains visible beneath the results.
- `IMG_5270.PNG`: phone Floor Three REST view, compact HUD, two player models, outlined action icons and a party-advanced notice.
- `IMG_5271.PNG`: phone Guild brief and party skip-vote lobby presentation.
- `IMG_5272.PNG`: phone compact HUD, outlined movement/action icons and two distinct player models. This improves scene space relative to IMG_5258; expanded-panel and title obstruction remain open findings.
- `Msi_DemoReports/MSI_Screenshots/Screenshot 2026-10-31 204425.png`: Cycle 1 victory, party level 6, two player rows with individual XP, scores, defeats and damage.
- `Screenshot 2026-10-31 204842.png`: Cycle 2 victory, party level 11, two player results rows. This supplies visible evidence of optional continuation and another completed cycle.
- `Screenshot 2026-10-31 210503.png`: Render address visible; victory with five listed explorers including four explicitly labeled mock companions. Phone presence at that exact ending is not established by this screenshot alone.

## Video sample review

All three recordings decoded successfully in a hidden local Chrome instance. No footage was uploaded. Samples at 1%, 25%, 50%, 75% and 98% are retained under `Final_Sprint_VideoReport/Review_Samples`, with timestamps and dimensions in `manifest.json`.

| Recording | Duration | Resolution | Inspected sample observations |
| --- | --- | --- | --- |
| `IPhone_ScreenRecording_10-31-2026 20-22-36_1.MP4` | 98.643 s | 1290 x 2796 | At 24.7 s room-entry form and keyboard; at 49.3 s connected two-player lobby; at 74.0 and 96.7 s first-floor play with compact controls and two models. Render address is visible in these samples. |
| `FullTeam_GamePlaythrough.mp4` | 358.733 s | 2538 x 1512 | Samples show dungeon movement/encounters, a story illustration at 179.4 s and overhead combat at 269.0 s. Discrete samples do not establish every revive, pickup or ending transition. |
| `User_FullGame_2_playtrhoughs.mp4` | 843.067 s | 2548 x 1402 | Samples show overhead and angled views, later-room play and a results overlay at 826.2 s. Cycle 1 and Cycle 2 completion details are independently legible in the supplied desktop screenshots. |

This was a bounded fifteen-frame review plus eight inspected screenshots, not a continuous frame-by-frame or audio review. Pickup divergence, failed rejoin and the loading freeze lack isolated video timestamps. Preserve Marcus's report as evidence and reproduce them next.

## Defect and follow-up ledger

| ID | Priority | Finding and evidence | Next acceptance check |
| --- | --- | --- | --- |
| OWNER-001 | P2 | Owner reports iPhone entry UI hides the title cover. | Test actual iPhone entry screen with keyboard closed/open and portrait/landscape; artwork remains identifiable and fields accessible without unintended overflow. |
| OWNER-002 | P1 investigation | Owner reports item remains on Player 1 after Player 2 collects it. Current source deliberately supports a personal claim per eligible player: `collectItem` adds only the collector to `claimedBy`, broadcasts `item:collected` and emits a snapshot; renderer hides the marker only for the local claimant. A missed broadcast is not established. | Reproduce with same item ID and two clients; compare both `claimedBy` arrays and inventories; prove repeat claims are refused. If personal rewards are intended, label them clearly. Shared one-time removal would require an explicit loot-contract decision. |
| OWNER-003 | P1 | iPhone screen lock usually led to fade/disconnect and a successful return, but a later return failed. | Capture background durations below/above the configured 30-second disconnect grace, reconnect result and stage; test ongoing and completed runs. Offer clear recovery/new-room UI after expiry. Do not lengthen server retention without evaluating capacity and abuse limits. |
| OWNER-004 | P1 | Owner reports Render lag and one graphics-load freeze requiring reload/phone restart. Exact failing request, WebGL state and timing unknown. | Repeat cold/warm loads on physical phone; collect safe resource-error and context-loss diagnostics, frame times and recovery behavior. Verify user-facing retry without a device restart. Root cause remains unconfirmed. |
| OWNER-005 | P1 investigation | Owner reports smoother play via Vercel than Render. Reviewed phone samples show Render; alternative URL/revision/socket endpoint have not been identified. | Record both frontend URLs, served revisions, Socket.IO endpoints, same-device/network frame time and latency. A Vercel frontend may still use Render for simulation, so do not infer backend superiority from URL alone. |
| OWNER-006 | P2 | Owner found the second run easy enough to beat effectively solo. | After submission, balance normal-health human parties and mixed mock parties across two/four/six participants; preserve all five floors and optional harder cycle. |
| OWNER-007 | P2 | Loss screenshot exposes a raw strike error after expedition failure; results copy mentions client/server internals. | Disable inappropriate actions after results and use readable game-facing explanations while retaining internal diagnostic codes outside the player flow. |
| OWNER-008 | P1 | Owner reports an iPhone finger sliding from Up into the lower-left notification selects text and opens native selection UI, interrupting gameplay until selection is dismissed. | Prevent selection and native callouts on gameplay notifications and movement surfaces; move transient text outside the thumb-drag area and let decorative notices ignore hit testing. Preserve selection in forms/story/QA fields and accessible live announcements. On physical iPhone, long-press and drag Up across notifications during incoming updates: no selection/callout/page drag and no stuck movement after release or pointer cancellation. |
| OWNER-009 | P1 | Owner reports enemies damage arriving players after a portal while story artwork still covers both clients. Source `showTravelChapter` opens a local modal after travel and releases movement; it provides no server readiness/protection handshake. | Before combat exposure, place travelers in a server-enforced protected arrival space separated from enemy attacks, projectiles and aggro. Track loading and story readiness for current connected human participants using a transition ID; bots do not count as readers. Show clear party-ready status. Test staggered dismissals, slow loads, disconnects, reconnects and duplicate/stale readiness events. No health loss behind a required story banner. |

## Additional owner feedback: touch selection and story arrivals

These two findings were reported after the initial media review and are not marked independently reproduced or fixed. The notification CSS currently lacks the selection suppression already present on touch buttons. This supports a targeted input/UI investigation, not a physical-device pass.

Recommended transition direction, pending implementation review: a visible protected arrival alcove or staging barrier consistent with the approved environment. Permit safe loading and story reading, then make danger an explicit step out of that space with a readable warning. The owner's suggested urgency remains in pacing and attention after the scene is visible. Damage while enemies are obscured is a defect, not an accepted difficulty rule.

Keep the 30 Hz simulation authoritative. Readiness messages express client intent; they must not grant unrestricted immunity or freeze other active rooms. Validate membership and transition ID, bound waiting, handle disconnected/slow readers through safe recovery or spectator behavior, and do not let a timeout expose a still-obscured player to damage. Protected players cannot attack or farm resources from safety. The exact barrier, timer and recovery policy are proposals rather than an approved new scope contract. Any barrier implementation must preserve visible-solid/server-AABB parity.

Smallest follow-up proof: two real clients enter the same portal; delay one client loading/closing its story and close the other immediately. Record both banners, readiness, health and first enemy attack. Repeat with iPhone sleep and a stale readiness replay. Separately record physical-phone notification drag/long-press behavior. Do not close these tickets from CSS string tests or a headless screenshot alone.

## Acceptance status

- PASS WITH FINDINGS: owner-reported phone/laptop room joining, ongoing synchronization and full campaign; screenshot evidence confirms results and a phone loss screen.
- PASS, visual evidence only: Cycle 1 and Cycle 2 desktop victory/results presentation; compact phone controls in newer captures.
- OPEN: failed return after backgrounding, item claim clarity/consistency, startup recovery, title obstruction, touch selection interrupting controls, damage beneath story overlays, normal-health coordinated two-human play, four/six-human tests, independent host-performance comparison and final 95% visual jury.
- Audio fidelity and every action's touch behavior were not assessed in this review.
- Submission acceptance or competition eligibility is not established by the gameplay evidence.

## Tracking and next work

The local `docs/NOTION_TASK_BOARD.csv` contains reconciled parent-task evidence and OWNER-001 through OWNER-009 as unique backlog rows. Connector discovery exposed no Notion write tools; computer-use inventory reported local browser use disabled in Work settings. Live Notion was not modified. Update matching parent tasks in the existing release board and create/update defect rows by stable ID, rather than importing the entire CSV again and duplicating existing tasks.

Existing live board: https://app.notion.com/p/40a1b4945bee80e7b60ff09e26690db5?v=40a1b4945bee80a5bfbe000c40c5448c

The review changes documentation only. Keep gameplay frozen for the submission; no difficulty, loot semantics, asset promotion or hosting migration was applied.
