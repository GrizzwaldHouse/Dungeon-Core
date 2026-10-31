# Barkwing reference reconstruction

## Reference and fidelity

Source: Marcus's supplied Meshy screenshot, `codex-clipboard-445a24c2-0979-4aa7-abe1-1b6a344ce081.png`. The embedded concept is small, frontal, and has no underside or back view. This reconstruction estimates depth and surface properties; it does not establish exact material or lighting values from that image.

Outputs: `../prototypes/barkwing-reference-v2/`. Run `tools/blender/build_barkwing_reference.py` in Blender background mode to reproduce the scene.

## Geometry and hierarchy

- Root: Barkwing Reference Reconstruction.
- Body: tapered seven-sided bark trunk, angular head, overlapping bark splinters, paired forked crown, small eyes, narrow violet seams.
- Wings: independent left and right groups, tapered branch spars, seven ribs each, six torn membrane panels each, lateral veins. Thin panels have solidify modifiers.
- Talons: separate left and right groups, jointed root thighs and shins, three hooked toes each.
- Wingspan approximately 6.44 Blender units; vertical extent approximately 3.54 units. These are authored proportions, not physical dimensions measured from the screenshot.

## Lighting, environment, and camera

Neutral gray-blue studio world at strength 0.5. Soft white upper-left area key, cool rear rim, and low violet fill. This makes the silhouette inspectable without pretending the screenshot supplies a measurable physical light rig. Default perspective camera: 52 mm lens at (1.2, -11, 5.1), aimed at (0, 0, 2.7), angled slightly downward.

## Materials

Six named materials: charcoal bark, ash bark ridges, dead moss leaves, weathered olive leaves, faint violet fissures, and dull amber eyes. Bark and leaves use roughness 0.87 to 0.94 with procedural bump. Violet and amber use restrained emission. Procedural bump is visible in Blender but requires baking for equivalent glTF surface detail.

## Animation and acceptance

A thirteen-frame rigid wing preview is exported. This is not a completed skeletal rig or combat animation set. Next work: organic membrane cuts, branch curvature, texture baking, multi-view review, skeletal deformation, attack/hit/defeat clips, and real browser validation. No new jury score is claimed for this revision.

## Meshy and morning continuation

Desktop connection timed out on two fresh inventory attempts. No generated model was found in Downloads. The user screenshot shows 2,171 credits versus the previously observed 2,180, a nine-credit difference; current balance and any later conversion cost are unverified. The 1,000-credit ceiling still applies. Inspect the existing Meshy project before submitting anything else. Resume the existing conversion rather than creating a duplicate job.

The local reconstruction costs zero external generation credits. Production meshes and the submitted build were not changed. The candidate is available on `post-release/polish-reconciliation` for morning review.
