# Post-release visual recovery

## Scope lock

This milestone refines the existing Wayfarer, Deepwood Sentinel, Rootling, Barkwing, and dungeon environment candidates. It does not replace them with the weaker Blender study, add a new encounter, or change authoritative movement, collision, combat, progression, or network state.

## Runtime improvements

- Wayfarers use smoother body, hood, cloak, sleeve, glove, boot, and hem geometry.
- Existing cloth surfaces reuse the authored canvas texture as restrained bump relief.
- Existing bark actors reuse their texture as bump relief, with a smoother Sentinel trunk and layered faceted canopy.
- Barkwings retain their current wing rig and now include raised branch legs and three visible talons per side.
- Floor and chamber presentation uses restrained dusk palettes, bounded fog, stone, bark, moss, and navigation-light variation.
- Existing roots gain small bark knots without new collision solids.
- Available portals gain a translucent vertical veil while retaining their top-down ground footprint.
- Lantern pulses stop when reduced motion is requested.

## Evidence

- Local gameplay recording: `docs/evidence/post-release-visual-pass-final/dungeon-core-gameplay-canvas.webm`
- Desktop combat: `docs/evidence/post-release-visual-pass-final/boss-wing-rootling-angled-1440x900.png`
- Top-down combat: `docs/evidence/post-release-visual-pass-final/boss-wing-rootling-top-down-1440x900.png`
- Phone-sized layout: `docs/evidence/post-release-visual-pass-final/boss-and-minions-angled-390x844.png`
- Protected arrival: `docs/evidence/post-release-visual-pass-final/protected-story-arrival.png`
- Capture report: `docs/evidence/post-release-visual-pass-final/report.json`

The local capture used the authoritative campaign server with Chrome and SwiftShader. It produced nine screenshots and a non-empty canvas WebM with zero browser errors. The only two warnings describe the same missing optional favicon. The report records parent commit `e8585908939873faa719881d0bad7e820f24ac5d` and renderer digest `ee4c684a20faa984371bdff063ee9c092999a9b3ea952d8390f536d031e66740`. The first exact-source recapture encountered `TRAP_ALREADY_CLEARED`; one bounded retry completed, so the campaign recorder still has a timing flake to investigate. This is local automated evidence, not physical-phone approval.

## Strict visual review

| Category | Score | Finding |
| --- | ---: | --- |
| Composition and gameplay readability | 20/25 | Angled and top-down views retain objectives, actors, and portal cues, but close melee still produces overlap. |
| Character and enemy silhouette | 17/25 | Sentinel height, Barkwing wings, and talons read more clearly. Wayfarers and Rootlings remain visibly procedural. |
| Environment cohesion | 21/25 | The darker palette and material relief are consistent, but room dressing and landmarks remain sparse. |
| Finish and production evidence | 18/25 | Automated checks and recording are reproducible. Approved rigs, full animation clips, physical-phone frame measurements, and owner review are missing. |
| **Total** | **76/100, HOLD** | The 95/100 promotion gate is not met. |

## Automated validation

- Focused character, Barkwing, and environment tests: 14/14 passed.
- Full game suite: 145/145 passed.
- JavaScript syntax check: 65 files passed.
- Room package parse: 7/7 JSON files passed.
- Preview recording script validation passed.
- `git diff --check` passed.

## Candidate handling

The Blender-generated files under `docs/design/runtime-character-pass` remain rejected technical studies. They are not imported by the game. Their README records the faceted materials, missing rigs, incomplete animation set, and absence of device proof.

The open Spline scene continues the same Barkwing candidate with torn wing edges, branch talons, restrained materials, and corrected lighting. Its final live viewport passes exposure and framing checks. The current Spline bridge does not provide an approved GLB export, rig, loader integration, or device measurement, so it remains a design study.

## Next existing tasks

1. Owner reviews the current runtime recording and the live Spline Barkwing.
2. Refine the approved existing candidate only, then export a versioned GLB with provenance.
3. Add a complete rig and idle, move, attack, hit, down, defeat, and revive clips as applicable.
4. Load one approved asset behind a reversible runtime flag.
5. Measure loading, frame time, memory, and readability on desktop and the physical phone.
6. Promote only after the independent 95/100 visual gate and owner approval pass.
