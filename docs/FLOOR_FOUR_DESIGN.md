# Floor four: the Rune Trial

**Status:** Encounter module and focused unit tests exist. Central room routing, scene cues, browser QA, and multiplayer QA remain integration work.

The fourth floor uses three fixed rune circles at `(-6,-5)`, `(6,-5)`, and `(0,6)`. Living, connected humans activate them in order by entering a server-owned 1.4 m radius. Touching a later rune triggers a `RUNE_TRAP` warning at that player's position for 45 simulation ticks (1.5 seconds). At expiration, any still-connected living player within 2.2 m takes up to 13 damage. The warning has a 90-tick cooldown after resolution. The room tick prevents replayed damage.

Activating rune two spawns the Rune Guardian at a walkable position at least 2 m from connected explorers. If no safe position exists, each later tick retries without fabricating a spawn or marking the encounter cleared. Guardian health and attack damage scale only at spawn from the bounded run threat stack. The guardian moves and strikes from this module. Victory requires all three runes in order **and** guardian defeat.

## Server integration contract

- `startFloorFour(room,tick)`: call once after an atomic floor transition. It validates all rune positions before mutation; returns `floor4:start` or throws `RangeError` if impossible.
- `stepFloorFour(room,tick)`: call once per 30 Hz room tick after movement. Handles `floor4:rune`, `floor4:warning`, `floor4:spawn`, `floor4:damage`, and `floor4:clear`. Skip generic enemy AI for `RUNE_GUARDIAN`.
- `floorFourComplete(room)`: use as the server-owned exit gate.
- `publicFloorFour(room)`: include in room snapshots; renders runes, guardian and warning without exposing private engine state.
- Translate each `floor4:damage` to room-scoped `combat:damage`, then invoke the central once-only down/threat policy. Do not apply its damage twice.
- Render rune order, guardian health, and the warning circle with pattern and sound. The client has no authority to select rune completions.

Focused unit tests check ordered progression, guardian requirement, warning timing and replay, disconnect safety, phase stop, and invalid geometry. They do not establish browser playability.
