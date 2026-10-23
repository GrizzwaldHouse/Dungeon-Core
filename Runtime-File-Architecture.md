# Reusable Multiplayer Canvas Runtime — File Architecture

**Status:** Implementation blueprint derived from `Technical-Architecture.md`  
**Target game:** Cooperative Dungeon Core Crawler, 2–6 players  
**Primary objective:** Keep the Three.js render loop independent from Socket.IO, and keep both independent from authoritative game rules so the browser runtime can be ported to another game or transport.

## 1. Boundary rules

- `@runtime/core` and `@runtime/protocol` have no imports from Three.js, Socket.IO, DOM, or a physics engine.
- `@runtime/render-three` consumes read-only presentation frames and emits typed local input intents. It has no socket reference and cannot mutate authoritative state.
- `@runtime/net-socketio` converts protocol messages into runtime events. It has no Three.js or renderer imports.
- The game server owns accepted movement, collisions, portal routing, secret discovery, combat, status effects, room lifecycle, and rewards.
- Socket loss changes a connection/session state; it never destroys the simulation room or causes the active room tick to wait for a socket callback.
- All cross-boundary data is plain, versioned DTO data. Never pass renderer objects, physics handles, sockets, or mutable server aggregates across a boundary.
- A single server room actor processes each room’s commands and tick sequentially. Different rooms may execute concurrently. Asynchronous storage/network work returns as queued commands and cannot mutate a room aggregate outside its actor.

## 2. Directory tree

```text
dungeon-core-crawler/
  package.json
  tsconfig.base.json
  apps/
    web/
      index.html
      vite.config.ts
      src/
        main.ts
        app/createGameClient.ts
        app/ClientLifecycle.ts
        config/clientConfig.ts
        input/BrowserInputSource.ts
        input/InputBindings.ts
        ui/DomHud.ts
        styles/game.css
    server/
      src/
        main.ts
        config/serverConfig.ts
        transport/createHttpServer.ts
        transport/SocketGateway.ts
        transport/SocketSessionRegistry.ts
        transport/RateLimiter.ts
        rooms/RoomDirectory.ts
        rooms/RoomActor.ts
        rooms/RoomManager.ts
        rooms/RoomLifecycle.ts
        rooms/DisconnectPolicy.ts
        simulation/FixedTickScheduler.ts
        simulation/RoomSimulation.ts
        simulation/MovementSystem.ts
        simulation/CollisionSystem.ts
        simulation/CombatSystem.ts
        dungeon/DungeonGraph.ts
        dungeon/PortalSystem.ts
        dungeon/SecretDiscoverySystem.ts
        progression/ContributionLedger.ts
        progression/FloorRewards.ts
        persistence/RunRepository.ts
        persistence/CheckpointService.ts
    packages/
      protocol/
        src/index.ts
        src/commands.ts
        src/events.ts
        src/schemas.ts
        src/limits.ts
      runtime-core/
        src/index.ts
        src/ports/NetworkPort.ts
        src/ports/RenderPort.ts
        src/state/ClientRuntimeStore.ts
        src/state/PresentationFrame.ts
        src/state/RevisionGate.ts
        src/session/SessionController.ts
        src/session/ReconnectController.ts
        src/session/SnapshotReconciler.ts
        src/prediction/LocalMovementPredictor.ts
        src/prediction/PredictionBuffer.ts
        src/time/ClientClock.ts
      render-three/
        src/index.ts
        src/ThreeCanvasHost.ts
        src/RenderLoop.ts
        src/SceneFactory.ts
        src/CameraRig.ts
        src/WorldView.ts
        src/EntityViewRegistry.ts
        src/CollisionDebugView.ts
        src/AssetCatalog.ts
        src/RenderFrameAdapter.ts
      net-socketio/
        src/index.ts
        src/SocketIoNetworkAdapter.ts
        src/SocketEventCodec.ts
        src/SocketConnectionState.ts
      game-domain/
        src/index.ts
        src/ids.ts
        src/enums.ts
        src/room/RoomState.ts
        src/run/RunState.ts
        src/player/PlayerState.ts
        src/world/SpaceState.ts
        src/world/CollisionState.ts
  docs/
    architecture/runtime-boundaries.md
    architecture/protocol-contract.md
```

`packages/runtime-core` is the portable canvas wrapper’s center. A future port can replace `render-three` with a Canvas2D or another WebGL adapter, and replace `net-socketio` with WebSocket/WebTransport, without changing game-domain DTOs or `runtime-core` orchestration.

## 3. Shared contracts

### Input and output conventions

- `Tick` is a monotonically increasing integer owned by the server. `Revision` is a monotonically increasing committed room-state version.
- `ClientCommand` always carries `protocolVersion`, `requestId`, `inputSeq`, and typed `payload`. Server identity comes from the authenticated socket session/reconnect claim, never the payload.
- `ServerEvent` always carries `protocolVersion`, `roomId`, `serverTick`, and `revision` (or an explicit acknowledgement for a rejected/uncommitted request).
- `PresentationFrame` contains only currently visible state for this client: interpolated player transforms, visible spaces/objects, HUD facts, and event cues. It does not contain hidden room topology, secret coordinates, PRNG state, or reconnect credentials.
- Inputs flow inward as intent; state and cues flow outward as immutable values. Ports are interfaces, and adapters implement them.

Example portable ports:

```ts
export interface NetworkPort {
  readonly status: Readonly<ConnectionStatus>;
  connect(options: ConnectOptions): Promise<JoinResult>;
  send(command: ClientCommand): Promise<CommandAck>;
  subscribe(listener: (event: ServerEvent) => void): () => void;
  disconnect(reason?: 'user' | 'shutdown'): void;
}

export interface RenderPort {
  mount(canvas: HTMLCanvasElement, options: RenderOptions): void;
  render(frame: PresentationFrame, alpha: number): void;
  resize(widthCss: number, heightCss: number, pixelRatio: number): void;
  dispose(): void;
}
```

## 4. File-by-file runtime contracts

### Web application and input

| File | Runtime responsibility | Exact inputs → outputs | Disconnect behavior |
|---|---|---|---|
| `apps/web/index.html` | Minimal document, canvas mount point, accessible HUD root. | Browser loads document → DOM roots `#game-canvas` and `#game-ui`. | No connection logic. DOM remains mounted while the network reconnects. |
| `apps/web/vite.config.ts` | Local web build/dev-server configuration and package aliases. | Vite config → dev server/build output. | No runtime socket lifecycle. |
| `apps/web/src/main.ts` | Composition root: read config, construct runtime, render adapter, network adapter, input/UI, then start. | `Window`, `ClientConfig` → initialized `ClientLifecycle`; errors → fatal startup view. | Registers visibility/unload signals; asks lifecycle to suspend local rendering or close on explicit shutdown. Never owns room state. |
| `apps/web/src/app/createGameClient.ts` | Dependency injection factory; only file allowed to know concrete adapters. | `{canvas, uiRoot, config}` → `{runtime, lifecycle, dispose}`. | Wires `ReconnectController` to network events; disconnect does not recreate render loop or room objects. |
| `apps/web/src/app/ClientLifecycle.ts` | Start/stop orchestration for client-side resources. | `start()`, `pauseRendering()`, `resumeRendering()`, `dispose()` → lifecycle state/events. | On disconnect, keep UI and render adapter alive with stale/connecting indicator; dispose only on explicit leave/page teardown. |
| `apps/web/src/config/clientConfig.ts` | Parse public, non-secret client settings. | `ImportMetaEnv` → validated `ClientConfig {serverUrl, protocolVersion, render, reconnect}`. | No credentials or room secret persisted here. |
| `apps/web/src/input/BrowserInputSource.ts` | Convert keyboard/gamepad/touch into action intents. | DOM/gamepad events + current input map → `InputIntent {moveX, moveY, buttons, clientSeq}`. | While disconnected, buffer only the latest movement intent (or clear movement); do not queue portal/interact actions for later replay. |
| `apps/web/src/input/InputBindings.ts` | Map physical controls to stable game actions. | User binding config + device events → normalized `ActionState`. | Independent of socket state; releases all held actions on blur/disconnect to prevent stuck movement. |
| `apps/web/src/ui/DomHud.ts` | Accessible HUD, lobby/code entry, reconnect state, rejection feedback. | `PresentationFrame`, `ConnectionStatus`, `UiAction` → DOM updates and typed `UiIntent`s. | Shows reconnecting/grace status and disables irreversible actions until resynchronized; never fabricates success. |
| `apps/web/src/styles/game.css` | Layout and presentation styling for canvas and DOM surfaces. | CSS classes/state attributes → visual style. | No runtime state or socket dependencies. |

### Server entrypoint, transport, and room ownership

| File | Runtime responsibility | Exact inputs → outputs | Disconnect behavior |
|---|---|---|---|
| `apps/server/src/main.ts` | Load config, create HTTP/Socket.IO server, wire managers and scheduler, handle process shutdown. | `ServerConfig`, process signals → listening server + `dispose()` promise. | Shutdown stops accepting commands, checkpoints at safe boundaries, marks sessions unavailable, then closes. It does not synchronously erase active room state. |
| `apps/server/src/config/serverConfig.ts` | Parse and validate runtime settings and thresholds. | `process.env` → `ServerConfig` (tick rate, code TTL, grace ticks, capacity, CORS, limits). | No per-player/session state. |
| `apps/server/src/transport/createHttpServer.ts` | Create HTTP server, health endpoint, Socket.IO server and transport options. | `ServerConfig` → `{httpServer, io}`. | Socket transport close is surfaced as an event; room actors stay alive through transient client loss. |
| `apps/server/src/transport/SocketGateway.ts` | Bind protocol commands to validation/session lookup and enqueue accepted commands. | Socket.IO `Socket`, `ClientCommand` → `RoomCommand` enqueue + ACK; room events → per-session emits. | On `disconnect`, notify session registry and room manager once; no direct game-state mutation in the socket callback. |
| `apps/server/src/transport/SocketSessionRegistry.ts` | Map live socket IDs to server-owned player/session records; enforce one active controller per player. | `socketId`, join/rejoin claims → `Session`; disconnect → `SessionDetached` event. | Detaches socket from player; uses generation/session epoch to reject late packets from an older socket. |
| `apps/server/src/transport/RateLimiter.ts` | Bound create/join attempts and event frequency/payload abuse. | `{key, operation, now}` → `{allowed, retryAfterMs}`. | Disconnect does not clear abuse counters immediately; limits expire by TTL so reconnect cannot reset throttles. |
| `apps/server/src/rooms/RoomDirectory.ts` | Resolve random 4-character join code to internal `roomId` with TTL and tombstone. | `create/join/close` requests → reservation, lookup result, or typed rejection. | Socket loss does not remove the code mapping. Code expires by lifecycle policy, not socket count. |
| `apps/server/src/rooms/RoomActor.ts` | Serialize commands/ticks for one room; own mutable aggregate and command queue. | `enqueue(RoomCommand)`, `advanceOneTick()` → committed `RoomEvent[]`, `RoomSnapshot`. | Never awaits a client socket. Detached-player commands are rejected; disconnect becomes a queued command at a tick boundary. Other players continue ticking. |
| `apps/server/src/rooms/RoomManager.ts` | Create/lookup/close actors; route room-independent operations. | `CreateRoom`, `JoinRoom`, `CloseRoom` → actor/session result. | Retains run actor while any grace-eligible player or active run exists, per policy. Removes only after terminal lifecycle/TTL. |
| `apps/server/src/rooms/RoomLifecycle.ts` | Enforce `LOBBY -> STARTING -> RUNNING -> FLOOR_TRANSITION -> COMPLETED/CLOSED`. | Current phase + lifecycle command → validated next phase + events. | Disconnect updates roster/eligibility but cannot transition phases by itself unless configured minimum-party policy triggers at safe boundary. |
| `apps/server/src/rooms/DisconnectPolicy.ts` | Convert connection loss/rejoin/timeout to explicit player availability transitions. | `{playerId, reason, tick, partyCount}` → `PlayerAvailabilityCommand` and deadline. | Marks `DISCONNECTED_GRACE`; freezes that player’s movement/inputs, preserves HP/location/contribution, retains slot. On timeout, resolves at safe boundary to bot/spectator/removal/end policy. |

### Server simulation and game systems

| File | Runtime responsibility | Exact inputs → outputs | Disconnect behavior |
|---|---|---|---|
| `apps/server/src/simulation/FixedTickScheduler.ts` | Drive room actors at configured fixed rate with bounded drift and overload handling. | `RoomManager`, monotonic clock, `tickMs` → `advanceOneTick(roomId)` calls and timing metrics. | Scheduler is independent of sockets; stalled clients do not stall it. Skips/clamps excess wall-clock catch-up per config and records overload. |
| `apps/server/src/simulation/RoomSimulation.ts` | Define deterministic order of simulation systems for one tick. | `RoomState`, queued commands, `Tick` → new `RoomState` + domain events. | Disconnected players are excluded from input/movement, while enemy/world/objective ticks continue. Rejoin applies only at command boundary. |
| `apps/server/src/simulation/MovementSystem.ts` | Apply validated movement intent with speed, bounds, and state constraints. | `PlayerState`, latest `InputIntent`, collision query → updated transform/velocity + movement events. | Missing input is neutral input; player stops within same tick, avoiding continued stale movement. |
| `apps/server/src/simulation/CollisionSystem.ts` | Resolve authoritative collision proxies and trigger contacts. | `CollisionState[]`, proposed transforms → resolved transforms + contact/trigger events. | No socket dependency. Collision state advances normally for remaining players and enemies. |
| `apps/server/src/simulation/CombatSystem.ts` | Resolve attacks, hits, damage, statuses, deaths, and drops from server rules. | `CombatIntent[]`, entities, seeded RNG → entity deltas + combat events. | Disconnected avatar cannot issue attacks; policy may mark it protected/AI-controlled. Existing projectiles and enemies continue according to simulation rules. |
| `apps/server/src/dungeon/DungeonGraph.ts` | Store server-only graph nodes, edges, visibility, and room-instance mapping. | Graph commands + seed → graph delta/query result. | Graph remains owned by room actor; no reconnection rebuild. Rejoined clients receive only filtered projection. |
| `apps/server/src/dungeon/PortalSystem.ts` | Validate portal proximity/gates and resolve server-selected destination atomically. | `PortalEnterCommand`, player position, graph, exploration metrics, RNG → portal/space/player deltas + result event. | Disconnect before commit cancels pending request; disconnect after commit preserves committed transition. Idempotency key prevents duplicate resolution on retry. |
| `apps/server/src/dungeon/SecretDiscoverySystem.ts` | Proximity and interaction checks for hidden walls, clues, and secret spaces. | Authoritative transforms + secret trigger index → discovery events and visibility delta. | Discovery is committed independently of socket delivery; rejoin snapshot reflects it. Hidden coordinates are omitted until allowed. |
| `apps/server/src/progression/ContributionLedger.ts` | Accumulate validated, anti-farm contribution metrics. | Domain events (`DamageResolved`, `PuzzleSolved`, `TrapDisarmed`, `Revive`) → ledger delta. | Ledger remains attached to player slot through grace; disconnection itself yields no negative contribution or credit. |
| `apps/server/src/progression/FloorRewards.ts` | Apply shared base XP and bounded contribution bonus exactly once on floor completion. | Completed floor, eligible players, ledger → reward records + progression events. | Uses eligibility policy captured at completion and idempotency key; retry/reconnect cannot double-award. |
| `apps/server/src/persistence/RunRepository.ts` | Persistence interface for checkpoint and result records. | `saveCheckpoint`, `loadCheckpoint`, `saveCompletion` DTOs → promises of stored DTO/ack. | Storage failure is reported to manager; it cannot mutate a live room from callback. Safe retry uses checkpoint/revision IDs. |
| `apps/server/src/persistence/CheckpointService.ts` | Trigger safe-point/periodic checkpoint requests and serialize DTOs. | Actor snapshot + event revision → queued repository operation. | Never blocks a tick on remote I/O; failure marks persistence health and follows configured recoverable-run policy. |

### Shared protocol and domain

| File | Runtime responsibility | Exact inputs → outputs | Disconnect behavior |
|---|---|---|---|
| `packages/protocol/src/index.ts` | Public package exports and protocol version. | Module imports → stable package API. | No runtime connection handling. |
| `packages/protocol/src/commands.ts` | Typed client-to-server command DTOs and ACKs. | JSON payload → `ClientCommand`/`CommandAck` after schema validation. | No replay semantics implicit; each side effect uses `requestId`/idempotency key. |
| `packages/protocol/src/events.ts` | Typed server event DTOs, snapshot and delta envelopes. | Server domain event/projection → versioned `ServerEvent`. | Reconnect uses fresh snapshot if revision gap cannot be filled. |
| `packages/protocol/src/schemas.ts` | Runtime validators and parser functions. | `unknown` JSON → validated discriminated union or typed error. | Malformed/stale session commands rejected before enqueue, never crash actor. |
| `packages/protocol/src/limits.ts` | Payload, collection, coordinate, string, and rate limits. | Config overrides → immutable validated bounds. | Same limits after reconnect; no reset by socket churn. |
| `packages/game-domain/src/index.ts` | Domain package exports. | Imports → pure types and functions. | No connection concerns. |
| `packages/game-domain/src/ids.ts` | Branded internal IDs and factories. | Cryptographic entropy source → `RoomId`, `PlayerId`, `RunId`, `RequestId`; parsing → validated IDs. | Socket IDs are transport-local and not used as durable player IDs. |
| `packages/game-domain/src/enums.ts` | Shared stable enums for phase, status, portal, collision layer. | Import → compile-time symbols. | Includes `CONNECTED`, `DISCONNECTED_GRACE`, `TIMED_OUT`; transport loss maps to domain transition explicitly. |
| `packages/game-domain/src/room/RoomState.ts` | Serializable room aggregate shape. | Initial lobby config + IDs → `RoomState`; reducer events → next aggregate. | Keeps roster slot and grace deadline; contains no Socket.IO object. |
| `packages/game-domain/src/run/RunState.ts` | Serializable run/floor/objective/exploration state. | Seed + run config → initial `RunState`; domain event → next state. | Run simulation continues under actor policy; connection metadata is referenced by player availability only. |
| `packages/game-domain/src/player/PlayerState.ts` | Player identity, transform, vitals, progression, status, availability DTO. | Join/loadout config → `PlayerState`; validated events → next state. | Availability transition is explicit; player ID and contribution persist during grace. |
| `packages/game-domain/src/world/SpaceState.ts` | Space instance, bounds, objects, portals, visible node state. | Level template + instance ID → `SpaceState`; events → changed state. | Space does not depend on occupant sockets; last-player behavior is lifecycle policy. |
| `packages/game-domain/src/world/CollisionState.ts` | Serializable collision proxy definitions and enabled states. | Trusted level collision manifest → `CollisionState`; server collision events → delta. | Collider lifetime follows entity/space lifecycle, not network membership. |

### Portable runtime core, Three.js adapter, and Socket.IO adapter

| File | Runtime responsibility | Exact inputs → outputs | Disconnect behavior |
|---|---|---|---|
| `packages/runtime-core/src/index.ts` | Export adapter-neutral runtime API. | Imports → `ClientRuntime` contract. | No adapter-specific logic. |
| `packages/runtime-core/src/ports/NetworkPort.ts` | Transport-neutral network interface. | `ConnectOptions`, commands, listener → promises/unsubscribe/event stream. | Standardizes `connected/reconnecting/disconnected`; implementation must make disconnect observable. |
| `packages/runtime-core/src/ports/RenderPort.ts` | Renderer-neutral canvas interface. | Canvas, options, frame, resize → render/dispose operations. | Has no knowledge of connection; renders last safe frame plus connection UI state supplied by core. |
| `packages/runtime-core/src/state/ClientRuntimeStore.ts` | Immutable client projection store. | Validated server events + local connection state → new state and subscriptions. | Retains last accepted state as stale/read-only while reconnecting; never clears authoritative display on transport loss. |
| `packages/runtime-core/src/state/PresentationFrame.ts` | Renderer-facing visible snapshot contract. | Client store + interpolation time → immutable `PresentationFrame`. | Carries `isStale` and frame age so UI can label stale data; never reveals hidden state. |
| `packages/runtime-core/src/state/RevisionGate.ts` | Reject duplicate/out-of-order deltas and detect gaps. | Current revision + incoming event → `ACCEPT`, `DUPLICATE`, or `RESYNC_REQUIRED`. | On gap during reconnect, requests full snapshot; does not apply partial deltas. |
| `packages/runtime-core/src/session/SessionController.ts` | Coordinate join, leave, lobby start, and client session phase. | `NetworkPort`, UI intents → session state + commands. | Disconnect moves to `RECONNECTING`; it does not issue a leave unless user explicitly leaves. |
| `packages/runtime-core/src/session/ReconnectController.ts` | Exponential backoff with jitter, expiry, and resync after transport loss. | `NetworkPort`, reconnect credentials in memory, policy → retry attempts and status events. | Retries while run/session grace permits; once connected, rejoins then requires full snapshot/revision reconciliation before enabling actions. Clears in-memory secret on explicit leave/terminal close. |
| `packages/runtime-core/src/session/SnapshotReconciler.ts` | Apply full snapshot atomically, then resume deltas. | Snapshot + queued newer events → reconciled store or `RESYNC_FAILED`. | Snapshot is required after unrecoverable gap; failed reconcile keeps controls disabled and retries safely. |
| `packages/runtime-core/src/prediction/LocalMovementPredictor.ts` | Predict only local movement for responsive rendering. | Last acknowledged transform + unacked local inputs → predicted transform. | On disconnect, stop accepting new predictions after a short grace and mark predicted frame stale; on snapshot, reset/replay only current movement inputs. Never predicts portal outcomes. |
| `packages/runtime-core/src/prediction/PredictionBuffer.ts` | Hold bounded unacknowledged movement inputs by sequence. | Input + ack sequence → bounded buffer/replay list. | Clears or neutralizes old movement inputs on disconnect; never replays irreversible actions. |
| `packages/runtime-core/src/time/ClientClock.ts` | Estimate server tick/time for interpolation only. | Server timestamp/tick samples + monotonic local time → estimated render tick. | Freezes estimate or marks it stale while offline; does not advance authoritative gameplay. |
| `packages/render-three/src/index.ts` | Export Three adapter factory. | Renderer options → `RenderPort`. | Adapter disposal is independent of socket disconnect. |
| `packages/render-three/src/ThreeCanvasHost.ts` | Create/configure WebGL renderer, canvas sizing, context events. | Canvas + renderer config → renderer handle/events. | Context loss pauses rendering and later restores resources; network session remains independent. |
| `packages/render-three/src/RenderLoop.ts` | Own `requestAnimationFrame`, interpolation, render calls. | `getFrame(): PresentationFrame`, `ThreeRenderer`, `CameraRig` → frames drawn. | Never awaits network. If network pauses, draws last frame/connecting state; can continue effects with bounded local presentation time. |
| `packages/render-three/src/SceneFactory.ts` | Build Three scene, lights, static presentation roots. | Asset catalog + visual config → `Scene`. | Scene lifetime is app-level, not socket-level; no teardown/rebuild on reconnect. |
| `packages/render-three/src/CameraRig.ts` | Camera mode, follow target, smoothing, resize projection. | Presentation transforms + camera input → camera matrices. | Uses last known transform and eases to authoritative transform after resync; no simulation authority. |
| `packages/render-three/src/WorldView.ts` | Render visible spaces, meshes, and effects from frame data. | `PresentationFrame.spaces/objects` → scene updates. | Maintains last visible projection; clears entities only when authoritative snapshot/removal says so. |
| `packages/render-three/src/EntityViewRegistry.ts` | Map stable entity IDs to Three views and dispose removed views. | Entity DTO upserts/removals → mesh/view updates. | Reconnect snapshot reconciles by IDs; does not duplicate meshes for repeated events. |
| `packages/render-three/src/CollisionDebugView.ts` | Optional visual debug rendering for collision proxy DTOs. | Visible `CollisionState[]`, debug flag → helper meshes. | No physics handles or gameplay side effects; stale state is visibly labeled if enabled. |
| `packages/render-three/src/AssetCatalog.ts` | Load and cache GLB/material/texture assets by manifest key. | Asset manifest + loader dependencies → `AssetCatalog` promises. | Asset fetch can continue/fail independent of socket; failed loads do not invalidate room session. |
| `packages/render-three/src/RenderFrameAdapter.ts` | Convert portable presentation DTOs to render-specific operations. | `PresentationFrame` → view model updates. | Filters stale presentation consistently; cannot access `NetworkPort`. |
| `packages/net-socketio/src/index.ts` | Export Socket.IO transport adapter. | Server URL/options → `NetworkPort` factory. | No renderer imports. |
| `packages/net-socketio/src/SocketIoNetworkAdapter.ts` | Implement `NetworkPort` with Socket.IO client. | `ConnectOptions`, `ClientCommand` → ACKs/events/status. | Emits disconnected status, delegates retries policy, attaches resume credentials in memory; does not mutate client world state directly. |
| `packages/net-socketio/src/SocketEventCodec.ts` | Encode/decode event names and validated protocol payloads. | Socket event + unknown payload → parsed protocol DTO/error. | Late events tagged with old session epoch are ignored by core; parse failure triggers resync/error path. |
| `packages/net-socketio/src/SocketConnectionState.ts` | Normalize Socket.IO connect/reconnect/error callbacks. | Socket callbacks → normalized `ConnectionStatus` events. | Debounces transitions and exposes terminal versus transient failures to `ReconnectController`. |

### Documentation files

| File | Runtime responsibility | Inputs → outputs | Disconnect behavior |
|---|---|---|---|
| `docs/architecture/runtime-boundaries.md` | Human-readable dependency rules and module graph. | Architecture decisions → review checklist. | Documents that transport loss is not a render or room teardown signal. |
| `docs/architecture/protocol-contract.md` | Event names, DTO examples, versioning, visibility, replay/idempotency. | Protocol schemas → implementation reference. | Documents snapshot-resync requirement and commands safe/unsafe to replay. |

## 5. Dependency direction

```text
apps/web composition root
  ├── runtime-core ──> protocol + game-domain
  ├── render-three ──> runtime-core DTO contracts + Three.js
  ├── net-socketio ──> runtime-core NetworkPort + protocol + socket.io-client
  └── ui/input ──────> runtime-core public intents/status

apps/server composition root
  ├── transport ─────> protocol + rooms
  ├── rooms/actor ───> game-domain + simulation + dungeon + progression
  ├── persistence ───> game-domain DTOs (async boundary returns commands)
  └── protocol ──────> filtered per-client projections
```

Enforce this with package exports and lint dependency rules: no `three` import in `runtime-core`, `protocol`, `game-domain`, or server simulation; no `socket.io-client` import outside `net-socketio`; no server-only domain imports in browser bundles; no `NetworkPort` import inside `render-three`.

## 6. Disconnect sequence and concurrency safety

1. Socket callback detaches the transport session and enqueues `PlayerDisconnected(playerId, sessionEpoch)` to that player’s room actor. It performs no direct mutation of `RoomState`.
2. At the actor’s next serial boundary, validate that the event belongs to the current session epoch, set availability to `DISCONNECTED_GRACE`, set a tick deadline, and neutralize movement input. Preserve player ID, slot, location, HP, level, statuses, and contribution.
3. The fixed tick continues for the room. Other players, AI, hazards, timers, and objectives follow normal server rules. Any disconnected avatar behavior (stationary, protected, or bot-controlled) is one explicit server policy, not an accidental side effect.
4. On reconnect, verify the separate reconnect credential and grace deadline; rotate credential/session epoch; attach the new socket; enqueue `PlayerReconnected`. The client receives a visibility-filtered full snapshot or replayable contiguous deltas before actions are re-enabled.
5. Stale commands/events from old sockets fail session-epoch checks. Movement input is not replayed; irreversible portal/interact/combat requests are keyed/idempotent and are never automatically resent by the client.
6. On grace expiry, enqueue timeout resolution. Apply spectator/removal/bot/minimum-party policy at a safe tick boundary. Do not delete the player entity from inside a transport callback.
7. If the room actor itself fails, isolate it from other room actors, persist/recover from a committed checkpoint, and either resume at a known revision or close that run. A single player disconnect must never trigger this recovery path.

## 7. Implementation order

1. Build `protocol` and `game-domain` DTOs/validators first.
2. Build `RoomActor`, lifecycle, fixed tick, and simulation as pure/testable server modules.
3. Add Socket.IO transport and prove disconnect/reconnect plus snapshot reconciliation.
4. Build `runtime-core` against fake `NetworkPort` and fake `RenderPort` adapters.
5. Add `render-three`, then DOM HUD/input, preserving the dependency direction.
6. Add persistence and multiple process/shard deployment only after one-process room actors are stable and measured.

## 8. Portability test for the wrapper

The wrapper is reusable when a second sample can supply a different `RenderPort` and `NetworkPort`, compile against the same `PresentationFrame`/intent contracts, and run the same `SessionController` and `RevisionGate` without importing Three.js or Socket.IO into core. A fake offline network adapter should also be able to drive snapshots/events for local UI and rendering development.
