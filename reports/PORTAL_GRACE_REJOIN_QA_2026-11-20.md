# Portal grace-member rejoin check, 2026-11-20

**Checkout:** `qa/final-sprint-integration`, starting HEAD `fed60d8ca547d8ba50f1424cd6b662bbe9aa44a0`.
**Scope:** One regression in the open Gate 1 portal item. This run changed only the integration test, checklist, and this report.

## Result

A host moved into portal range through server-approved input while a peer remained within the reconnect grace period. The host's portal intent succeeded and emitted one resolution event. Both members landed in the chosen vault at separate positions, including the disconnected peer. The peer rejoined in that destination at the transferred position. Replaying the host's action returned the original acknowledgement without another resolution event. The test kept the reconnect capability in memory and did not print it.

## Fresh local evidence

| Check | Result | Limit |
| --- | --- | --- |
| `node --test --test-name-pattern='disconnected grace member lands' tests/five-floor-integration.test.js` | Passed 1/1. | In-process fake transport and open fixture geometry. |
| `node --test tests/five-floor-integration.test.js` | Passed 6/6 with command-local `NODE_PATH` to sibling main checkout dependencies. | The full route fixture uses boosted health; this is not normal-health human play. |
| `npm.cmd run check` | Passed; syntax checked 55 JavaScript files. | Syntax only. |
| `git diff --check` | Passed. | Formatting only. |

Real Socket.IO and independent browser 2/4/6-player portal travel, physical phone play, a normal-health campaign, and exact public revision remain unverified. Full release status remains **NO-GO**. Player feedback stays local for human review; no issue-triggered AI repair or export was enabled.
