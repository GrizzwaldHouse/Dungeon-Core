# Integrated UI audit and target layout

**Audit date:** 2026-11-03 UTC

**Candidate:** `b55b046f678d392644707b17c4bcbb0c6226cb78` on `qa/final-sprint-integration`

**Scope:** Read-only review of `client/index.html`, `client/styles.css`, `client/app.js`, and `client/render.js`. No interface or gameplay source was changed.

## Before images and method

The local server ran at `127.0.0.1:3042`. `node scripts/capture-layout-evidence.js` created a room, added four mock explorers, started the entry room, and captured angled and top-down views in headless Chrome with SwiftShader. The report recorded one WebGL canvas, `webglReady: true`, no recovery overlay, zero browser errors, and an optional favicon 404 warning. This is a short local visual sample with mocks, not a human playthrough, a physical phone, or public-host evidence.

The private before images are in `C:\Users\daley\.codex\visualizations\2026\11\03\01a1a25e-c8ff-77e2-acbc-3b66d7225e2a\dungeon-ui-audit-before\`: `desktop-angled.png` (1440 x 900), `desktop-top-down.png`, `phone-viewport-angled.png` (390 x 844), `phone-viewport-top-down.png`, and `report.json`. The images contain a temporary room locator and stay local for human review. They are not staged as publication media.

## Current layout observations

| Area | Observation on this candidate | Next review point |
| --- | --- | --- |
| Desktop play | The angled view shows the player, portal, pillars, and party in the scene. A tall right rail holds floor state, objective, vitality, target, and action controls. Its lower controls require panel scrolling at 1440 x 900. | Verify that the right rail never covers an active target or portal during a continuous route, including close melee. |
| Information hierarchy | The top bar spells out connection state and room locator. `app.js` closes party details during running play and times out the keyboard hint. The floor name appears in both the phase line and floor banner in the captured state. | Keep immediate objective, health, threat, and action readable while reducing duplicate floor text and nonessential persistent controls. |
| Narrow viewport | At 390 x 844, the compact strip leaves the central player and portal visible. The screenshot still shows the desktop keyboard hint and has no touch controls. The capture script changes viewport size but does not establish a coarse pointer or real touch input. | Capture the actual coarse-pointer layout and physical-phone portrait and landscape behavior before judging touch placement or HUD coverage. |
| Visual direction | The room has readable floor slabs and distinct actor markers, but the wall and pillar shapes remain spare beside the approved shifting-fantasy title art. The capture does not show a portal transition or a second floor. | Judge scene readability and visual consistency floor by floor, using the approved cover as reference without treating concept art as a runtime screenshot. |

The old source-level findings in `docs/PUBLISH_READINESS_AND_TEST_PLAN.md` describe the 2026-10-23 baseline. Current source has a textual connection label at narrow widths, a focus gate, a graphics recovery overlay, and a compact running HUD. Those changes still need browser and device acceptance where the checklist says so.

## Target layout for the UI owner

| View | Persistent layout target | Interaction target |
| --- | --- | --- |
| Desktop | Top bar for connection and room; compact right rail for floor, one immediate objective, player vitality, nearest threat, and available actions. Keep the central and lower-middle combat space visible; aim for roughly 20 to 25 percent or less persistent HUD coverage. | Put roster, camera, sound, and longer controls guidance behind a clear details control. Do not hide a necessary action below an unmarked scroll. |
| Phone portrait | Text connection state in the header; a short, readable floor and vitals strip; scene center open for player, hazard, and exit; touch controls anchored to safe areas at the bottom. | Place transient status above controls without covering movement, and allow the expanded mission panel to scroll and close without trapping gameplay input. |
| Phone landscape | Compact status at the edge, with the objective and danger cue readable at normal size. Reserve clear space for two hands and the live player. | Prove that collapsed and expanded text, controls, and recovery actions remain visible at a short viewport height and after rotation. |

Next acceptance is a fresh running-game capture at desktop, 390 x 844 coarse pointer, and 844 x 390 coarse pointer, followed by physical-phone review. Check 200 percent zoom, keyboard focus, reduced motion, contrast, and transient messages separately. This audit defines the layout target and closes only the audit checklist item. It does not close implementation, visual publication, multiplayer, or release gates.
