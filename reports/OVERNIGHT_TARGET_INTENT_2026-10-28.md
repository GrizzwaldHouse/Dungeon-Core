# Server target intent milestone — October 28, 2026

## Scope and ownership

The overnight automation owns this bounded server slice: `server/server.js`, new `server/combat-target.js`, targeted combat tests, and this evidence report. No other local Codex project chat was active at preflight. Client files are unchanged and available for the next serialized slice.

Preflight: `gameplay/release-integration` at `cdfa850b86c97b62b89d37c8b469df417e91aa44`. Its diff from the handoff runtime baseline contained only the two handoff/jury documents. `main` remains `eeabf4108d5def29c8bf38605ab269096913e549`; the design worktree remains `c70683b9c6ed719ad2ea5dcd5fa7cf5878a07f2f`. Eleven concept PNGs remain untracked and unstaged.

## Implemented contract

`combat:attack` accepts `{ actionId, targetEnemyId? }`. An optional target ID must contain 1–80 ASCII letters, digits, underscores or hyphens. The server resolves it only in the socket's current room, checks live health, horizontal attack range and obstacle visibility, and owns all damage and cooldown changes. This preserves the existing horizontal reach of attacks against airborne Barkwings; it does not add ranged weapons or trust client altitude.

Malformed IDs return `INVALID_TARGET`. Missing, defeated, or previous-space targets return `TARGET_UNAVAILABLE`; blocked or distant targets return `OUT_OF_RANGE`. Explicit target failure never falls back to a nearby enemy. Requests without a target retain existing nearest-reachable selection, including mock explorers. Replayed action IDs return their cached result even if a different target is supplied. Failed live-target requests are also cached for the bounded 32-action replay window.

## Validation

- `npm run check`: 32 JavaScript files passed.
- `npm test`: 73/73 passed outside the sandbox with local loopback access. The sandbox attempt passed 51 tests but failed all 22 network tests at WebSocket connection setup; this was an environment boundary, not a gameplay failure.
- Focused selection test covers a selected airborne Barkwing behind a nearer ground enemy, blocked visibility, range, death, removal and a foreign/missing ID without collateral damage.
- Socket combat tests cover malformed IDs, unavailable selection, replay with changed target, forged damage/position, cooldown, explicit range and wall rejection, and shared authoritative health.
- Full five-floor progression now sends explicit target IDs, asserts the acknowledged enemy is the requested enemy, and clears Deepwood/Barkwings before completing the existing campaign cycle.

## Remaining queue and gates

Next: desktop target selection and feedback, then touch target controls. Follow with server-owned victory/results and explicit harder-cycle continuation, results UI, 390×844 QA, measurement tooling/30-minute soak, and warning-audio deduplication. No browser or physical-device targeting evidence is claimed by this server-only milestone.

The mock-jury report remains 71/100 HOLD; its re-score prerequisites are not met. Public URL, HTTPS/WSS, real phone, restart/reconnect, asset provenance, and continuous demo gates remain open. DigitalOcean provisioning awaits the user's region and size choice; no billable resource was created. Deployment and asset creation remain authorized subject to those concrete prerequisites. No assets were promoted or staged.
