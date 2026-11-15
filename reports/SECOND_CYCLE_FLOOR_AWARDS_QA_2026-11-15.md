# Second-cycle floor award QA, 2026-11-15

Candidate before this test-only milestone: `803f0af524c5f55a80b9503699a5ba617d36cfe7` on `qa/final-sprint-integration`.

Extended the existing fake-transport five-floor integration test. It now records server `floor:completed` events, completes the first five floors, continues into cycle two, defeats its stronger Sentinel, enters the vault, disarms the trap, and exits floor one through player intents. The assertions require five first-cycle award events, one additional second-cycle award with a distinct award ID, cumulative host base XP of 600, and no extra award after a separate repeated exit intent. The fixture includes a connected peer, but the new assertions inspect the host's XP only.

Fresh local checks: `node --test tests/five-floor-integration.test.js` passed 2/2 with `NODE_PATH` pointing to the sibling main checkout's installed dependencies. The first attempt could not load `socket.io` because this worktree has no local `node_modules`; it reached no test assertions. `npm run check` syntax checked 55 JavaScript files. `git diff --check` passed. No production source changed.

This test uses fake sockets, an open test arena, accelerated cooldown time, and boosted health. It verifies this server path, not real-player difficulty, the complete normal-health campaign, physical-phone behavior, or a public deployment. The broader Gate 1 item remains open. Player feedback remains local for human review; no issue-triggered AI repair is enabled.
