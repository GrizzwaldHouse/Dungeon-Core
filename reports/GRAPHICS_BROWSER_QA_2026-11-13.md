# Local browser graphics recovery QA, 2026-11-13

Candidate before this test-only commit: `4190d9f61431ab044df5e8595f3096f32a792f10` on `qa/final-sprint-integration`.

## Method and result

`scripts/check-graphics-browser.js` started a local server, opened headless Chrome with SwiftShader, created a room with four mock explorers, and started the entry floor. It checked the live canvas at 1440 x 900, 720 x 450, and 390 x 844. The 720 x 450 CSS viewport is a layout-size proxy for 200% zoom from 1440 x 900, not an actual browser zoom setting. At each size, the canvas matched the viewport and WebGL stayed ready.

At 390 x 844, the browser's `WEBGL_lose_context` extension forced a real graphics context loss. The game removed its ready state, showed the readable graphics-paused message, and kept Reload game inside the viewport. After `restoreContext()`, the overlay closed, WebGL became ready, and the dungeon scene reappeared. The browser displayed the status message "3D view restored. Continue the expedition." The five local screenshots were inspected, including lost and restored states.

`npm run check` passed for 54 JavaScript files. The first browser attempt could not start Chrome in the restricted process environment and timed out waiting for its DevTools port. The permitted local loopback retry completed all assertions. The run did not instrument the browser console, measure frame rate, or check gameplay progression.

## Private evidence and limits

The private screenshots and `report.json` are in `C:\Users\daley\.codex\visualizations\2026\11\13\01a1d4fc-4795-7083-a027-36e0db89df5b\graphics-browser-local`. Screenshots show a temporary room locator and are kept for local human review. The committed script prints only layout and recovery state, not the locator.

Actual 200% browser zoom, high/low contrast scenes, low frame rate, independent browser and physical-phone behavior, normal-health human campaign, and public deployed revision remain unverified. This local graphics milestone does not change the full release NO-GO verdict. Player reports remain local for human review; no issue-triggered AI repair is enabled.
