# Character preview gate, November 2, 2026

Disposition: **HOLD for model promotion.** This is a read-only visual comparison and a proposed trial path. No runtime renderer, asset binary, board, or deployment was changed for this report.

## Candidate identity and evidence

Checkout: `post-release/preview-polish-2026-11-01`, HEAD `f3adc73` at preflight. Existing untracked generated files and other agent work were preserved. The selected style reference is `client/title-cover-deepwood.png`, governed by `docs/design/TITLE_COVER_ART_CONTRACT.md`. The reference calls for cool gray-violet dusk, charcoal bark, rain-worn slate, dark moss, dirty frost, weathered cloth, practical class gear, a monumental rooted guardian, visibly airborne minions, and rare diamond motifs.

Inspected directly:

- Barkwing Run 1 actual-export angled and top renders: `art/blender/renders/barkwing-sprint-run-01-export/angled.png` and `top.png`.
- Barkwing Run 5 actual-export angled and top renders: `art/blender/renders/barkwing-sprint-run-05-export/angled.png` and `top.png`. The five-view manifest and `reports/BARKWING_POLISH_RUN_05_HANDOFF_2026-11-01.md` bind these to GLB SHA-256 `48d7ea7d9e52add17b8b2892e2cd2b64a5309ad4e304d8e2dc531168ee09e583`.
- Local procedural pack angled renders for Barkwing, Deepwood Sentinel, Rootling, and Ranger, plus its `asset-manifest.json` and README under `docs/design/runtime-character-pass/`. This pack is a separate technical study, not the Run 5 candidate.
- Local gameplay capture `docs/evidence/post-release-visual-pass-final/boss-wing-rootling-angled-1440x900.png` and its report. This shows the production procedural actor at the gameplay camera, not the Blender GLB.
- `reports/POST_RELEASE_VISUAL_RECOVERY_2026-11-01.md` and `reports/qa/ANIMATION_CAMERA_PHONE_EVIDENCE_2026-11-01.md` for existing runtime and phone-sized evidence limits.

The images were inspected at their native review composition. No fresh physical-phone playback, newly recorded gameplay, independent panel scoring, or exact current public revision was verified in this lane.

## Visual findings

| Subject | What reads at the gameplay camera | Gap against approved reference | Gate |
| --- | --- | --- | --- |
| Barkwing Run 1 | Separate left and right wings, suspended body, small eyes, talons | Top view collapses wings into a thin line; symmetric repeated membranes, straight torso, and fine claws | HOLD |
| Barkwing Run 5 | Cambered wings gain visible top-plane area and retain two clear wings in front and angled views | Side depth remains weak; geometric panel repetition and minimal bark anatomy still read as a stylized glider more than a branch-born flying minion | HOLD |
| Current runtime Barkwing | Wings and flight height are structurally present; the client animates them | Boss crown and actor silhouettes overlap in crowded combat; height alone does not prove easy visual targeting | HOLD for 95 visual gate |
| Deepwood Sentinel | Tall crown and branch arms help identify the boss | Local study looks like a horned upright figure. Current runtime is more tree-like, but close melee and dark palette obscure its root mass and attack pose | HOLD for model replacement |
| Rootling | Low ground profile separates it from tall actors | Local study reads as a spiked insect or rock. Current runtime is recognizably a small ground threat but remains visibly procedural | HOLD for model replacement |
| Four Wayfarers | Runtime classes have different equipment and color accents; Ranger bow shape is legible in local study | Blocky robes and thin limb detail do not match repaired cloth, underdog proportions, and tactile gear in the cover; crowded camera reduces individual recognition | HOLD for model replacement |

The local pack README reports no skeletal rigs for any subject and only a rigid wing preview for Barkwing. The Run 5 GLB has 1,716 triangles, six materials, zero skins, and two wing rotation channels. It exceeds the recorded 1,200-triangle and one-material minion targets. These numbers do not establish phone performance by themselves. The pack's small files and low polygon counts also do not establish runtime performance because those GLBs have not been loaded into the game.

## Current visual standard

The latest recorded whole-scene visual assessment is **76/100, HOLD** in `reports/POST_RELEASE_VISUAL_RECOVERY_2026-11-01.md`. The Run 5 Barkwing handoff records **44/100, HOLD** as a provisional single-reviewer model score. Neither is a fresh independent jury score for this checkout. The owner-set rule in `reports/qa-2026-10-31/VISUAL_JURY_95.md` requires at least 19/20, with no zero, in every floor and viewport, plus Deepwood and result views. It also holds a flying minion that appears grounded or lacks clear wings and shadow. The complete matrix remains unverified.

## Smallest reversible runtime trial after art approval

1. Marcus selects one exact Barkwing GLB by hash after comparing Run 5 front, side, angled, top, and phone-sized renders with the title reference. Retain the current procedural Barkwing as the default.
2. Refine that same asset to meet the approved triangle and material budget or document an owner-approved revised budget. Bake portable surface detail, add a skin and hover, move, dive/attack, hit, and defeat clips, then validate a fresh GLB import and export with exact hashes.
3. Add a single optional preview asset loader behind a local flag in a dedicated client module. The server continues to provide position, height, health, phase, targeting, and damage; the GLB supplies presentation only. On load, decode, context restoration, or animation failure, use the existing procedural mesh.
4. Compare one exact flagged build and the same unflagged build at identical camera positions and room states. Capture angled and top-down Deepwood combat, close melee, four to six actors, portrait and landscape, shadow and dive warning, load time, frame intervals, memory where available, draw calls, and WebGL errors. Run collision and combat tests unchanged.
5. Have independent reviewers score the required 95 percent matrix and Marcus test the flagged build on a physical phone and computer. Promote the GLB only if all gates pass. A failed preview is reversible by switching off the flag without changing authoritative gameplay.

Wayfarer, Sentinel, and Rootling replacement should follow one slot at a time after Barkwing proof. The current procedural actors preserve playable coverage until each exact replacement is approved. No Meshy credits are needed for the comparison; the prior Meshy task remains unverified and must be reconciled before any new paid generation.

## Owner review route

Start with Run 1 versus Run 5 top views, then their angled and phone-sized views. Compare the live gameplay screenshot to the cover for relative scale, silhouette separation, and atmosphere. Inspect the procedural pack only as a technical baseline. The decision requested is which Barkwing silhouette to refine next, not approval for immediate runtime promotion.
