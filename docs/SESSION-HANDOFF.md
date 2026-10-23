# Work-session handoff

This repository continues the HandShake Dungeon Core Crawler architecture and server work.

## Decisions carried forward

- Server-authoritative room state for up to six players.
- Four-character, short-lived room join codes; separate random reconnect token, no account login.
- Clients send movement intent; the server owns transforms and AABB collision outcomes.
- Fixed 30 Hz simulation and room-scoped synchronized snapshots.
- Three.js rendering and Socket.IO transport are separate adapters around portable runtime contracts.

## Current files

- `server/server.js` — first server implementation.
- `Technical-Architecture.md` — gameplay/network design baseline.
- `Runtime-File-Architecture.md` — decoupled source tree and per-file contracts.
- `scripts/` and `.github/` — local checks/startup and multiplayer bug intake.

## First continuation action

Run `pnpm install`, then `pnpm check`. The prior attempt to download Socket.IO failed TLS certificate verification against the npm registry. Do not disable TLS verification; configure a trusted CA or use the approved network environment before retrying.

## Known implementation gaps to track

- `server/server.js` is a single-file vertical slice; split it according to `Runtime-File-Architecture.md` as the project grows.
- Portal resolution, room-specific world configuration, durable checkpoints, and production monitoring still need implementation.
- The 30 Hz loop is a nominal fixed cadence on Node.js, not a hard real-time guarantee; observe tick duration under load.
