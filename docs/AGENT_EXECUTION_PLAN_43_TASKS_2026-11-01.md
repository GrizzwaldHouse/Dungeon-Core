# Dungeon Core 43-task agent execution plan

## Verified inventory

- Notion-backed task rows: 51
- Automated verified rows: 6
- Deployed or owner-tested evidence rows retained for reference: 2
- Active work items: 43
- Stable reusable agent roles: 14
- Safe concurrent capacity: lead plus three workers

The number 43 describes the remaining task pool, not 43 agents that should edit the repository at the same time. The team will reuse the stable personas and process the work in controlled waves.

## Operating contract

1. The lead integrator owns shared state contracts, integration order, conflict resolution, and final commits.
2. At most three worker lanes run beside the lead.
3. Each implementation lane receives exclusive files before editing.
4. Strict Visual Jury and Release QA Manager remain independent and read-only while judging.
5. New ideas go to the next milestone through the Scope Steward. They do not interrupt active work.
6. Every handoff includes changed files, tests, evidence, known limits, and the next safe action.
7. No agent may push, merge, deploy, delete, reset, or publish without direct approval.

## Stable roster and primary ownership

| Role | Primary ownership |
| --- | --- |
| Lead Game Integrator | Shared contracts, server integration, task sequencing, reviewed commits |
| Authoritative Network Engineer | Rooms, reconnect, protected state, transport, performance, hostile input |
| Advanced Encounter Systems Lead | Floors, bosses, minions, progression, recovery, win and loss behavior |
| Runtime Character Art Lead | Existing Wayfarers, Sentinel, Rootlings, Barkwing, GLB production |
| Environment Runtime Polish Lead | Floors, roots, pillars, lighting, portals, collision readability |
| UI/UX and Audio Polish Lead | HUD, mobile controls, story presentation, accessibility, feedback |
| Animation and Camera QA Lead | Motion, airborne height, targeting, clipping, camera and phone framing |
| Audio QA Lead | Unlock behavior, cue timing, ambience, combat and results mix |
| Multiplayer QA Playtester | Independent clients, progression, pickups, revive, reconnect, outcomes |
| Strict Visual Jury | Independent 95-point visual scoring with no production edits |
| Release QA Manager | Acceptance matrix, defect ledger, exact revision evidence, READY or HOLD |
| Git and Release Steward | Recoverable commits, explicit staging, secret exclusions, revision identity |
| Portfolio Proof Lead | Recruiter case study, screenshots, video, truthful technical claims |
| Scope Steward | Scope lock, change impact, parking lot, prevention of mid-sprint expansion |

## Wave 1: Truth, scope, and owner defects

These tasks establish what is actually broken before broad implementation continues.

| Task | Assigned role | Acceptance output |
| --- | --- | --- |
| October 31 exact-revision go or no-go | Release QA Manager | Current revision evidence and truthful HOLD or READY result |
| Cross-account board synchronization | Lead Game Integrator | Local board reconciled without duplicate live tasks |
| Scope guard and agent roster pilot | Scope Steward | Active milestone lock and parking-lot rule applied |
| OWNER-001 iPhone title artwork obstruction | UI/UX and Audio Polish Lead | Narrow portrait and landscape title entry remain usable |
| OWNER-002 Cross-client pickup claim clarity | Authoritative Network Engineer | Same item identifiers and claim state compared across two clients |
| OWNER-003 iPhone background reconnect failure | Authoritative Network Engineer | Below-grace and above-grace recovery behavior documented and tested |
| OWNER-004 Phone loading freeze and Render lag | Animation and Camera QA Lead | Resource, context-loss, frame, and network evidence captured |
| OWNER-005 Vercel versus Render route comparison | Release QA Manager | Matched revision and endpoint comparison, no unsupported host claim |
| OWNER-007 Results actions and technical error copy | UI/UX and Audio Polish Lead | Human-readable results with appropriate actions disabled |
| OWNER-008 iPhone notification text selection blocks movement | UI/UX and Audio Polish Lead | Dragging from controls cannot select gameplay notices |
| OWNER-009 Story overlay exposes arrivals to enemy damage | Lead Game Integrator | Server-owned bounded readiness protection with recovery path |

Wave 1 worker order:

1. UI defect lane: OWNER-001, OWNER-007, OWNER-008.
2. Network defect lane: OWNER-002, OWNER-003, OWNER-009 contract review.
3. Independent release audit: exact revision, host comparison, and board truth.

## Wave 2: Five-floor campaign completion

| Task | Assigned role | Acceptance output |
| --- | --- | --- |
| Lock integrated five-floor state contract | Lead Game Integrator | One replay-safe server stage graph |
| Floor 1 tutorial and Sentinel | Advanced Encounter Systems Lead | Two humans can learn and clear without admin help |
| Floor 1 vault and collision parity | Multiplayer QA Playtester | Visible and authoritative collision parity evidence |
| Floor 3 finite mob waves | Advanced Encounter Systems Lead | Finite server-owned waves resist replay duplication |
| Floor 3 personal resource claims | Authoritative Network Engineer | One eligible claim per human with synchronized state |
| Floor 3 recovery space | Advanced Encounter Systems Lead | Safe pause, heal, revive, and proceed without softlock |
| Floor 4 ordered rune trial | Advanced Encounter Systems Lead | Ordered puzzle, warning, and replay protection pass |
| Floor 5 Shifting Core Warden | Advanced Encounter Systems Lead | All phases and telegraphs pass synchronized combat |
| Floor 5 Shardling waves | Advanced Encounter Systems Lead | Bounded minions cannot spawn indefinitely |
| Post-victory stronger cycle | Lead Game Integrator | Explicit host continuation preserves only approved progression |
| Threat on player down | Lead Game Integrator | One bounded increment per down with tested reset |
| Party wipe and revive | Lead Game Integrator | Server validates revive and produces one loss outcome |
| Inventory healing and riches | Authoritative Network Engineer | Duplicate intents cannot duplicate inventory or rewards |
| Mobile touch controls | UI/UX and Audio Polish Lead | Physical-phone owner gate passes after automated checks |
| Five-floor HUD and visual feedback | UI/UX and Audio Polish Lead | Objectives, phases, damage, pickups, and downing remain legible |
| Two-browser floor route | Multiplayer QA Playtester | Two independent clients complete the full route with shared outcomes |

Wave 2 ownership boundary:

- Lead alone integrates `server/server.js` shared contract changes.
- Encounter lead owns floor modules and floor-specific tests.
- Network engineer owns transport, reconnect, claim, and hostile-input tests.
- UI lead owns client interface files only after the current UI lane hands them back.
- Multiplayer QA does not edit production source while validating.

## Wave 3: Multiplayer, performance, and recovery

| Task | Assigned role | Acceptance output |
| --- | --- | --- |
| 2 4 6 player protocol matrix | Authoritative Network Engineer | Isolation, reconnect, stale intent, duplicate, and cap tests |
| Thirty-minute soak and latency | Authoritative Network Engineer | Documented memory, latency, tick, and failure measurements |
| Accessibility and renderer recovery | UI/UX and Audio Polish Lead | Keyboard, reduced motion, text status, WebGL loss, and narrow width checks |
| Public 2 4 and 6 player performance matrix | Release QA Manager | Public measurements tied to exact revision and devices |

The Multiplayer QA Playtester independently reproduces every claimed pass. The Git and Release Steward records the exact candidate identity before public comparisons.

## Wave 4: Existing visual, story, and audio candidates

| Task | Assigned role | Acceptance output |
| --- | --- | --- |
| Procedural combat and pickup audio | Audio QA Lead | Gesture unlock and bounded cue behavior verified |
| Flying enemy production asset | Runtime Character Art Lead | Approved Barkwing GLB with full clips and procedural fallback |
| Meshy and Blender Barkwing production pipeline | Runtime Character Art Lead | Provenance, hashes, PBR materials, rig, clips, and review views |
| Runtime character and minion polish | Runtime Character Art Lead | Existing candidates reach the 95-point visual gate |
| Five-floor environment polish | Environment Runtime Polish Lead | Distinct landmarks, readable roots, pillars, portals, and collider parity |
| Ice Guardian and mage counterplay | Advanced Encounter Systems Lead | Approved server-owned elemental contract and tests |
| Quest Master cinematic and final story presentation | UI/UX and Audio Polish Lead | Synchronized, skippable, accessible story presentation |
| Final ambience combat and results audio | Audio QA Lead | Provenance-cleared threat, battle, win, and loss mix |

The current five-hour asset-polish automation owns the active Barkwing study. No second agent may edit the same Spline scene or Blender output during its run. Strict Visual Jury scores candidates independently. Animation and Camera QA validates flying separation, combat tells, clipping, and both camera modes.

## Wave 5: Portfolio, evidence, and post-release balancing

| Task | Assigned role | Acceptance output |
| --- | --- | --- |
| Portfolio Vercel preview and production card | Portfolio Proof Lead | Game card and case study use verified links and runtime evidence |
| Portfolio anti-AI-default redesign | Portfolio Proof Lead | PowerSpec handoff reconciled before MSI implementation |
| Continuous QA and portfolio video | Release QA Manager | Redacted clips tied to the exact tested revision |
| OWNER-006 Campaign and mock-party difficulty | Advanced Encounter Systems Lead | Human and mixed-party balance report without cutting content |

## Current active agent lanes

| Agent lane | Assignment | File ownership |
| --- | --- | --- |
| `release_ui_polish` | OWNER-001, OWNER-007, OWNER-008 | `client/styles.css`, `client/index.html`, and focused UI tests only |
| `barkwing_gameplay_juror` | Read-only 95-point review of existing visual candidates | No production files |
| `dungeon_release_audit` | Read-only reconciliation of all board rows and release evidence | No production files |
| Lead integrator | Spline and Blender evidence integration, conflict prevention, reviewed commits | Shared contracts and final integration only |

## Completion rule

An item moves to verified complete only when its acceptance evidence is current and reproducible. A local unit test does not prove a physical phone, two-human campaign, public deployment, visual approval, or production performance. Tasks that need Marcus must be marked `Ready for owner test`, not silently closed.
