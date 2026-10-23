# Cooperative Dungeon Core Crawler — Technical Architecture

**Status:** Proposed baseline  
**Runtime:** TypeScript, Three.js, Node.js, Socket.IO  
**Players:** 2–6 per run  
**Authority:** Server authoritative for all durable gameplay state

## 1. Design goals and invariants

1. The server owns room membership, movement acceptance, collisions, combat results, portals, secrets, traps, enemy spawning, debuffs, progression, and rewards. A client may predict visuals and movement, but it cannot declare outcomes.
2. A Three.js scene is a projection of serializable simulation state. Meshes, materials, physics handles, and renderer objects never appear in network payloads or saved state.
3. All player-visible mechanics are deterministic given the run seed and accepted event order. Use a seeded server PRNG; persist its state or derive per-floor streams.
4. Room codes are four characters and therefore short-lived join capabilities, not identity or strong authentication. Keep them uppercase, unambiguous (for example, omit `0/O` and `1/I`), generated with a cryptographic RNG, rate-limited, and rotated/expired. Never expose them in public room listings.
5. A run has 2–6 active players. The host is a UI role only; disconnect handling and game authority remain server-owned.
6. Every client command is validated against the current phase, player membership, sequence number, bounds, cooldowns, and server-observed state.

## 2. Service and module boundaries

```text
browser/
  input/       action mapping, local prediction, reconciliation
  net/         Socket.IO client, snapshots, event stream, reconnect
  simulation/  presentation-side interpolation only; no authoritative rules
  render/      Three.js scene, cameras, meshes, effects, disposal
  ui/          DOM HUD, lobby, code entry, accessibility
server/
  transport/   Socket.IO handlers, schema validation, rate limits
  rooms/       code registry, lobby lifecycle, membership, disconnect grace
  simulation/  fixed tick, movement, collision, AI, combat, timers
  dungeon/     graph state machine, portal routing, room instances, secrets
  progression/ group floor advancement, contribution ledger, rewards
  persistence/ run checkpoints and idempotent completion records
shared/
  protocol/    versioned DTO schemas, event names, validation limits
  domain/      IDs, enums, constants, pure reducers and formulas
```

Use a fixed simulation tick (recommended 20 Hz initially) and publish state at a separately tuned cadence (for example 10–20 Hz). Socket.IO transports messages; it does not make game state authoritative, ordered across reconnects, or durable by itself. Use server timestamps and monotonically increasing room revision/tick values. Clients interpolate between accepted snapshots and discard stale revisions.

## 3. Room lifecycle and four-character codes

Room phases: `LOBBY -> STARTING -> RUNNING -> FLOOR_TRANSITION -> RUNNING -> COMPLETED`, with `CLOSED` reachable from any nonterminal phase. A run also has a `PAUSED`/`RECOVERING` operational state only if the product explicitly supports it.

1. `createRoom`: allocate an internal UUID, generate a cryptographically random code from a human-readable alphabet, reserve it atomically in a TTL registry, and create a lobby with `minPlayers=2`, `maxPlayers=6`. Retry collisions. Never use the code as the persistent room ID.
2. `joinRoom(code, displayName)`: normalize and validate input; apply per-IP/device and per-code attempt limits; look up an unexpired lobby; reject if full or not joinable. Assign a server-generated `playerId` and a separate reconnect secret. The reconnect secret is not the room code and should be stored hashed server-side.
3. Lobby readiness: host may request start, but server checks at least 2 connected players, valid loadout, and lobby phase. Start is a server transition, not a client-side scene change.
4. Start: create `runId`, seed, floor 1, initial graph and room instance; lock normal joins. A reconnecting member may reclaim their slot during a bounded grace period using the reconnect secret.
5. Disconnect: mark player `disconnected`, start a grace timer, and retain their slot. On timeout, server policy may convert to spectator, remove them at a safe boundary, or end a run below minimum players. Do not instantly free the slot while their old socket can still send commands.
6. Completion: freeze gameplay mutations, calculate rewards exactly once using an idempotency key, persist results, emit final summary, then retain room/code for a short results window before deletion. Revoke code and reconnect tokens on close.

Four-character codes from a 32-symbol alphabet carry about 20 bits of entropy, which is insufficient as durable authentication. They are acceptable for casual ephemeral matchmaking only with short TTL, throttling, generic failure responses, and optional lobby confirmation. For higher-stakes/private play use an invite secret or account/session identity in addition to the code.

Suggested server limits: create/join throttles by source and code; maximum failed code checks per window; code expiry while in lobby (e.g. 10–20 minutes), rotation only while lobby is open; no code reuse until a short tombstone window expires. Keep exact thresholds configurable and instrument collision/guess rates.

## 4. Dungeon graph and portal state machine

Represent topology as a server-owned graph, not a client-supplied matrix. A matrix may be derived for algorithms, but graph edges should carry semantics and state. Each node is a logical space; each edge is a doorway/portal with a stable ID. Use hidden node IDs that clients cannot enumerate before discovery.

Portal transition states: `SEALED -> AVAILABLE -> TELEGRAPHED -> COMMITTING -> RESOLVED`; invalid or stale transitions return an explicit rejection. On accepted entry, server validates player position against the authoritative portal interaction volume, checks portal state and group rules, chooses destination from the server-owned routing table, allocates/reuses a room instance, and atomically updates player location plus portal/run revisions. A client never chooses `destinationSpaceId`.

Routing input can include floor seed, current graph node, portal ID, solved objectives, team exploration score, and prior route history. The selection function should be seeded and auditable. Route classes may include `combat`, `puzzle`, `trap`, `hidden`, `rest`, and `boss`; define bounded weights and prevent impossible softlocks. For group play, a portal should transition the whole party together, or explicitly support a short split-party phase with a maximum duration and reunification rules.

## 5. Exploration, secrets, and anti-rush policy

Clients can send movement/input intent, never a claim that a secret was found. Server movement/collision simulation checks player-to-secret trigger volumes using authoritative coordinates. For static geometry, use spatial hashing or a BVH-backed broad phase and a short-radius sphere/box test; avoid a full player-by-all-secrets scan each tick. Secret state is per-run and is revealed only to the eligible party according to the chosen cooperative rule.

Track exploration as explicit objectives and measurements: required rooms visited, clues inspected, puzzle interactions, optional caches, and a capped exploration ratio. Define `explorationGate` per portal with thresholds and readable warning signals. Avoid punishing a player for not finding optional content: only apply a rush penalty when required clues/objectives are skipped and the portal is deliberately activated. Apply at most one penalty tier per transition, with caps and duration, and communicate it in-world. Exponential enemy growth is easy to make unfair and unstable; prefer bounded tiers or a capped curve, for example `base * min(maxMultiplier, 1 + alpha * missedRequiredCount^2)`. Keep all balance parameters data-driven.

Penalty application is a server-side transaction recorded with cause, tier, expiry, and source portal. It must not stack on retries of the same transition. Suggested `rush` effect fields: `attackPowerMultiplier`, `incomingDamageMultiplier`, `healingReduction`, `durationTicks`, and `appliedAtTick`. Enemy scaling should be capped per encounter and floor.

## 6. Server tick and event processing

For each fixed tick, execute a stable order:

1. Drain validated input commands in receipt order, deduplicated by `(playerId, inputSeq)`; reject future/old sequence windows.
2. Apply movement intent with speed, acceleration, and state constraints; resolve authoritative collision and bounds.
3. Evaluate proximity triggers, room/portal volumes, secret discovery, trap contacts, and interaction requests.
4. Advance AI and combat intents; resolve hits, damage, status, death, and drops using server-owned cooldowns and RNG.
5. Update objective, exploration, contribution, and run timers; check floor completion and failure conditions.
6. Commit resulting state changes and append domain events; increment `tick` and `revision` once for the committed batch.
7. Emit deltas/snapshots to authorized room members; send hidden information only after discovery and according to visibility rules.

Use a monotonic clock for simulation time. Clamp accumulated wall-clock drift after pauses; never run an unbounded catch-up loop after a stalled process. For this player count, one Node.js process per room shard is a reasonable first deployment; isolate hot rooms and persistence writes so slow I/O does not block the tick. Add metrics for tick duration, queue depth, snapshot bytes, rejected commands, disconnects, and room occupancy.

## 7. Progression and contribution rewards

Floor advancement is group-tied: when all required floor objectives are satisfied, server transitions the run once and grants the same baseline group XP to every eligible participant (including a disconnected member within the configured grace policy). Do not level individual players mid-floor if the design requires collective level-up.

Maintain a per-player contribution ledger with capped/normalized metrics, e.g. damage dealt (excluding overkill), portal/puzzle solutions, traps disarmed, revives/support actions, and exploration clues. Exclude friendly-fire farming and duplicate objective credit. At floor completion calculate a bounded bonus pool and distribute it by normalized weighted contribution. Use integer fixed-point or integer XP units to avoid floating-point drift; distribute rounding remainder deterministically. A contributor bonus should supplement equal baseline XP, not subtract from teammates. Persist a reward idempotency key `(runId, floorIndex, playerId)`.

## 8. Socket.IO protocol

All client messages have `{ protocolVersion, requestId, inputSeq, sentAtClientMs, payload }`; `sentAtClientMs` is diagnostic only. The server derives identity from the socket session, validates schemas and size limits, and responds with `{ requestId, ok, errorCode?, serverTick, revision? }`. Do not trust a client-provided player or room ID as proof of membership.

Client commands (illustrative): `room.create`, `room.join`, `room.leave`, `player.input`, `player.interact`, `portal.enter`, `ready.set`, `run.start`, `snapshot.request`. Commands express intent. Server events include `room.joined`, `room.roster`, `run.started`, `state.snapshot`, `state.delta`, `portal.resolved`, `secret.discovered`, `effect.applied`, `floor.completed`, `run.completed`, and `command.rejected`.

Use acknowledgements for command acceptance/rejection and server events for resulting state. Limit payload bytes, rate-limit high-frequency events, and coalesce movement input. Never broadcast hidden graph nodes, undiscovered secrets, server RNG state, reconnect secrets, or other players' private tokens.

## 9. Core JSON state payload

The following is a server-maintained canonical model. Production implementations should validate it with a runtime schema (for example Zod, TypeBox, or JSON Schema) and define optional fields, numeric bounds, and protocol migration explicitly. Do not serialize `Infinity`, `NaN`, class instances, or Three.js objects. Positions use meters in a right-handed world coordinate convention; rotations are radians.

```json
{
  "schemaVersion": 1,
  "protocolVersion": 1,
  "room": {
    "roomId": "room_01J9QXK3M8...",
    "code": "K7PM",
    "phase": "RUNNING",
    "createdAtUnixMs": 1792200000000,
    "expiresAtUnixMs": null,
    "maxPlayers": 6,
    "minPlayers": 2,
    "hostPlayerId": "p_01J9Q...",
    "members": ["p_01J9Q...", "p_01J9R..."],
    "revision": 442,
    "tick": 13820
  },
  "run": {
    "runId": "run_01J9Q...",
    "phase": "EXPLORING",
    "seed": "opaque-seed-id",
    "floorIndex": 2,
    "startedAtTick": 12000,
    "elapsedTicks": 1820,
    "partySpaceId": "space_f2_hub",
    "graphRevision": 18,
    "exploration": {
      "requiredVisited": 3,
      "requiredTotal": 4,
      "optionalFound": 2,
      "optionalTotalKnown": 5,
      "ratioBasisPoints": 7500,
      "objectivesComplete": ["clue_west_01", "puzzle_02"]
    },
    "rngState": "server-private-do-not-broadcast"
  },
  "players": {
    "p_01J9Q...": {
      "playerId": "p_01J9Q...",
      "displayName": "Moss",
      "connection": "CONNECTED",
      "lastInputSeq": 982,
      "spaceId": "space_f2_hub",
      "transform": {
        "position": {"x": 1.25, "y": 0.0, "z": -3.4},
        "rotation": {"x": 0.0, "y": 1.57, "z": 0.0},
        "velocity": {"x": 0.0, "y": 0.0, "z": 0.0}
      },
      "movementMode": "WALKING",
      "vitals": {"hp": 86, "maxHp": 100, "shield": 0},
      "progression": {"level": 4, "xp": 320, "xpToNextLevel": 500, "pendingGroupLevel": false},
      "statuses": [
        {"statusId": "eff_01J9...", "type": "RUSH_CURSE", "stacks": 1, "expiresAtTick": 14420, "sourceId": "portal_west"}
      ],
      "contribution": {
        "damageDealt": 1240,
        "portalsSolved": 1,
        "trapsDisarmed": 0,
        "revives": 1,
        "cluesFound": 2,
        "supportScore": 75
      },
      "visibility": {"discoveredSecretIds": ["secret_cache_02"]}
    }
  },
  "spaces": {
    "space_f2_hub": {
      "spaceId": "space_f2_hub",
      "floorIndex": 2,
      "kind": "HUB",
      "instanceId": "inst_01J9...",
      "status": "ACTIVE",
      "bounds": {"min": {"x": -20, "y": -2, "z": -20}, "max": {"x": 20, "y": 8, "z": 20}},
      "visitedBy": ["p_01J9Q...", "p_01J9R..."],
      "objectIds": ["door_north", "portal_west", "secret_cache_02", "crate_11"],
      "exitPortalIds": ["portal_west", "portal_north"],
      "visibility": "PARTY_KNOWN"
    },
    "space_f2_hidden_03": {
      "spaceId": "space_f2_hidden_03",
      "floorIndex": 2,
      "kind": "HIDDEN_PUZZLE",
      "instanceId": "inst_01J9...",
      "status": "LOCKED",
      "bounds": {"min": {"x": 0, "y": 0, "z": 0}, "max": {"x": 10, "y": 5, "z": 10}},
      "visitedBy": [],
      "objectIds": [],
      "exitPortalIds": [],
      "visibility": "SERVER_HIDDEN"
    }
  },
  "edges": {
    "portal_west": {
      "portalId": "portal_west",
      "fromSpaceId": "space_f2_hub",
      "state": "AVAILABLE",
      "interactionVolumeId": "col_portal_west",
      "requiredObjectiveIds": ["clue_west_01"],
      "explorationGate": {"requiredRatioBasisPoints": 5000, "currentRatioBasisPoints": 7500, "penaltyTier": 0},
      "destinationPolicyId": "route_f2_west",
      "destinationSpaceId": null,
      "revision": 7
    }
  },
  "objects": {
    "crate_11": {
      "objectId": "crate_11",
      "spaceId": "space_f2_hub",
      "archetypeId": "prop.crate.wood",
      "transform": {"position": {"x": 2, "y": 0, "z": -1}, "rotation": {"x": 0, "y": 0.2, "z": 0}},
      "collision": {
        "colliderId": "col_crate_11",
        "shape": "BOX",
        "center": {"x": 2, "y": 0.5, "z": -1},
        "halfExtents": {"x": 0.5, "y": 0.5, "z": 0.5},
        "layer": "WORLD_STATIC",
        "mask": ["PLAYER", "PROJECTILE"],
        "enabled": true,
        "isTrigger": false
      },
      "state": {"health": 20, "destroyed": false, "interactable": true},
      "revision": 3
    }
  },
  "enemies": {},
  "objectives": {},
  "serverTimeUnixMs": 1792200000000
}
```

### State versus transport payload

The canonical model above includes private server fields. Do not send it verbatim. Build a per-client projection that filters hidden spaces, secret coordinates, RNG state, reconnect tokens, and internal routing policy. For a normal client, send a snapshot envelope such as:

```json
{
  "protocolVersion": 1,
  "roomId": "room_01J9QXK3M8...",
  "tick": 13820,
  "revision": 442,
  "baseRevision": null,
  "kind": "SNAPSHOT",
  "state": {"run": {}, "players": {}, "spaces": {}, "edges": {}, "objects": {}, "enemies": {}, "objectives": {}}
}
```

After initial synchronization, send revision-based deltas with entity upserts and removals. A reconnect may request a full snapshot when its revision is outside retained delta history. Include `visibilityScope` only if it has meaning to the client; never use it as client authorization.

## 10. Collision and coordinates

Replicate collision proxies, not rendered mesh geometry. Static collision shapes are authored/loaded from trusted server-side level data. Dynamic collision state includes collider ID, transform, shape parameters, collision layer/mask, enabled/trigger flags, and relevant gameplay state. Clients may use simplified prediction proxies, but the server resolves authoritative contact. For production-grade 3D movement and contact resolution, evaluate a deterministic server-side physics library (e.g. Rapier) and keep its handles outside DTOs; Three.js itself is a renderer, not a physics authority.

## 11. Recovery, persistence, and observability

Checkpoint at safe boundaries (floor transition, puzzle completion, periodic interval). Persist schema version, run seed/PRNG checkpoint, graph state, player progression, objective state, contribution ledger, and last committed event/revision. Treat Socket.IO sessions as ephemeral. On process recovery, either restore a consistent checkpoint plus event log or close the run with a recoverable result; never resume from a partially applied transition.

Operational dashboards should track room counts by phase, active players, tick p50/p95/p99, command rejection codes, code-guess throttles, reconnect success, snapshot/delta size, room memory, and floor completion rate. Redact room codes and reconnect secrets from routine logs.

## 12. Acceptance criteria for the first playable vertical slice

- Two clients can create/join a four-character-code lobby, start, disconnect, and reconnect within the grace period.
- A client cannot move through walls, claim a secret, choose a portal destination, or award itself XP by sending forged commands.
- Server and clients agree on current room, portal resolution, object collision state, and floor completion after snapshot and delta recovery.
- Hidden geometry is revealed only after server-verified proximity/interaction; undiscovered hidden nodes and coordinates are absent from that client's payload.
- A premature portal transition applies one capped, explainable penalty without duplicate stacking on retry.
- Floor completion grants shared base XP and deterministic, bounded contributor bonuses exactly once.
- Tick processing remains within its budget at six players plus the expected encounter entity count; overload behavior is measured and bounded.

## Decisions to lock before implementation

1. Whether portals move the full party atomically or permit temporary party splits.
2. Exploration gates: required versus optional content, warning UX, penalty tiers, caps, and persistence duration.
3. Disconnect grace duration and the policy when a run falls below two active players.
4. Target tick/send rates, expected enemy count, and whether physics uses Rapier server-side or a custom constrained kinematic solver.
5. XP formula, contribution weights/caps, and the policy for disconnected players at floor completion.
