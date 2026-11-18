# Queued portal disconnect check, 2026-11-18

**Checkout:** `qa/final-sprint-integration`, starting HEAD `7973fdca463565a80ba92bfd1a43873c615a78c5`.
**Scope:** One regression within the open Gate 1 portal item. Existing untracked logs and captures were preserved.

## Result

The new in-process transport test queues a portal intent, disconnects its initiator before the room tick, and checks the `STALE_SESSION` acknowledgement. Neither party member moves, the space revision and trap remain unchanged, and no portal resolution event is sent. Rejoining and replaying the same action ID returns the recorded rejection. A fresh action succeeds after authoritative movement into portal range. A second running room retains its own space throughout.

## Fresh local evidence

| Check | Result | Limit |
| --- | --- | --- |
| `node --test --test-name-pattern='queued portal entry' tests/five-floor-integration.test.js` | Passed 1/1. | Fake Socket.IO transport and open fixture geometry. |
| `node --test tests/five-floor-integration.test.js` | Passed 4/4 with command-local `NODE_PATH` to the sibling main checkout dependencies. | The full route fixture uses boosted health; it does not prove normal-health human play. |
| `npm run check` | Exit 0; syntax checked 55 JavaScript files. | PowerShell's npm launcher printed an access warning for a global npm path before invoking the project script. |
| `git diff --check` | Passed. | Formatting only. |

This covers the queued-disconnect race in local server logic. Real Socket.IO transport, independent browsers at 2/4/6 players, physical phone, and the exact public revision remain unverified. Full release status remains **NO-GO**. Player feedback remains local for human review; no issue-triggered AI repair or export was enabled.
