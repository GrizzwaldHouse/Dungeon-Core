# Landscape phone HUD clips collapsed status text

- Status: open; fix not verified.
- Severity: P1 major usability defect; release visual gate remains HOLD.
- First observed: 2026-10-30.
- Source revision: `1063f366c06651461a0e21d813f9949b36f3e50a` plus pre-existing uncommitted `client/styles.css`, `client/index.html`, `client/app.js`, and related client changes. The screenshot is **worktree** evidence, not clean-commit evidence.
- Expected: at a short landscape phone viewport, the compact status panel shows its visible text within the border or hides a complete optional row cleanly.
- Actual: in the 844×390 headless capture, the collapsed top-right panel cuts status text beneath its lower border. The source constrains the panel to `max-height: 76px` in this layout.
- Reproduction: (1) Run the current modified client in an 844×390 landscape browser viewport. (2) Enter a running room and collapse the mission panel. (3) Inspect the top-right status panel at normal size.
- Reproduction rate: 1/1 inspected after-capture; no physical-device reproduction yet.
- Affected rooms/players: any running room using this viewport and collapsed panel; observed with one local browser and mock companions. No real-player count was established.
- Evidence: internal [landscape headless screenshot](../../docs/evidence/phone-hud-landscape-after-2026-10-30.png), visually reviewed on 2026-10-30. It contains a room locator and must remain local until redacted. `node --test tests/phone-hud-crowding.test.js` passed 2/2, showing that the structural test misses the pixel clipping.
- Owner: client UI owner; no active editor of those paths was visible during this audit. The source files were preserved without modification.
- Workaround: expand the panel where space permits or use portrait; neither is an accepted fix for landscape usability.
- Fix verification: pending a reviewed UI change and fresh landscape headless plus physical-phone capture on the exact candidate revision.
