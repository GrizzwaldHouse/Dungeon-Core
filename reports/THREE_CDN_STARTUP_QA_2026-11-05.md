# Three.js startup dependency QA, 2026-11-05

Candidate: local `qa/final-sprint-integration` at `368b042995f9e95df760bb81480fd4a68f38845b` before this test milestone.

## Local check

`tests/client-ui.test.js` now checks the import map's pinned Three.js 0.186.1 jsDelivr URL. It runs the page bootstrap in a VM with a rejected dynamic import, after the Socket.IO script reports a successful load. The page hides room entry, reveals startup help and a current-origin reload link, and sets the visible connection text to `STARTUP ERROR`. This exercises the module-load failure path without contacting the CDN.

Focused command: `node --test tests/client-ui.test.js`, 15 passed, 0 failed. The additional test does not change the game runtime.

`npm run check` passed syntax validation for 52 JavaScript files. `git diff --check` passed. The full multiplayer suite was not rerun because this milestone changes only a VM test and release evidence text.

## Open acceptance

This VM simulation does not prove that the CDN loads on the public host or that a real browser displays the message when the CDN request is blocked. Repeat both cases on the exact deployed revision with a browser network panel and capture the visible state. The full release remains NO-GO until the other P0 gates pass. Player feedback remains for local human review.
