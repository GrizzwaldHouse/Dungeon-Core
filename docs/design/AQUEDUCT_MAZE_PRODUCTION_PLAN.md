# Aqueduct maze and elemental preparation plan

Date: 2026-11-14
Status: proposed design and implementation assignments, not runtime acceptance.
Baseline inspected: 98ac622 (Build active boulder maze trap), clean integration checkout.

2026-11-15 branch note: MAZE-01 is being reviewed from remote `gameplay/release-integration` at `b67aa7b`. The boulder and later layout work through local `4a314fb` remains on a separate integration lane. The route module in this review is a candidate contract, not a playable Floor Two change.

## Scope and current truth

Preserve the existing five-floor story, multiplayer authority, approved dusk palette and masonry-root Aqueduct threshold. The inspected local baseline at `98ac622` has mirrored vault barriers, a damaging boulder lane, rearming, and deliberate disarm. Wall launchers, dodge-earned caches and the full route below are planned additions. Existing 180-test evidence belongs to that prior milestone; it was not rerun for this document.

The speech-transcription fragment about film/business is unresolved and is not interpreted as a new feature. The mystery reward below is a proposed special advantage, not an approved new inventory family.

## Research and design rationale

- Valve's cooperative pacing work separates build-up, peak and recovery. Apply that principle with safe observation and recovery spaces between hazards, rather than continuous damage pressure: https://steamcdn-a.akamaihd.net/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf
- Essential instructions should be reinforced beyond text. Pair launcher sounds with visible dust, moving shutters and lane markings; never require hearing or color alone: https://gameaccessibilityguidelines.com/ensure-no-essential-information-especially-instructions-is-conveyed-by-text-alone-reinforce-with-visuals-and-or-speech/
- These sources support pacing and communication principles. The geometry, values, rewards and sequence below are project-specific proposals requiring playtesting.

## Full level: The Forgotten Sluice

An abandoned Guild aqueduct was built to channel elemental pressure through stone channels. Deepwood roots have broken its mechanisms. The party learns that a threatening mechanism can expose something useful behind it.

```text
                      NORTH
             [H: guardian approach / exit]
                          |
             [G: recovery and regroup]
                          |
        [F: elemental encounter courtyard]
                          |
 [E: cache behind W]--[W: wall launcher]=====>[catch basin]
                          |    boulder lane
                     [D: refuge pockets]
                          |
             [C: braided maze and landmark]
                 /                     \
      [short exposed route]     [long sheltered route]
                 \                     /
              [B: observation balcony]
                          |
                 [A: safe arrival]
                      SOUTH
```

This is a connectivity diagram, not a collision blueprint. Build adjacent room modules within the existing room/bounds model; do not silently enlarge current bounds or squeeze this entire sequence into one narrow vault.

| Zone | Player decision | Readable environment | Acceptance |
|---|---|---|---|
| A | Gather and ready up | Quiet chamber, clear route marker | No enemy or trap damage during arrival protection |
| B | Watch one launcher demonstration | Broken stone mouth, rail grooves, visible catcher | Learn direction before entering danger |
| C | Choose exposure or longer cover route | Distinct root arch and dry-channel landmarks | Both paths reachable with player-radius clearance |
| D | Dodge into a refuge | Recessed side pockets outside swept collision | Enough refuge capacity for six players; no body-block trap |
| W | Bait the launcher, leave its lane | Shutter opens, dust falls, boulder exits masonry | Geometry, sound and damage follow server ticks |
| E | Investigate the emptied launch chamber | Open shutter and revealed pedestal | One server-verified team claim per run; no repeated farming |
| F | Apply the learned movement to enemies | Element-specific terrain and telegraphs | Preserve required enemies and encounter order |
| G | Recover before the next peak | Water, supplies and quiet shelter | No mandatory fight overlapping recovery |
| H | Regroup and advance | Aqueduct threshold and objective marker | No stranded or disconnected player blocks progress forever |

Initial tuning targets: 3m clear main paths, 4m passing/refuge areas, at least 1.5s warning and approximately 4s visible traverse. Leave the earned cache accessible for the remainder of the encounter, rather than imposing a timed loot sprint. These are hypotheses, not measured guarantees. Derive safe timing from actual movement speed, player radius, network delay and phone input. Keep current 18 damage until playtests justify changing it. Avoid knockback into a second unavoidable hazard.

## Launcher and reward contract

Use a server-owned lifecycle: IDLE -> WARNING -> ROLLING -> RECOVERY -> IDLE. A separate cache state is LOCKED -> AVAILABLE -> CLAIMED. Disarm remains an explicit action and must not be confused with successful dodging.

Track launcher ID, run/cycle ID, authoritative tick deadlines, swept lane, trigger participants, hit participants, availability and claim state. Snapshot enough state for a reconnecting client to reproduce the current phase without replaying rewards or damage.

Successful dodge requires a living player present in the threat region at warning start, surviving the roll and avoiding boulder contact. Standing safely in a distant room is not a successful dodge. One qualifying party member unlocks the team cache so everyone can cooperate rather than compete for the last hit. Claim validates room, alive state, server position, run ID and unclaimed state. Never accept a client-declared dodge or reward amount.

After success, hold the launcher safely disabled while the cache route is occupied. Never close a shutter on a player. Offer another attempt after failure; the cache is optional and cannot make the main level unwinnable. Companions must not repeatedly trigger the mechanism ahead of a human party. Handle despawn, disconnect, arrival and downed state explicitly.

Proposed mystery item: a Sluice Ward that provides a bounded, clearly described defensive advantage against the next elemental encounter. First implementation should reuse an existing supported resource/status effect if suitable; any new effect needs an explicit contract, expiry and balance test. Do not silently award permanent resistance or change contribution-based XP.

## Recurring preparation through five floors

1. Floor One: observe, move to cover, regroup. Simple stone hazard with a safe teaching route.
2. Floor Two: full aqueduct route, dodge-earned cache, then the established six-spider encounter: three ordinary, one fire, one lava, one acid. Fire teaches burst timing; lava teaches persistent-zone avoidance; acid teaches maintaining a safe route.
3. Floor Three: recovery before Deepwood pressure. Apply refuge-reading to roots and flying attackers. Preserve approved Deepwood placement after recovery.
4. Floor Four: combine previously learned hazards sequentially before overlapping them. Tune only after the existing named encounter is inspected.
5. Floor Five: test learned movement, cooperation and resource decisions; preserve victory and optional harder-cycle restart. No new mandatory mechanic introduced at the final boss.

## Generation and asset practices

Author the critical route first. Permit seeded swaps only among validated modules, with connectivity checks, radius-expanded wall checks, reachable objectives, alternate cover and an escape route from each reward alcove. Reject invalid seeds before hosting the room. Use identical shared collision data for rendering and server movement.

Use existing Three.js and Node test tools for gameplay; Blender for launcher masonry, broken lips, grooves and root dressing; Spline only for optional composition review. Do not put Spline runtime or ComfyUI in the critical path for collision work. Image generation can produce approval concepts but cannot prove playable geometry. Keep decorative roots out of collision unless visibly substantial and explicitly mirrored in shared geometry. No paid generation is authorized by this plan.

## Agent assignments and ownership

Read-only review by maze_design_review confirmed two integration risks: the violet divider intersects the existing boulder lane envelope, and the server supports one room.run.trap with a hardcoded vault-trap ID. First build one launcher with multiple approach choices. Validate the entire swept lane before changing speed. Keep the cache alcove inside the bounds, or deliberately split the shared outer wall so the reward is actually reachable. Preserve existing per-player pickup entitlements when settling the reward contract; one shared cache unlock must not let the fastest client steal everyone's allocation.

Use separate task branches/worktrees from the reviewed integration SHA. Branch names below are assignments, not claims that branches or running agents exist. Root integrator alone owns shared contracts, server/server.js, shared/dungeon-layout.js, client/render.js and final integration. Agents propose adapters/patches to those files rather than editing them concurrently.

| ID | Agent role / branch | Exclusive output | Depends on | Done evidence |
|---|---|---|---|---|
| MAZE-01 | Level designer, codex/aqueduct-route | New level-design module and layout-specific tests, paths agreed before edits | Contract lock | Reachability for 2-6 players, cover capacity, no sealed cache |
| MAZE-02 | Encounter engineer, codex/wall-launcher | New trap logic module and trap-specific tests | MAZE-01 geometry contract | Warning, swept damage, dodge eligibility, claim idempotency, reconnect |
| MAZE-03 | Environment/FX artist, codex/aqueduct-launcher-art | New launcher renderer module and candidate assets ledger | MAZE-01 dimensions | Wall-origin boulder, moving shutter, readable danger at both cameras |
| MAZE-04 | Multiplayer QA, codex/aqueduct-qa | New maze QA scripts and evidence report | MAZE-01/02 integrated locally | Two independent active clients, 2/6 occupancy, death/rejoin/restart |
| MAZE-05 | Audio/UI designer, codex/aqueduct-cues | New cue specification and isolated cue module | MAZE-02 events | Visual equivalents for every essential sound; phone-safe prompts |
| MAZE-06 | Lead integrator, current integration lane | Shared files, task/handoff documents, reviewed local milestone | All relevant reviewed changes | Relevant tests then full suite, headed video, honest device status |

Execution waves: lock contracts; run MAZE-01 plus art concept/cue planning; integrate geometry; run encounter and renderer modules in parallel; integrate; run QA. Maximum four active agents including lead. Do not merge or publish without separate authorization. Existing agents must report actual branch/SHA/status before being resumed.

## Required review recording and regression gates

- Show both real clients actively moving and fighting, with the same encounter visible. Mock companions are separate evidence.
- Record warning, successful dodge, failed dodge with health loss, behind-wall entry, collection on one client and removal on both, recovery, return path and exit.
- Test high-speed swept collision rather than single sampled-point collision; no tunnelling at 30Hz.
- Test exact tick boundaries, duplicate claims, mismatched run IDs, forged positions, late join, disconnect during warning, downed player inside chamber, all-player wipe and harder-cycle restart.
- Verify wall-render/collider parity and companion navigation around launcher/refuges.
- Verify phone portrait/landscape, HUD occlusion, no text selection during movement, and reduced-motion mode without losing timing cues.
- Record SHA, browser/GPU mode, resolution, active player count, test exits, video paths and failures. A jury score is subjective visual evidence, not proof of correctness or AAA quality.
- Keep physical iPhone and public deployment acceptance separate from emulation/local/headed evidence.

## Notion sync

Target: https://app.notion.com/p/40a1b4945bee80cd850cdcedef954a2b
Status as of 2026-11-15: the board was read, its 42 existing rows were compared with MAZE-01 through MAZE-06, and the six missing rows were added. The 48 task records were exported and published as public GitHub issues in `GrizzwaldHouse/Dungeon-Core`; MAZE-01 through MAZE-06 are issues #43 through #48. The six maze issues remain planned work, with dependency and evidence gates on the issues. Notion's Status field was empty and offered no values, so the planned state is recorded in Current evidence. The private GitHub Project is the live task board; this plan and the Penpot import are review artifacts.
