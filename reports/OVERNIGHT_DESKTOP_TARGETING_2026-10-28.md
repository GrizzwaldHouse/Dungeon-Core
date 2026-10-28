# Desktop target selection milestone - October 28, 2026

## Ownership and recovery

Run started at 01:32 PDT. Required instructions, Git workflow, client guidelines, overnight handoff, current mock jury, and automation memory were read before edits. Branch `gameplay/release-integration` matched the authorized prior HEAD `f5b419dd07fe31fe2b74cbf1ab85e7dee034d192`. No other local project Codex chat was active. This automation owned the serialized desktop client slice and client tests; no server files changed.

`main` remains `eeabf4108d5def29c8bf38605ab269096913e549`; `design/dusk-qa` remains `c70683b9c6ed719ad2ea5dcd5fa7cf5878a07f2f`. The original eleven concept PNGs stay untracked and unstaged. No assets were promoted, no infrastructure provisioned, and no push or deployment occurred.

## Behavior

- A labelled native target selector lists live snapshot enemies in stable ID order. Q cycles through them and automatic mode while the playfield has focus. Repeated keydown and typing in other controls cannot change selection.
- Explicit selection sends only an optional `targetEnemyId` alongside a fresh opaque action ID. Server range, visibility, damage, cooldown and replay decisions remain unchanged. Automatic mode omits the ID and retains nearest-reachable server selection; its proximity HUD remains informational.
- The HUD shows SELECTED plus authoritative health. A distinct gold ring follows the selected enemy, including airborne snapshot height; it indicates selection rather than reachability.
- Death, removal, room/session change, space revision change, disconnection and non-running phase clear selection. A space transition clears it even if an enemy ID is reused. A failed explicit request does not retry against another enemy.
- Range rejection now tells the explorer to move closer with a clear path, without naming every enemy a Sentinel.

## Evidence

- Final `npm run check`: 32 JavaScript files passed.
- Final `npm test`: 74/74 passed with approved loopback access outside the sandbox. An initial 73-test run passed; after final regression additions, a sandbox rerun encountered WebSocket setup failures. The final outside-sandbox run passed all 74 without changing networking tests.
- Behavioral client tests cover selected intent, no client damage mutation, automatic payload omission, disconnected transport rejection, stable cycling, key-repeat and typing guards, dead/removed targets and reused IDs across space transitions.
- Two independent local browser sessions joined a human-only party. Desktop interaction verified native selection, Q cycling to automatic and back, SELECTED label, gold ring, out-of-range rejection, movement and Space strike. Authoritative Sentinel HP changed from 100 to 80. Both browser consoles had zero warnings/errors when inspected.
- Browser verification used the working desktop slice before the final space-revision guard and viewport-label additions; those additions passed the final automated suite. The initial mock-party browser attempt defeated the target too quickly, so the successful check used humans only.
- Browser screenshots were visually inspected at 1280x720. This is local desktop evidence; it does not establish Barkwing encounter playthrough, touch controls, 390x844 layout or physical-phone acceptance.
- Source diff and whitespace checks reviewed before explicit-path staging; staged diff must be reviewed before committing this report with the six changed code/test files.

## Next serialized slice and open gates

Next: touch target control and selected-target feedback at 390x844; then server-owned victory/results with explicit harder-cycle continuation, results UI, broader responsive QA, measurement tooling/30-minute soak and warning-audio deduplication. The new dropdown is available to browsers but has not been certified as the touch interaction.

The mock-jury score remains 71/100 HOLD; no re-score prerequisites are complete. Public HTTPS/WSS URL, real phone, public restart/reconnect, continuous demo, submission evidence and asset provenance remain open. DigitalOcean still awaits the user's region and size choice; do not infer those billing choices or repeat provisioning attempts. No billable resource was created.
