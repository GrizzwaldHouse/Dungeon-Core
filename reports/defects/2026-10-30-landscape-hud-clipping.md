# Landscape phone HUD clips collapsed status text

- Status: candidate fix implemented; automated and headed-browser review passed, physical-phone review pending.
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
- Candidate fix: the short-landscape live region now reserves 48 pixels for two complete 12-pixel status lines plus padding, clamps after the second line, and hides overflow at a line boundary. This keeps the full accessible live-region text while preventing partial glyphs beneath the visual border.
- Fix verification: focused layout checks pass 11 of 11, the complete suite passes 173 of 173, and 71 JavaScript files pass syntax validation. Two independent headed Chrome clients completed seven authoritative agreement checkpoints with zero browser errors. The fixture-assisted 844 by 390 capture in `docs/evidence/nov12-landscape-hud-headed/` shows two complete lines with clean ellipsis and no clipped glyphs. The rendered CSS hash is `1dc1b25f1f17aacfd866787675e38d3c8622eab6439bc78e0770e0aaad2c6b31`. Physical iPhone landscape review remains pending.
