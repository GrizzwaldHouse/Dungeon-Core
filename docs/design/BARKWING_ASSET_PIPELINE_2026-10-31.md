# Barkwing Asset Pipeline Proof

Date: 2026-10-31

Branch: `post-release/polish-reconciliation`

## Scope Lock

This pass tests a visual asset workflow without modifying the playable game. The target is one Deepwood Barkwing flying minion because earlier visual review found that its runtime silhouette did not read as airborne.

The maximum authorized Meshy spend is 400 credits. This pass spent 0 Meshy credits.

## Visual Provenance

- Approved Dungeon Core title-cover direction.
- `docs/design/TITLE_COVER_ART_CONTRACT.md`.
- User requirement for muted bark, moss, restrained violet magic, fewer diamond motifs, and a clear flying silhouette.
- No private image was uploaded to an external service.

## Spline Proof

Spline contains a separate `Barkwing Flying Minion Prototype` with:

- branch-and-leaf wing silhouette;
- raised body and separate ground shadow;
- muted bark and moss palette;
- amber eyes and restrained magical core;
- named hierarchy suitable for continued visual iteration.

The first live capture failed the exposure gate. Lighting and background were corrected, and the final live capture passed framing and hero visibility checks.

Spline is a presentation and silhouette proof. It has not been exported into the game.

## Blender Headless Proof

Blender 5.1.2 produced the following deterministic outputs:

- `prototypes/barkwing-blender/barkwing-prototype.blend`
- `prototypes/barkwing-blender/barkwing-prototype.glb`
- `prototypes/barkwing-blender/barkwing-blender-review.png`
- `prototypes/barkwing-blender/barkwing-prototype-stats.json`

Measured asset properties:

- 22 mesh objects;
- 796 source vertices and 755 source polygons before export modifiers;
- 3,448 vertices and 1,718 polygons after GLB export modifiers;
- seven named materials;
- nine-frame wing-flap animation;
- 136,492-byte GLB export;
- 0 generation credits spent.

A separate clean Blender process re-imported the GLB successfully and found both wing animation actions. This confirms the browser-delivery file contains mesh and animation data rather than relying only on the original Blender scene.

## Acceptance Status

The workflow is proven, but the model is not approved for runtime integration. The current prototype establishes airborne readability, polygon budget, export format, materials, animation export, and headless reproducibility.

Before integration, the final asset still needs:

- a more organic branch anatomy and less insect-like body;
- improved leaf-wing shapes and visible bark segmentation;
- attack, hit, defeat, and recovery animation clips;
- final texture atlas and compression review;
- browser GLB load and frame-time measurements;
- visual approval from Marcus;
- Mixamo licensing and suitability review for humanoid Wayfarers only.

Mixamo should not be used to force a humanoid skeleton onto the Barkwing. It is better reserved for Wayfarer locomotion and combat animation candidates.
