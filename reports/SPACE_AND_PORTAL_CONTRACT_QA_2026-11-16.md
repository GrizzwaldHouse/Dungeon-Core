# Space and portal contract review, 2026-11-16

**Checkout:** `qa/final-sprint-integration`, starting HEAD `18d983ec88b75f92cda1fec006b1a1b44e9b52be`.
**Scope:** The first open Gate 1 documentation item. No runtime source or asset changed.

## Source review

- `server/dungeon-run.js` owns the private run seed, first-vault choice, current portal, and public floor/space/portal/trap projection.
- `server/server.js` validates and queues `portal:enter`, resolves it on a room tick, checks all member landings, changes geometry and positions together, emits transition events, and constructs snapshots. `run:continue` requires completed results, the current host, and a matching completed cycle.
- `docs/SPACE_AND_PORTAL_CONTRACT.md` records the implemented directed route and wire fields. It calls out that this is current stage logic, not a reusable graph registry. The original checklist's sequencing target was already past when this review began.

## Fresh checks

| Check | Result | Limit |
| --- | --- | --- |
| `node --test --test-name-pattern='server portal transition is private' tests/server.test.js` with `NODE_PATH` pointed to the sibling main checkout's installed dependencies | Passed 1/1 with permitted local loopback. | Real local Socket.IO transport with compact fixture geometry; no public host or human browser. |
| Same focused command in the restricted command sandbox | Failed before assertions because its WebSocket handshake could not connect. | Environment restriction, not evidence of a game failure. |
| `node --test tests/five-floor-integration.test.js` with the same command-local `NODE_PATH` | Passed 2/2. | Fake transport and test-only geometry; the long campaign fixture uses boosted health and does not prove normal-health human play. |
| `git diff --check` | Passed before staging. | Formatting check only. |

The contract item can close as documentation of observed source and focused local checks. Portal bounds, safe placement, complete human play, independent browsers, physical phone, and public staging remain separate unchecked gates. The release verdict remains **NO-GO**. Player feedback stays for local human review; no issue-triggered AI repair was enabled.
