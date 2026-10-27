# Mock rescue test checked intent before the next tick

- Status: resolved in the local server test on 2026-10-27; continued stability needs later runs.
- Severity: P2 test timing defect; no production game-rule failure was established.
- First observed: 2026-10-27.
- Source revision: `e42476a7a8a13133e1c7ebc7810db2ad1aa27a37` with the pre-existing uncommitted camera UI files and a local `tests/client-ui.test.js` repair.
- Expected: after a mock revives a human, its intent returns to `ENGAGE` on a following server tick.
- Actual: one full-suite run captured the `player:revived` event while the mock still held `RESCUE`, so the immediate assertion failed; 56 of 57 tests passed.
- Reproduction: (1) Run `npm test` on that worktree. (2) Inspect `mock explorer detects and revives a downed human before resuming combat`. The failure depends on event/tick timing.
- Reproduction rate: one of two full-suite runs on October 27 before the timing repair. An isolated rerun could not establish a WebSocket in the command sandbox, so it did not test this assertion.
- Affected rooms/players: one local test room, two human players and one mock explorer.
- Evidence: [October 27 regression result](../../docs/TESTING_AND_METRICS.md).
- Owner: server test harness.
- Workaround: none needed after the test waits a bounded number of ticks for the post-revive intent.
- Fix verification: the next full `npm test` passed 57/57 and `npm run check` checked 26 files. This establishes one local run, not long-term flake elimination.
