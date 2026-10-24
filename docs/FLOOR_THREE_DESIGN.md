# Floor three: The Forager's Hollow

**Status:** isolated server model and tests. It is not a playable floor until the lead integrates the state into room ticks, enemy simulation, actions, geometry, inventory, and client presentation.

## Story and pace

The Hollow is a brief hunting and gathering floor after the two mini bosses. Two finite mob packs guard a common supply cache. A second cache is hidden behind an exploration node. Clearing both packs unlocks a recovery bubble. A living party member must enter the bubble before the floor-four exit can become available. The bubble is a true noncombat state: the central server must stop enemy attacks and move all active party members to collision-safe landing positions. A disconnected host must not be required to enter it.

## Server model contract

`server/floor-three.js` exports:

| Function | Trusted inputs | Output |
| --- | --- | --- |
| `createFloorThreeState({tick,playerIds})` | Room tick, up to six human IDs | Serializable private floor state |
| `stepFloorThree(state,{tick,activePlayerIds,defeatedMobIds,discoveredNodeIds,threatStacks})` | Server tick, active human IDs, server-confirmed deaths and discoveries, bounded threat stacks | `{state,events}`; spawn, defeat, and recovery descriptors |
| `claimFloorThreeResource(state,{playerId,nodeId,actionId})` | Socket-bound player and validated nearby cache | `{state,result,events}` with a personal reward descriptor |
| `enterFloorThreeRest(state,{playerId,actionId,tick})` | Living socket-bound nearby player, after both waves | Replay-safe recovery entry |
| `floorThreeComplete(state)` | Private state | True after recovery entry |
| `publicFloorThree(state,playerId)` | Private state and optional recipient ID | Snapshot view without action receipts or other players' claim identities |

The module returns new state rather than mutating the room. The lead commits returned state only after the corresponding inventory and spatial checks succeed. Mob descriptors use stable IDs `f3-w<1|2>-m<slot>` and are spawned by the authoritative enemy engine at validated positions. Each spawn descriptor includes health and damage multipliers of `10000 + 500 × threatStacks` basis points; later downs do not retroactively strengthen living mobs. A second call for the same tick emits no new spawns. There are exactly five mobs across two packs. The second pack starts no sooner than 45 ticks after the first is cleared; it waits for at least one active human. Disconnected humans retain their claim rights, while newly joined humans can receive one right if total eligibility stays within six.

The shared `supply-cache` gives each eligible player one healing charge. The optional `forgotten-cache` gives each one ten riches after a server-confirmed discovery. Cache claims are per player and per node, with stable receipts for exact action replays. The inventory service enforces capacity before accepting a returned claim. Thus one player's pickup never removes another player's right, and retries cannot farm loot. Enemy defeat XP and floor XP remain the central progression service's responsibility; this model never issues either.

The shared broadcast snapshot must call `publicFloorThree(state)` without a player ID. To show `claimedByYou`, send a separate socket-specific view from `publicFloorThree(state,playerId)`; do not broadcast one recipient's personal view to every room member.

## Integration safety and acceptance

- Validate socket identity, room and floor phase, living state, cache or bubble interaction range, and line of sight before invoking an action. Ignore client-supplied positions, deaths, discoveries, inventory, and rewards.
- Report only deaths for mobs actually spawned in this room. Do not create XP from `MOB_DEFEATED` descriptors without checking the central enemy record and its once-only defeat receipt.
- Commit a claim's state and inventory update atomically; a rejected full inventory leaves the cache right intact. Scope action IDs to player and floor instance in the central server.
- Keep recovery free of enemy simulation. Moving a player into it must use the same collision-safe party landing rule as existing portals.
- Test 2/4/6 players, two simultaneous rooms, duplicate and reordered actions, disconnect and reconnect, a late join if supported by room lifecycle, and party wipe. Do not label this floor playable until two real clients complete its route.
