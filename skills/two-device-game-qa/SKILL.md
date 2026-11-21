---
name: two-device-game-qa
description: Run a multiplayer smoke test with one game client on each of two physical computers and verify that they observe the same authoritative game session.
---

Find the project's multiplayer test entry point. For Dungeon Core use `docs/TWO_DEVICE_QA.md` in the QA checkout. For another game, map the host, join, start and state observations below to its existing client or engine test harness.

1. Confirm which agent or operator can launch processes on each named computer. Record the game revision on the server and the clients when available. A loaded project or remote desktop session establishes control only.
2. Reuse one game server and a private game route selected by the operator. Check health and the actual game transport from the peer. A project that publishes a loopback port needs a separately provided route for the peer. Report the first failing layer. Launch a second server only for a separate run.
3. Run one native or browser client per physical machine. Have the first create a fresh room and the second join it through a private handoff. Use a fresh run ID and a finite join deadline. Keep room locators, reconnect credentials and network configuration out of the evidence.
4. Trigger an authoritative state change. Collect a receipt independently from each participant with role, per-run device marker, session correlation, and observed state. Check both receipts correspond to the same run and room, distinct devices and expected state. Retain only the evidence needed to reproduce the result.
5. Report the observed scope: local rehearsal, physical protocol test, or interactive gameplay. If rendered play is required, open the real clients on the two machines, act on each and verify the other screen reflects the action. Close only resources created by the run.

On a missing route or unavailable machine, exercise the local rehearsal if possible and report exactly which participant or stage remains unverified. Reuse the project runner's exit status and sanitized receipts in automation.
