# Local protocol boundary check — 2026-10-28

This is a bounded automated QA result for the current worktree, not a public release gate. The test at `tests/protocol-boundary.test.js` opens seven separate Socket.IO WebSocket clients against an ephemeral loopback server. It verifies six joins, refusal of the seventh without roster growth, rejection of NaN/infinite/non-numeric/fractional movement values, acceptance of the next valid sequence, and rejection of a duplicate sequence.

## Evidence

- Starting HEAD: `714ddfbef71f1e4910aac872a1217cc0c463e423` on `gameplay/release-integration`.
- `npm run check`: passed, 33 JavaScript files.
- `node --test tests/protocol-boundary.test.js`: 1/1 passed with loopback network permission. The restricted sandbox run could not establish a WebSocket and did not execute the assertions.
- `npm test`: 77/77 passed with loopback network permission on the current worktree.
- The worktree also contains pre-existing, uncommitted client UI/touch-control edits and concept images. The full-suite result includes those edits; it is not a clean-revision or browser result.

## Still open

The Gate 3 protocol item remains unchecked. This test does not cover burst throttling, every action payload, reconnect abuse, two physical browsers, public latency, or cross-room state under hostile traffic. The October 30 exact-revision decision and public staging remain separate gates.
