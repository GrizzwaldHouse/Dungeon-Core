# Existing character candidates: next polish pass

Date: November 5, 2026. Checkout: `post-release/preview-polish-2026-11-01`, preflight HEAD `8c8d768`. This is a visual and source review for POST-006. No model was generated, changed, approved, or loaded into the game.

## Reviewed evidence

- Primary reference: `client/title-cover-deepwood.png` and `docs/design/TITLE_COVER_ART_CONTRACT.md`. The reference requires storm-gray violet light, charcoal bark, dark moss, weathered cloth and gear, four different Wayfarer silhouettes, a rooted guardian, and minions that visibly occupy air above the party. Diamonds remain rare.
- Opened the existing seven-candidate pack's phone-sized angled views, Barkwing top and side views, and the cover. The pack is in `docs/design/runtime-character-pass/`; its manifest identifies the source script, each GLB, five views per asset, and `CANDIDATE_NOT_RUNTIME_APPROVED` status. These are untracked review artifacts, not served game models.
- Opened the separate Run 5 Barkwing actual-export front, angled, top, side, and phone views under `art/blender/renders/barkwing-sprint-run-05-export/`. Run 5 remains the more developed Barkwing candidate. Its prior `44/100` score is a historical single-reviewer HOLD, not a fresh jury result.
- Read `reports/qa/CHARACTER_PREVIEW_GATE_2026-11-02.md`, `reports/BARKWING_POLISH_RUN_05_HANDOFF_2026-11-01.md`, and `docs/design/POST_SUBMISSION_3D_ASSET_INTEGRATION_PLAN.md`. No new headless Blender import, phone playback, gameplay capture, or independent score occurred in this review.

## Direct visual findings

| Candidate | Useful foundation | Main gap at small review size |
| --- | --- | --- |
| Run 5 Barkwing | Two separated wings, hanging talons, improved top-plane area | Side view is nearly a blade. Repeated membrane segments and thin branch anatomy still read as a glider rather than a living Deepwood creature. |
| Seven-pack Barkwing | Obvious span and body above talons in the angled view | Top and side views flatten. Its straight torso and even wing panels are farther from the cover than Run 5. Do not substitute it for Run 5. |
| Deepwood Sentinel pack | Antler-like crown, tall central body, muted palette | Slim cone-shaped trunk and little root mass make it resemble an upright horned figure rather than the monumental rooted guardian in the cover. |
| Rootling pack | Compact low threat, distinct from a player by height | Pointed limbs and a round core resemble an insect or spiked stone. It needs forked roots and bark growth to identify its family. |
| Four Wayfarers pack | Hood, bow, staff, shield, and color separate roles | Robes and limbs share a simple block pattern. From a phone-sized angle they lack repaired cloth, asymmetric practical gear, and the unusual underdog identities requested by Marcus. Keep different role features instead of applying one glow or diamond symbol to everyone. |

The pack manifest reports 224 to 604 triangles before modifiers, 4 to 6 materials per subject, no skeletal rigs, and only a rigid Barkwing wing preview. Those pre-modifier counts do not prove exported budgets or runtime performance. The Run 5 Barkwing report records 1,716 exported triangles, six materials, zero skins, and only two wing rotation channels, above its prior 1,200-triangle and one-material targets.

## Next bounded build slice

1. Refine the **existing Run 5 Barkwing**, not the weaker seven-pack Barkwing. Add visible branch depth from the side, uneven torn leaf membranes, and heavier talons while preserving its successful top-plane wing separation. Render identical front, side, top, angled, and phone-sized views against the current Run 5 GLB. Stop if top or phone readability regresses.
2. For the other existing candidates, prioritize one role differentiation study on the Vanguard and one rooted-body study on the Sentinel before touching all seven assets. Vanguard should gain asymmetric repaired gear and a readable shield/weapon relationship. Sentinel should gain twisted lower roots and a broad attack-arm silhouette. Keep class and boss collision server-owned.
3. Measure the exported GLB triangle, material, texture, skin, clip, and file-size counts from fresh imports. Set a phone budget from actual runtime capture before declaring the models game ready. Required actor clips remain idle, move, attack, hit, down or defeat, and revive where applicable.
4. Review neutral renders and in-game dusk-light captures at angled and top-down cameras with multiple simultaneous actors. Require the independent 95-point visual gate, desktop and physical-phone performance evidence, asset provenance, Marcus's approval, and a reversible one-slot loader with procedural fallback before promotion.

## Status

POST-006 remains **In Progress / HOLD for runtime promotion**. The work above is ready to assign, but this review supplies no new visual score or integration approval. Preserve the current procedural actors and the existing Run 5 and seven-pack files unchanged until the next measured refinement is reviewed.
