# Browser evidence — October 25, 2026

Candidate: `08d9615` plus documentation-only evidence capture

## Visibly confirmed

- `01-lobby-four-mocks.png`: room `ZGMA` contains the host and four server-owned mock explorers. The roster exposes `patrol` intent for each mock.
- `02-floor1-independent-investigate.png`: Floor One is running; the roster exposes `investigate` for all four mocks and the event feed reports that the party defeated an enemy.
- `03-shifted-vault-party.png`: the server accepted a portal transition into the shifted vault; the roster returned to `patrol` after the encounter.
- `04-six-player-sentinel-engage.png`: a six-player Floor One room rendered and the event feed reports another party enemy defeat.
- `debug-current-vault.png`: diagnostic-only vault state retained to make the interrupted capture reproducible; it is not acceptance evidence.

## Not proved by this sequence

These still images do not prove continuous independent trajectories, boss targeting, a player-down event, a mock approaching and completing a revive, recovery-room entry, or resumed post-revive play. No video recorder was available through the active browser tools, and the capture worker reached its usage limit before the required sequence completed. The mock-party browser gate therefore remains open even though deterministic server tests cover engage, rescue, revive, and resume behavior.

Phone/computer multiplayer was not attempted and remains reserved for Marcus's acceptance pass.

## Reproduction target

Start the exact candidate, create one room, add four mocks, and begin the expedition. Keep the party roster expanded so intent changes remain visible. Capture or record: `investigate` with separated positions, `engage` against the Sentinel and a boss, `rescue` while a human is downed, the server-confirmed revive and consumed healing charge, recovery entry, and resumed `investigate` or `engage` behavior. Record browser console errors and the room code only for that temporary session.
