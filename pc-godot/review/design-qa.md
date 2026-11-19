# Northern gate first review

## Task list and skills

- [x] Asset sourcing and provenance. Poly Haven Rock Boulder Dry, diffuse JPG 1K, [CC0](https://polyhaven.com/license), [source](https://polyhaven.com/a/rock_boulder_dry). Download URL https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_boulder_dry/rock_boulder_dry_diff_1k.jpg . Verified SHA-256 20F653A42FB24F42AA40641663070D578678DA49AF18CC1049DBDD4ED8679F3C. No required credit.
- [x] Blender Python modeling. Authored wedge stones, a stepped arch, chipped courses and tapered climbing roots. Graded a copy of the source texture and exported embedded GLB using Blender 5.1.2.
- [x] Godot gameplay automation. Input drives one uninterrupted approach, portal interaction, guardian windup, retreat at full health and return interaction. Five assertions passed. Existing headless outpost test reported zero failures.
- [x] Product Design QA. Compared the rendered frame beside the approved cover at 62d2c593. Darkened the stone and added the outer arch rib after the first comparison. Moved the camera capture closer. The pointed opening reads clearly; the crown still brushes the top edge. Roots look like smooth cables at gameplay distance and the flat approach lacks the reference's wet, broken stonework.
- [ ] Next art pass: fork and texture the roots, dress the approach with wet paving and test the framing across the approach. Check both lateral edges against the collision footprint.
- [ ] Independent second review and full environment score. Visual promotion pending.

## Replay

From pc-godot create build/gate-review, download the source JPG above as basalt.jpg and verify its checksum. Pass the absolute build/gate-review directory as the final argument to Blender. Use an absolute AVI output path for Godot.

    blender --background --factory-startup --python-exit-code 1 --python review/build_arch.py -- ABSOLUTE_REVIEW_DIRECTORY
    godot --path . --write-movie ABSOLUTE_OUTPUT.avi --fixed-fps 30 -s res://review/record_gate.gd

The local run used Godot 4.7.2, OpenGL on an RTX 4070 Laptop GPU, one solo client and 1280x720 at 30 fps. The clip is 267 frames. Local artifacts in build/gate-review include first-review.avi, threshold.png, comparison.png and aqueduct.glb. The candidate is loaded only by the review script. Previous source milestone: 56402fab508cc2d6dadb75ee6ade422ae192875d.
