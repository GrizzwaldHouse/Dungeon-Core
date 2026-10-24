# Floor five: Shifting Core Warden

**Status:** Encounter module and focused unit tests exist. Central room routing, victory/reset rewards, client presentation, and multiplayer browser QA remain integration work.

The final floor places one Shifting Core Warden using validated server geometry. It starts with 300 HP for two humans and adds 40 HP for each further human. Bounded down-threat adds 5% per stack to **new** enemy health and attack power, up to five stacks. At 70% and 35% health, the boss changes phase, attempts a safe reposition, and summons at most two Shardlings. The live-minion cap is four. Summon gates are once-only even when a strike crosses both thresholds. A lethal strike skips obsolete gates.

The Warden locks a target position and publishes a `CORE_BLAST` circle for 45 ticks (1.5 seconds). A living, connected player inside the circle at resolution takes server-calculated damage once. Phase three increases the circle radius and attack frequency. Shardlings chase and melee on the same fixed tick. Defeating the Warden before its minions changes the stage to cleanup; the exit opens only when the boss and every living Shardling are defeated.

## Server integration contract

- `startFloorFive(room,tick)`: call once after a safe transition, after clearing prior enemies. Returns `floor5:spawn`; throws before mutation if no boss position is safe.
- `stepFloorFive(room,tick)`: call once per 30 Hz room tick after movement; emits `floor5:phase`, `floor5:shift`, `floor5:spawn`, `floor5:warning`, `floor5:damage`, and `floor5:clear`. Skip generic AI for boss and minions.
- `floorFiveComplete(room)`: use as the server-owned victory gate.
- `publicFloorFive(room)`: expose phase, boss ID, warning, bounded summon count, and completion tick in snapshots.
- Translate `floor5:damage` to `combat:damage` and central down/threat policy without reapplying HP loss. Use `warning.position`, `warning.radius`, and `warning.endsAtTick` to render the area and cue sound.
- Core victory must be committed once, then reset the party to a stronger Floor 1 while retaining levels and half banked riches. This reset belongs to the central progression layer, not this encounter module.

Focused unit tests cover warning timing, phase thresholds, bounded minions, disconnect safety, no summon after lethal damage, replay, and blocked spawns. They do not establish browser playability.
