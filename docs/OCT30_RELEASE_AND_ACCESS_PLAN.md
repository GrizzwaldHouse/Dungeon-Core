# Dungeon Core Crawler — full release and access plan

**Owner deadline:** 2026-10-30, America/Los_Angeles
**Scope:** the complete cooperative 3D dungeon design in `DESIGN_BOARD.csv`, `client/handshake_guidelines.md`, and `docs/PUBLISH_READINESS_AND_TEST_PLAN.md`. This plan does not remove classes, puzzles, traps, multi-floor progression, revive/failure rules, authored atmosphere, or multiplayer acceptance. The October 26 board is superseded by this date.

## Evidence on October 23

- **Git:** local baseline `712831bce7c72537030d35031ba15fb9e1e017e2`; `AGENTS.md` and `docs/GIT_WORKFLOW.md` enforce reviewed local milestone commits. Server first-floor milestone `59a0618f03f73c48fcee142c176801580c4db3ad`; client presentation milestone `79c8bd96d08f28dc2a06572687177caf4dbbee04`. No Git remote or off-machine copy is configured.
- **Implemented source:** four-character accountless rooms, 2–6 capacity, server-owned movement/AABB collision and sentinel combat, proximity discovery, 30 Hz snapshots, reconnect grace, mock explorers, one private two-vault shift, anti-rush status, 45-tick trap warning and damage, one terminal floor reward with equal base and capped contribution bonus. Three.js transport and rendering are separate modules.
- **Fresh checks:** `npm run check` passed; `npm test` passed 18/18 after the server and client milestones. This does not prove visual playability, full design completion, or public-host performance.
- **Still absent or incomplete:** genuinely distinct room geometry and puzzle vectors; trap-disarm and support actions; multiple floors, difficulty curve, classes/loadouts, downed/revive and party wipe; full 2/4/6 real-player tests, two-browser end-to-end proof, 30-minute soak, public deployment, domain setup, and an off-machine backup.

## October 24 progress

Amber and violet vaults now use separate object sets from the shared layout registry. The server swaps collision geometry with the server-selected route, validates party landing against destination AABBs, and the renderer shows only meshes for the active space. The local syntax check and **21/21 automated tests** passed, including destination collision and visual object/collider parity. Puzzle objectives, multi-floor progression, and independent browser proof remain open; the full release verdict is still NO-GO.

The next milestone adds a server-validated `trap:disarm` action with distance and line-of-sight checks, replay-safe contribution credit, and a trap warning placed near the party landing. The client exposes an F key and button when the server snapshot shows a nearby live trap. Syntax checks and **23/23 automated tests** pass. One in-app browser showed the selected amber and violet vault geometry after a portal transition with no console errors; the disarm button timing has only automated UI evidence, and independent browser proof remains open.

## Required systems and current access

| System | Needed for | Current access/evidence | Next action |
| --- | --- | --- | --- |
| Local project and Git | Code, tests, recovery points | **Available.** Repository and commits exist; no remote. | Continue explicit-path milestone commits. |
| Node.js and npm | Server, checks, Socket.IO test harness | **Available.** `node`, `npm`, and installed dependencies work. | Pin the release runtime; run full test and soak matrix. |
| GitHub `GrizzwaldHouse` | Off-machine recovery, source hosting, CI, portfolio link | **Blocked.** `gh` is installed, but its stored token is invalid; GitHub MCP repository listing is unavailable to this model. | Owner refreshes GitHub sign-in for `GrizzwaldHouse` or connects the GitHub app with repository access. Choose a repository such as `GrizzwaldHouse/dungeon-core-crawler`; keep it private until publication choice is explicit. Never paste a token into chat. |
| Render account | Single-process Node/Socket.IO public staging and health checks | **No callable Render connector or authenticated dashboard evidence.** A `render.yaml` can be prepared locally. | Owner connects a Render account to the GitHub repository or supplies dashboard access through an approved browser session. Free web service is suitable for a portfolio preview, with idle spin-down and ephemeral room state. |
| `marcusdaley.dev` DNS | Optional custom game URL | **Domain named by owner; DNS provider and rights are unverified.** | Provide DNS access or make the required record yourself after Render displays its exact target. Prefer `dungeon.marcusdaley.dev` to avoid changing the existing apex site. Verify TLS and WSS. |
| Browser/desktop QA | Two real clients, controls, visuals, narrow viewport, console | **ChatGPT in-app browser available with two local tabs.** Native desktop app inventory is empty in this session; a real Chrome/Edge second profile has not been proven. | Use two independent browser contexts and, before launch, two devices/networks for public URL. Capture visual and console evidence. |
| Game asset workflow | Authored rooms, mesh/texture optimization and runtime export | **Three.js and image generation are available.** `game-dev` CLI and Blender command are currently unavailable. | Build procedural/content-complete rooms first. For authored Blender/GLB work, install or expose Blender and the Game Development Studio CLI if that route is chosen. Meshy is optional and would need configured credentials, spend budget, and the skill's Function/Form/Runtime approvals. |
| Agent capacity | Parallel gameplay, UI, protocol QA, browser QA, Git stewardship | **Agents were created and committed milestones; current subagent turns hit a usage limit.** Daily Git and release-sprint automations are active. | Resume parallel agents when capacity returns; lead continues independent work meanwhile. |
| Codex Game Studio toolkit | Structured production, QA, release templates and role packets | **Installed in an isolated sibling checkout** at `../codex-game-studio-tool`, pinned at `f3c50a0552f562eafc8178973dc48c29cd0d50fa`. Bundled Node 24, pinned npm dependencies, and TypeScript build work; `templates list` and `templates show sprint_plan` were run. | Reuse the relevant sprint, QA, and release templates as reviewable guidance. Its project `init` supports Godot, Unity, and Unreal, not this Three.js project, so do not run it on DungeonCoreCrawler or replace the existing `AGENTS.md`. |

## Skills and plugin capabilities already present

- **OpenAI/Codex:** code editing and terminal, Git operations, browser control for the in-app tabs, image generation, scheduling automations, and parallel agent coordination. The available `imagegen` skill supports original art or edits; generated assets still need license/provenance and runtime performance review.
- **Game Studio:** `game-studio`, `three-webgl-game`, `game-ui-frontend`, `game-playtest`, and `web-3d-asset-pipeline` skills are installed. They guide the Three.js runtime, DOM HUD, GLB pipeline, and browser playtesting; the project remains plain JavaScript unless a migration is deliberately approved.
- **Build 3D Game Rooms:** installed room-design and Blender/Meshy workflow. It requires approved Function, Form, and Runtime gates and cannot substitute a proxy image for tested game geometry.
- **Game Development Studio:** skill installed, but the required `game-dev` CLI is absent, so its capture/asset tooling is currently blocked.
- **Codex Game Studio:** the [requested source toolkit](https://github.com/merlinhu1/codex-game-studio) is cloned and built with the bundled Node 24 runtime. Its CLI template catalog works. A `sprint-plan --dry-run` against this game correctly reported a missing `.codex/studio.json`; its available engine tracks exclude Three.js, so only applicable read-only templates and skills are used. This avoids importing an incompatible project manifest or pruning the game repository.
- **GitHub and Vercel apps:** tool names are exposed, but direct list calls returned “not available to the model.” They are not presently reliable execution paths. Vercel functions now support WebSockets, but this in-memory single-process room server needs a durable shared-state redesign before function-based deployment; see the [Vercel WebSocket guidance](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections). Render's [web services](https://render.com/docs/websocket) support inbound WebSockets directly.

No new paid service or external skills repository is required to code the current game. Blender/GLB tooling can improve authored spaces, but shipping needs runtime-tested geometry, not a plugin count.

## Work sequence to October 30

| Target | Full-scope work | Acceptance evidence |
| --- | --- | --- |
| Oct 23–24 | Lock current server/client contract; update recruiter README, optimization and deploy docs; establish GitHub recovery; build distinct room topology, puzzle and hidden-space objectives. | Reviewed commits; explicit schema; tests for routing, safe spawn, isolation, and progress. |
| Oct 24–25 | Finish traps/disarm, bounded anti-rush scaling, class/loadout actions, downed/revive/party wipe, and at least a multi-floor loop with shared group leveling. | Deterministic tests for ties, reconnect, duplicate actions, late join, failure/recovery, and no softlock. |
| Oct 25–26 | Finish visual direction and authored/procedural room variants, objective HUD, feedback, accessibility, graphics recovery, asset size/performance pass. | Two-browser screenshots and recorded controls/focus/contrast/low-FPS checks; collider parity. |
| Oct 26–28 | Protocol and adversarial QA at 2/4/6 real sockets, two simultaneous rooms, public-latency simulation, 30-minute soak, client smoothing and payload measurements. | Reproducible QA ledger with revision, p95/p99, memory, errors, defects and fixes. |
| Oct 28–29 | Push reviewed source to an approved GitHub repository; stage one Render Node service; configure a subdomain only with verified DNS target; test public HTTPS/WSS and rollback. | Public staging URL, health response, two-device session and restart/reconnect evidence. |
| Oct 30 | Final exact-revision regression, accessibility and portfolio copy review, release decision, publish. | All P0 gates pass and release notes describe only observed behavior. If a required gate fails, record NO-GO; do not claim completion from the date alone. |

The original 45–60-minute competition window can produce a demonstration, but it is not proof that this expanded full rubric can be completed and validated in that time. The remaining work is substantial and the October 30 date is a high-risk target. Parallel work and access restoration help throughput; they do not replace test evidence.

## Risk register and current ship verdict

| Risk | Impact | Mitigation and owner |
| --- | --- | --- |
| Seven-day full-scope target exceeds the earlier 27–47 working-day P0 estimate | **Critical:** core mechanics or QA may miss the deadline | Lead keeps all features in scope, assigns separate owners, and reports exact unfinished gates daily. Date alone cannot waive acceptance. |
| GitHub authentication is invalid and no remote exists | **High:** no off-machine recovery or Render import | Owner restores GitHub access; Git steward verifies an explicit-path push of the reviewed revision. |
| No verified Render/DNS access | **High:** public staging and domain tests cannot start | Prepare `render.yaml`; owner connects Render and DNS; lead runs public WSS/two-device QA. |
| Free service idle/restart behavior destroys in-memory rooms | **High:** active sessions may disappear | Clearly disclose transient sessions, test restart/reconnect, and consider persistence or a paid host if durable runs become a release requirement. |
| Browser evidence is currently two tabs in one in-app browser | **Medium:** it does not prove two independent browsers or devices | QA repeats the full route in independent browser profiles and two public devices. |
| Authored rooms need geometry/collider parity and asset tooling is partial | **High:** visual polish can break server collision | Use one shared layout registry, test every new AABB face, and block publication until runtime captures pass. |

**Current verdict: NO-GO for a full public release.** This is an evidence status on October 23, not a scope cut. It changes only after the full design, hosting, and QA gates pass on an exact revision.
