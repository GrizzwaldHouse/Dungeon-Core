# Post-release 3D polish sprint

## Scope

Continue the existing Wayfarer, Deepwood Sentinel, Rootling, and Barkwing candidates. Do not replace them with the weaker generated pack, add new enemies, change authoritative gameplay, or promote a model without owner approval and the 95-point visual gate.

## Tool guidance applied

- Spline is used for silhouette, proportion, material, lighting, and presentation studies.
- Blender 5.1 headless is used for deterministic validation, mesh cleanup, PBR material construction, animation inventory, review renders, and GLB export.
- Vanilla Three.js remains the game runtime. No React Spline runtime or marketplace package was installed.
- MCP Market pages are treated as workflow references only until any downloadable code receives a security and license review.

## Spline Barkwing improvement

The open Spline scene continues the existing `Barkwing Flying Minion Prototype`. It was not regenerated.

Measured before and after:

| Metric | Before | After |
| --- | ---: | ---: |
| Objects | 46 | 46 |
| Polygons | 29,336 | 29,336 |
| Materials | 31 | 6 |
| One-off materials | 29 | 4 |
| Shared material assets | 2 | 3 |
| Lights | 5 | 5 |
| Shadow-casting lights | 3 | 1 |

The pass consolidated wing panels and torn edges into `Deepwood Wing Membrane`, consolidated body, veins, legs, talons, and antennae into `Deepwood Bark Body`, and added one shared restrained ember material for the eyes and core. The palette was shifted toward muted olive, slate, bark brown, and violet-gray while preserving the approved darker mood.

The last captured live view passed framing and hero visibility but failed the automated exposure gate. A later material and ambient-light correction could not be captured because the Spline live-check budget was exhausted. The scene therefore remains a design study and is not approved for export or runtime integration.

## Blender validation

Blender 5.1.2 reopened the current rejected Barkwing GLB in a clean background process.

- File size: 73,240 bytes
- Mesh objects: 35
- Vertices: 1,402
- Polygons: 704
- Animation actions: `Wing leftAction`, `Wing rightAction`
- Structural validation: passed

This only proves the file is structurally loadable. It does not reverse the existing visual rejection, prove combat animation quality, prove phone performance, or authorize runtime promotion.

## Five-hour continuation

Automation `dungeon-core-five-hour-asset-polish` is active for five hourly runs. Each run must take one current candidate through Spline study, Blender headless production checks, strict visual jury review, automated regression, and a recoverable local milestone. It may not install marketplace code, spend paid credits, add mechanics, push, merge, deploy, or replace the procedural fallback.

## Next promotion gates

1. Capture the corrected Barkwing from the same front, angled, top-down, and gameplay-size views.
2. Reach at least 95/100 with no critical silhouette, animation, readability, or performance failure.
3. Build complete hover, attack, hit, and defeat clips while preserving server timing.
4. Integrate one approved GLB behind a reversible client visual flag with the procedural fallback intact.
5. Measure desktop and physical-phone loading, frame time, memory, and combat readability.
6. Repeat the same bounded pipeline for Rootling, Deepwood Sentinel, and the four existing Wayfarers before any new asset is proposed.
