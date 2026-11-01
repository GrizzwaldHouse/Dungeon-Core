# Post-submission 3D asset integration plan

Status: proposal for owner review, November 1, 2026. This document authorizes no paid generation or runtime promotion. The submitted game remains the comparison baseline.

## Reference and current evidence

Use `client/title-cover-deepwood.png` and `docs/design/TITLE_COVER_ART_CONTRACT.md` as the primary art reference. Preserve cool gray-violet dusk, wet slate, charcoal bark, muted moss, practical worn gear, distinct Wayfarer silhouettes, a monumental rooted guardian, and clearly airborne Barkwings. Avoid broad yellow grading, cheerful saturation, and repeated diamonds. The cover is concept art, not evidence that its geometry or textures already run in game.

`client/render.js` currently constructs the four role silhouettes, Deepwood Sentinel, ground creatures, Barkwing, pillars, roots, portal, traps, and pickups from Three.js primitives. The roles have distinct equipment and the Barkwing has a wing animation. The Barkwing Blender prototype was scored 44/100 and marked `REFINE` in `docs/design/barkwing-pipeline/JURY_RESULT_2026-10-31.md`. A later local reference reconstruction has front, side, angled, top, and phone-sized renders under `docs/design/prototypes/barkwing-reference-v2/multiview-review/`, but no new jury score, skeletal combat animation, runtime browser proof, or physical-phone proof. The Meshy attempt is `NOT_VERIFIED` in `docs/design/barkwing-pipeline/MESHY_ATTEMPT_2026-10-31.md`; inspect the existing account project and credit history before any new request. The existing `docs/design/ASSET_LEDGER.md` is incomplete for runtime models, fonts, audio, and third-party code.

## Promotion order and owner decisions

| Slot | Visual problem and intended pass | Source review before build | Runtime proof |
| --- | --- | --- | --- |
| Barkwing flying minion | Organic branch-and-torn-leaf wings with clear height above ground and equal readability from angled and top-down views | Compare the existing Blender reconstruction and Meshy concept to the cover; Marcus selects a final silhouette | Flight shadow, wing motion, attack, hit, defeat, and targeting at gameplay scale |
| Four Wayfarer roles | Repaired gear, underdog proportions, unique readable class equipment and backstories without a universal diamond emblem | One role sheet per character approved against the title cover and current gameplay roles | Idle, move, attack/cast, damage, down, revive, and victory states |
| Deepwood Sentinel | Twisted bark mass, root weight, branch arms, warning tells, and a silhouette distinct from pillars | Approve orthographic and three-quarter sculpt sheets | Health phases, minion calls, attacks, hit and defeat sync to authoritative events |
| Rootlings and other ground enemies | Distinct ground threat shapes and readable attack tells | Approve family sheet and color separation | Approach, attack, hit, defeat and collision footprint parity |
| Pillars, roots, portal, and landmarks | Roots read as roots; pillars look weathered and do not imply false collision | Review one floor slice at both camera settings | Exact shared-layout collision parity and visible portal approach |

No slot is marked approved for production by this plan. Start with the Barkwing because the existing draft and five-view comparison make its failure mode measurable. Keep the current procedural mesh available as a fallback until a candidate passes all gates.

## Source, license, and spend record

For each candidate, record source service and account, creation date, original image or model identifier, source prompt and references, tool version, generation and conversion credits, terms governing commercial use and redistribution, contributor or artist permission where relevant, original file hash, export hash, and exact intended runtime slot in `docs/design/ASSET_LEDGER.md`. A screenshot or account balance is insufficient to claim model ownership or generation completion. Review third-party animation licenses separately, including Mixamo if used. Do not create a duplicate Meshy task while the prior task state and credit delta remain unresolved. The user-stated Meshy ceiling is 1,000 credits; spend requires a separate approved candidate and a verified remaining balance. Blender headless work can proceed without paid model generation after the scope and reference are reviewed.

## Technical budget and loading contract

Measure the existing phone build first: scene draw calls and triangles at each floor and camera angle, GPU frame duration where available, median and slow-device frame times, memory, initial transfer, texture decode, WebGL context-loss behavior, and cold/warm loading. Set per-slot triangle, texture, material, bone, and animation limits from that baseline and a target phone, then write the numeric limits into the asset ledger before production export. The earlier Meshy prompt suggested fewer than 10,000 triangles for one Barkwing and a 2K texture, but those are unvalidated generation targets, not accepted mobile runtime budgets.

Export a checked glTF/GLB with meter-like scale, forward-axis and pivot conventions documented, named materials and clips, no hidden cameras or lights, bounded texture dimensions, and no unsupported extensions. Prefer a small number of atlased rough materials, mipmaps, compressed textures only after cross-browser support is proven, and reduced detail at distance. Cache one geometry and material set per asset type; instantiate safely for simultaneous enemies. Load only assets needed for the current room or floor, show progress and recoverable errors, and retain deterministic procedural fallback for missing files, failed decoding, unsupported WebGL features, and context restoration. Client visuals may read server snapshots but never own hitboxes, health, attacks, or phase transitions.

## Blender inspection and animation

Use headless Blender for reproducible import, structural checks, export, and five neutral review views: front, side, top, three-quarter angled, and gameplay-size angled. Save the script, Blender version, source and output hashes, triangle count, materials, textures, armature and clip inventory, bounds, and rendered contact sheet. Render again under the game's dusk lighting and both player camera choices. A phone-sized Blender render tests composition only; it does not test a physical phone.

Rig the Barkwing with separate wing roots, controllable wing ribs, body pitch, talons, and a stable collision/target anchor. Required clips: hover/locomotion, attack windup, attack release, hit reaction, death, and phase or spawn entrance when relevant. Wayfarers need locomotion, each class attack, damage, down, revive, and win states. The guardian needs telegraphed attacks and phase transitions. Ensure clips do not change server collision or damage timing. Test simultaneous instances, animation blending, pause/resume after tab backgrounding, and recovery after a reconnect snapshot.

## Review and release gates

1. Owner approves the silhouette and source provenance for the exact candidate, with no repeated diamond motif.
2. Independent visual reviewers score silhouette, cover fidelity, animation craft, combat readability, and technical efficiency from blind gameplay-size captures. Promotion target is at least 95/100 with no critical category failure. Preserve both scorecard and dissenting comments. The 44/100 draft remains a failed baseline, not a passed candidate.
3. Automated glTF checks confirm scene graph, material/texture bounds, animation names, finite transforms, no missing dependencies, and asset load fallback. Server AABB and hit validation tests remain unchanged and pass.
4. Capture desktop angled and top-down play, close melee, distant view, boss phase, four to six actors, and both phone orientations. Confirm small silhouettes, flying separation, warning tells, portal readability, and stable frame times against the measured pre-integration baseline.
5. Marcus plays the preview branch on a physical phone and computer, reviews the five-view sheet and live gameplay, and approves promotion. A headless capture or mock teammate run cannot close this gate.
6. Promote one asset slot per explicit commit with source/license evidence, measured size and performance, rollback procedure, and exact served revision. Keep the submitted build available while the preview is reviewed.

First executable next step: inspect the existing Meshy project and credit history without starting a task, then capture the current Barkwing and guardian at identical camera positions and resolutions to establish the visual and performance baseline.
