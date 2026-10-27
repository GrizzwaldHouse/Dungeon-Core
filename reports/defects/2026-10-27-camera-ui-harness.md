# Camera UI test harness lacks renderer method

- Status: open; no production gameplay failure has been established.
- Severity: P1 for release regression evidence, because the full local test suite is red.
- First observed: 2026-10-26; reproduced 2026-10-27.
- Source revision: `9d456c248be10f1164e0c001f2450dba13c3f7ff` when observed, with pre-existing uncommitted `client/app.js`, `client/index.html`, `client/render.js`, and `client/styles.css` camera UI edits. The same failure persisted after the npm operations commit `894d6dd82a48f237e41dd10cc18a9852014be6e4`.
- Expected: the client UI harness initializes the renderer stub and exercises room controls without throwing.
- Actual: `tests/client-ui.test.js` throws `TypeError: renderer.setCameraMode is not a function` while evaluating the current `client/app.js`; 56 of 57 tests pass.
- Reproduction: (1) From the repository root with dependencies installed, run `npm test`. (2) Observe the `name entry, create, start, leave, and join buttons follow room rules` subtest.
- Reproduction rate: 2 of 2 runs across the October 26 and 27 sprint checks.
- Affected rooms/players: not applicable; test harness initialization fails before a room is created.
- Evidence: [October 26 and 27 test results](../../docs/TESTING_AND_METRICS.md).
- Owner: client camera feature/test harness owner; no active concurrent editor was identified on October 27.
- Workaround: run the other focused tests for unaffected areas, while keeping the full suite marked failed.
- Fix verification: pending; update the renderer stub or coordinate the camera interface, then rerun `npm test` and inspect the resulting UI behavior.
