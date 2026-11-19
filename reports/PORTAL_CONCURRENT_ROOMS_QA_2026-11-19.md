# Concurrent room portal isolation check, 2026-11-19

**Checkout:** `qa/final-sprint-integration`, starting HEAD `4cc49f8d1f98dd367d7139695afd2c5cdc3af835`.
**Scope:** One regression in the open Gate 1 portal item. Only the integration test and this evidence/checklist update were changed.

## Result

Two separate running rooms, each with a host and peer, moved their hosts into portal range using server-approved input. Both hosts queued the same action ID concurrently. Each acknowledgement succeeded, each peer received exactly one `portal:resolved` event for its own room, and each room's snapshot matched its own acknowledgement. Replaying the action ID in each room returned its original result without a second event. The test does not require different random destinations because both rooms may legitimately choose the same vault.

The initial focused run returned `OUT_OF_RANGE` because the fixture hosts had not moved to their portals. The test was corrected to use authoritative movement, and the final focused run passed.

## Fresh local evidence

| Check | Result | Limit |
| --- | --- | --- |
| `node --test --test-name-pattern='simultaneous portal entries' tests/five-floor-integration.test.js` | Passed 1/1. | Fake transport and open fixture geometry. |
| `node --test tests/five-floor-integration.test.js` | Passed 5/5 with command-local `NODE_PATH` to the sibling main checkout dependencies. | The full route fixture uses boosted health and does not prove a normal-health human campaign. |
| `npm.cmd run check` | Passed; syntax checked 55 JavaScript files. | Syntax only. |
| `git diff --check` | Passed. | Formatting only. |

This adds local room-isolation evidence. Independent browsers at 2/4/6 players, physical phone play, normal-health campaign review, and the exact public revision remain unverified. Full release status remains **NO-GO**. Player feedback stays local for human review; no issue-triggered AI repair or export was enabled.
