# MSI and PowerSpec multiplayer protocol test

Verified on 2026-11-21 in America/Los_Angeles.

## Result

PASS for the physical two-computer protocol test. A native PowerSpec host created a room on the existing PowerSpec game. A native MSI peer joined over the private Tailscale HTTPS route. Each received the server's RUNNING snapshot with exactly two connected players.

The independent role receipts were transferred privately with Taildrop. The verifier matched their run and session correlation, confirmed distinct per-run device markers, and exited 0. MSI peer exited 0 and its receipt transfer exited 0. The matching PowerSpec host receipt was received and verified on MSI.

The PowerSpec game health endpoint advertised baseline revision 1f398c79a8ada384debc84d1c3e953c10caa939c. Both role workflows used QA revision 34b43ac752fde50b14b137d01345d3b0954b7c90. MSI explicitly checked the expected game revision.

## Resolved failures

- Node 24.12.0 on Windows reached the expected game state and aborted during forced process exit with UV_HANDLE_CLOSING. Natural process shutdown and observation cleanup fixed the reproduced failure. Three consecutive rehearsals exited 0 under that version on MSI. PowerSpec independently reported its fixed rehearsal exited 0.
- MSI Node initially rejected the private HTTPS certificate chain with UNABLE_TO_VERIFY_LEAF_SIGNATURE while Windows HTTP succeeded. NODE_USE_SYSTEM_CA=1 enabled Windows trust and the health and Socket.IO checks passed with TLS verification enabled.
- The first invitation expired while commands were awaiting approval. Both agents were made ready before creating the successful fresh invitation. Windows Taildrop automatically saved incoming files in Downloads, which the MSI receiver checked.

## Evidence scope

This validates the actual cross-device game transport, room creation and membership, replicated start state and role-receipt correlation. Browser rendering, controls, movement, combat and human play acceptance remain pending. Local full-suite regression results are separate.

Private receipts remain in the per-run QA directory outside Git. Network origins, room locators, reconnect credentials and private handoff contents are omitted from this report.
