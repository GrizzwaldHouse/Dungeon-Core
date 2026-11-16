# Server-owned space and portal contract

**Reviewed:** 2026-11-16 against `qa/final-sprint-integration` at `18d983ec`.
**Authority:** `server/server.js` and `server/dungeon-run.js` define the current behavior. This document records the implemented contract; it does not certify a human-playable route or public deployment.

## Room and run lifecycle

`room:create` starts a `LOBBY` room. `room:join` accepts new players only in the lobby. `room:start` moves it to `RUNNING`, creates a private run, and starts floor one in `entry`. A disconnected player's rejoin uses `room:rejoin` and a rotated reconnect capability. A party wipe moves the room to `FAILED`. Completing floor five moves it to `COMPLETED`; `run:continue` starts a stronger cycle in `entry`. Expired or empty rooms move to `CLOSED` and are removed by server cleanup. The room phase and the floor stage are separate fields.

The server stores the current world, collision obstacles, discovery nodes, player positions, floor stage, `currentSpaceId`, and `spaceRevision` in one room. Players in that room share a space. A transition checks every non-removed member's landing before changing any room geometry or position. Disconnected grace members travel with the party. A failed landing leaves the prior space in place.

## Current directed route

| From stage and space | Portal | To stage and space | Gate |
| --- | --- | --- | --- |
| Floor one, `entry` | `shift-gate` | Floor one, `amber-vault` or `violet-vault` | In range; early entry can apply one bounded rush effect. |
| Floor one, selected vault | `floor-exit` | Rest for floor two, `amber-vault` | Sentinel objective and trap cleared. |
| Rest for floor two | `rest-exit` | Floor two, `violet-vault` | In range. |
| Floor two | `floor-exit` | Rest for floor three, `amber-vault` | Encounter cleared. |
| Rest for floor three | `rest-exit` | Floor three, `amber-vault` | In range. |
| Floor three | `floor-exit` | Rest for floor four, `amber-vault` | Rune trial ready for rest. |
| Rest for floor four | `rest-exit` | Deepwood, `violet-vault` | In range. |
| Deepwood | `floor-exit` | Floor four, `amber-vault` | Deepwood encounter cleared. |
| Floor four | `floor-exit` | Rest for floor five, `amber-vault` | Trial cleared. |
| Rest for floor five | `rest-exit` | Floor five, `violet-vault` | In range. |
| Floor five | `floor-exit` | Completed results | Final encounter cleared. |
| Completed results | `run:continue` | Next cycle, floor one `entry` | Completed room, host action, and current `completedCycle`. |

The first vault is chosen from a server-private random run seed by hashing the seed with `:shift-gate`. The client cannot request a destination. The other destinations above are currently fixed by the server stage logic. This is the implemented route, not a general-purpose graph registry.

## Transport contract

- Client intent: `portal:enter` with `{ actionId, portalId }`. Both IDs are validated. The server uses the socket-bound player and its authoritative position. Client-supplied position, destination, damage, or rewards do not select a route.
- Resolution: the server queues a valid intent for its next room tick. It rejects a stale session, downed initiator, wrong portal, distant initiator, incomplete objective, unsafe party landing, or unavailable floor. Repeating an `actionId` returns the recorded acknowledgement or joins the pending acknowledgement; it does not perform a second transition.
- First vault event: `portal:resolved` includes protocol version, room code, tick, revision, action and portal IDs, from/to space IDs, and rush penalty tier. The acknowledgement also includes `serverTick`. Later stage changes emit `floor:transition` with from/to stage, floor index, cycle, tick, and revision. Floor awards emit `floor:completed` separately.
- Snapshot: `room:snapshot` includes protocol version, room phase, tick, revision, floor index/stage/cycle, current `space.id`, `space.kind`, `space.revision`, one current portal with state, position and interaction radius, and current trap state. The private seed and unreached vault destination are absent. The client should render a new space from an authoritative `room:snapshot`, using the revision to discard stale presentation state.
- Cycle continuation: `run:continue` sends `{ completedCycle }` from the visible results. Only the current host can continue a completed room; stale results or an unsafe landing are rejected.

## Evidence boundary

The local `tests/server.test.js` portal test checks malformed requests, private destination before entry, one resolved event, pending and completed replay, room isolation, and the destination snapshot. `tests/five-floor-integration.test.js` exercises the stage route with fake sockets. Neither substitutes for two independent browsers, normal-health human play, or physical-device and public-host acceptance.
