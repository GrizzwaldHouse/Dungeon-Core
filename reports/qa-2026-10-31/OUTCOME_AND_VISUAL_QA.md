# Outcome and visual QA, October 31

Decision: HOLD against the owner's 95 percent visual gate.

This is the preliminary capture. The lead subsequently added an explicit outcome exit action; a new frozen-source capture must verify that later change before closing the finding below.

## Fresh checks

- Syntax validation: 54 JavaScript files passed.
- Focused five-floor integration and outcome tests: 4 passed, 0 failed, 26.55 seconds.
- Assisted campaign capture: 16 screenshots, 0 browser errors.
- Source at capture completion: `55d00769a448bb5b40f2f6ecc456444156379af9`.
- Actual authoritative campaign reached Floor Five, defeated the Shifting Core Warden, entered the final gate, and reached `COMPLETED`.
- Victory screenshots captured at 1440x900, 390x844, and 844x390.
- The host's harder-cycle UI action successfully restarted the campaign.
- Explicit server-owned damage fixture then downed both players and produced `FAILED` with defeat screenshots at all three sizes.
- No DOM snapshot or client-owned health mutation was used to fabricate outcome state.

## Evidence boundaries

The campaign used playerSpeed 25 and maxHealth 1000. It proves authoritative state transitions and rendered outcome UI, not default combat balance or physical-phone usability. Defeat used the server damage fixture rather than natural enemy damage. The headed capture failed before Chrome exposed DevTools; the successful fallback was headless Chrome/SwiftShader. No OBS gameplay recording is established by this capture.

`client/app.js`, `client/index.html`, `client/styles.css`, and `server/server.js` hashes stayed stable during the successful run. `client/render.js` changed from `600da39f99f7affbcb1bbcd5638002fcb95d57f0f972cf65a1e0130f2c3ba328` to `51381ea1b537be7e05075082f59a90dda5b2dcfd0e86806ca8f1eda98f1275af` during capture, so character appearance evidence needs a fresh run after the renderer milestone. The JSON report preserves both hash sets.

## Visible findings

1. Phone portrait Deepwood controls now show authored SVG icons and text labels. No emoji appears in the observed touch-control surface.
2. Portrait victory and defeat headings, player results, and explanatory text are readable and unclipped.
3. Landscape victory has a short scrollable panel. Its harder-cycle action falls below the initial captured view. Scrolling/touch reachability must be tested before accepting this layout.
4. Victory and defeat panels have no explicit leave/regroup button inside the panel. Defeat copy instructs the player to leave through the background party panel. This needs direct phone usability review or an accessible outcome action.
5. Deepwood boss, player, and portal remain visually clustered in the portrait capture.
6. Environment still looks sparse and rectangular compared with the approved title-cover reference. More tactile pillar material alone does not close that gap.
7. The capture has no audio evidence and does not cover all five floors in all device sizes.

## Why 95 is not awarded

The complete floor/device matrix is missing, the exact final renderer changed during capture, physical-phone controls and default healing pace remain unverified, and the owner reported healing difficulty. A current public served-revision match and recorded visible gameplay are also pending. No aggregate 95 score is claimed from partial screenshots.

## Executable handoff

Run `node scripts/qa-2026-10-31/capture-outcomes.js <output-folder>` from the repository root for the assisted headless outcome proof. Set `QA_HEADED=1` only when visible Chrome is explicitly intended and OBS recording is confirmed. The user subsequently requested in-app browser QA; a separate visible in-app playthrough remains necessary.

The harness retains authored world collisions and public movement/combat/portal intents. It routes rune movement around the amber altar instead of disabling that obstacle. A prior straight-line harness attempt stopped at that altar and was corrected; it was not treated as a player collision defect.

Before human phone testing: verify the deployed revision, load both devices, collect supplies, test heal feedback and charge use, down/revive, rotate portrait/landscape, reconnect, and observe actual victory/defeat actions. Record each result with device/browser, revision, expected behavior, observed behavior, and defect severity.
