# Matchjaw surface refinement

The existing v2 Blender source was refined into a separate v3 candidate. Three intersecting body volumes were joined, voxel remeshed, and smoothed. Jaw, mouth emitter, legs, tusks, furnace, and root animation remain separate. Body expansion animation was removed because it depended on the previously separate abdomen.

Six materials now use authored 256 px albedo, roughness, and normal textures with UV coordinates. The textures are packed in the Blender file and embedded in the GLB. They are an initial portable surface pass, not a final reference-matched texture atlas.

Outputs are in `docs/design/matchjaw-surface-v3/`: editable Blender file, GLB, texture sources, three review renders, and surface-report.json. Generated files remain outside the milestone commit under repository policy.

Blender 5.1.2 completed export and three renders. Visual inspection confirms continuous body transitions and surface grain. Armor plates remain overly rectangular, facial anatomy remains simplified, and bark forms require sculpting before art approval. No gameplay actor has been replaced. Browser, animation collision, physical phone, and runtime performance checks for v3 remain pending.

Next: sculpt irregular armor and facial forms, refine texture direction and scale, consolidate the atlas, restore a suitable body breathing animation, reduce mesh and draw calls, and inspect the resulting candidate in Three.js.
