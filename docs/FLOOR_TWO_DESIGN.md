# Floor two: The Fractured Gate

Floor two is a sequential encounter after the Sentinel introduction and recovery space. The Threshold Keeper guards the first chamber. When defeated, the Mirror Hexer appears. The Hexer summons Shardlings as its health falls. Defeating the Hexer and all surviving Shardlings opens the route to floor three. The central progression system owns that route and its reward; this module owns only the encounter.

## Runtime contract

`server/floor-two.js` exports `startFloorTwo(room, tick)`, `stepFloorTwo(room, tick)`, `publicFloorTwo(room)`, and `floorTwoComplete(room)`. The integrator calls `startFloorTwo` once after changing the party to floor two, then `stepFloorTwo` once per authoritative 30 Hz tick while the room is `RUNNING`. The module stores serializable encounter state at `room.floorTwo` and compatible enemy records in `room.enemies`. The central server must skip its generic enemy AI for floor-two enemies, expose the returned events and public state, and continue to validate player attacks before changing enemy health. No client action sets phases, damage, spawns, or completion.

Returned event types are `floor2:spawn`, `floor2:warning`, `floor2:charge`, `floor2:damage`, `floor2:stage`, and `floor2:clear`. The integrator translates these descriptors into its existing room-scoped Socket.IO events. Damage descriptors include `playerId`, `sourceId`, `amount`, and `currentHealth`. Every boss and minion ID starts with `floor2-`.

## Rules and recovery

- Keeper: server targets the nearest living connected player, warns for 45 ticks, then charges at most eight meters along a collision-checked path. Players within 1.2 meters of the actual path take one hit.
- Hexer: server warns for 45 ticks at a fixed target position, then damages living connected players within 2.5 meters. It summons two Shardlings once at 70% health and two once at 35% health, subject to four live minions maximum.
- Shardlings: chase a living connected player with collision checks and use a 45-tick melee cooldown. A defeated Hexer leaves surviving minions as cleanup objectives.
- A player down increases future enemy health and damage by 5%, up to five stacks. Existing spawned enemies retain their stats. A disconnected player is never selected or damaged. If everyone disconnects, warnings can expire without damage and the encounter remains recoverable. A failed room stops encounter ticks.
- Repeating the same tick or start call produces no duplicate effect. A lethal Hexer hit skips obsolete summon waves. Spawn search rejects obstacles, boundaries, living players, and living enemies; if the first boss has no safe position, start fails before mutation.

## Verification status

`node --test tests/floor-two.test.js` passed eight focused unit cases on 2026-10-24. Integration with the central server and two-client gameplay remains to be verified by the lead; this document does not claim floor two is playable yet.
