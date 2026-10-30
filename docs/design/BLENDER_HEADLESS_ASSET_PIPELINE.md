# Blender headless asset pipeline

## Purpose

Create the Dungeon Core Crawler's visual assets one readable, reviewable unit at a time. Blender headless mode produces deterministic renders and candidate GLB files without changing the live Three.js scene. A generated or hand-authored concept sheet is a reference, not a production asset and not proof that it works on phone.

## Locked art direction

- **World:** rain-dark ruined frontier; wet slate, weathered stone, muted moss and dirty frost; gray-violet air; sparse practical amber light.
- **Magic:** restrained violet for portals and arcane clues; cyan for ice mechanics; shapes and labels supplement color.
- **Wayfarers:** Expedition Company outcasts: worn gear, asymmetrical packs/limbs/marks, readable useful tools, small Guild details, no repeated diamond motif.
- **Camera:** angled third-person as default; optional top-down is a preference, not a separate art target.
- **Avoid:** happy saturated palette, glossy gold, broad featureless blue grids, uniform capsules, generic diamonds, and concepts that hide combat readable silhouettes.

## Staged model order

1. **Wayfarer base:** hood, cloak, pack, boots, one role tool, readable silhouette at 15 metres.
2. **Tree Sentinel:** root-and-antler silhouette, bark plates, protected core, one visible root-telegraph attachment.
3. **Barkwing:** airborne wing profile, body, clear attack posture; no tiny unreadable detail.
4. **Ice Sentinel:** broad horned silhouette, layered ice/stone plates, one readable frost cone or shard source.
5. **Environment kit:** one flagstone family, one wall/arch family, portal sill/ring, pillar courses, moss/frost overlays.

Complete each item through the same gates before beginning the next. Do not generate a whole five-floor world in one pass.

## Model sheet and turnaround requirements

Every asset gets a 2048px square reference sheet before modeling. It contains front, left, back, and three-quarter views; a silhouette row; a close-up of the role tool or boss weak point; and a muted palette strip. Use plain labeling outside the art, not embedded decorative text.

| Asset | Sheet must communicate | Required game read |
| --- | --- | --- |
| Wayfarer Vanguard | shield/axe, damaged or mismatched armor, strong stance | protector distinct from mage at phone scale |
| Wayfarer Mage | crooked staff, spell satchel, asymmetrical hood, visible hand pose | fire, ward, and arcane-fracture source |
| Wayfarer Scout | bow, field map, light pack, altered gait/leg brace | ranged target and route-finder |
| Wayfarer Healer | medicine kit, charm bundle, uneven cloak or prosthesis | revive/heal source |
| Tree Sentinel | antlers, root limbs, bark core, wing/minion perch | root eruption and spore source |
| Barkwing | folded, glide, strike views | airborne attack direction |
| Ice Sentinel | horned head, layered ice plates, frost core | frost cone/charge source |
| Ice minions | shard crab, snow wisp, shield soldier silhouettes | ground, air, and defensive roles |

## Runtime budgets

These are pre-integration caps for the initial mobile candidate. Measure the actual export before promotion.

| Asset tier | Triangles | Materials | Texture memory | Bones | LODs |
| --- | ---: | ---: | ---: | ---: | ---: |
| Wayfarer | 3,500 max | 2 | 2 x 512px max | 32 max | 3 |
| Minion | 1,200 max | 1 | 1 x 256px max | 20 max | 2 |
| Guardian | 9,000 max | 3 | 3 x 1024px max | 64 max | 3 |
| Modular prop | 700 max | 1 | shared atlas only | 0 | 2 |

Use one 512px or smaller atlas for an initial Wayfarer. Bake normals only when a headless render and phone capture demonstrate a material benefit. Never use collision from render meshes: maintain server collision proxies independently and test their agreement.

## Headless command and acceptance

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' --background --python art/blender/wayfarer_portal_study.py
```

For each asset, retain a local desktop render and a 390px portrait render, then record: source script commit, Blender version, render command, GLB size, triangle count, materials, mobile screenshot, and visual verdict. Require all of these before integration:

1. The turnaround and blockout match the approved dusk direction.
2. The silhouette, damage source, and interactable cue are readable at desktop and 390px phone width.
3. The GLB opens in a glTF validator or the Three.js candidate loader without console errors.
4. The budget is met and the candidate does not drop the device frame rate below the agreed release threshold.
5. Server collision, enemy state, telegraphs, health, downed, victory, and defeat remain authoritative and are covered by tests.

The first script in `art/blender/` is an environment-and-Wayfarer blockout study. It is deliberately not automatically loaded by the game.

## First reproducible proof — 2026-10-30

`art/blender/wayfarer_portal_study.py` was run with Blender 5.1.2 in background mode. It produced an ignored 1280x720 layout render, a 390x844 portrait framing render, and a 151,664-byte GLB candidate. The script reported 436 Wayfarer triangles, 876 portal triangles, 600 flagstone triangles, and 10 materials across the combined study. Blender imported the exported GLB back successfully with 71 meshes and 10 materials.

This passes only the reproducibility, structural-export, and phone-framing checks. The portrait proof is deliberately staged so a staff-bearing Wayfarer and full portal ring are both visible at useful phone scale. It does **not** approve the blockout as final character art, a runtime replacement, an animation/rig candidate, or mobile-performance proof. The next modeled asset must demonstrate the same readable silhouette inside the actual game camera before promotion.

## Turnaround evidence — 2026-10-30

`art/blender/wayfarer_turnaround_sheet.py` renders a 2048px Mage Wayfarer blockout sheet with front, left, back, three-quarter, and silhouette-row checks. It reported 5,340 triangles because it renders eight review figures and four presentation panels; this is a sheet total, not an in-game character budget. The sheet remains an orientation and role-readability reference only. A single runtime candidate must still meet the 3,500-triangle Wayfarer cap, two-material cap, rig/LOD requirements, and real-phone test gates above.
