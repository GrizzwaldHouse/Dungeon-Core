# BrightForge browser integration evidence

Checked on 2026-11-21 in America/Los_Angeles.

## Verified on MSI

- Syntax check passed for 61 JavaScript files.
- Regression suite passed 137 of 137 tests after correcting the floor-exit fixture's destination landing space for the connected host and grace member.
- Two independent Chrome browser contexts rendered WebGL at 1440 by 900, drove both players with keyboard input, observed replicated movement, rejected an out-of-range strike, observed a valid 20-point melee strike in both clients, resisted the immediate repeated strike, and rejoined the same player after reload.
- The gameplay test passed with SwiftShader and with hardware rendering through ANGLE Intel UHD Graphics on Direct3D11.
- Both BrightForge review GLBs passed transfer hash validation, import checks, browser-side SHA-256 validation and actual GLTFLoader parsing.
- Corrupted GLB delivery produced the asset failure status while the game retained its rendered WebGL scene.
- Import regression tests reject external GLB resources, malformed sizes and bad hashes, and preserve an existing import.
- The pre-change WebGL resize and context-loss/restoration baseline passed.

## Artifacts and limits

Screenshots and detailed browser reports are in a private QA directory outside Git. Live room locators are masked in screenshots. The doorway is visibly upright in the retained combat view. The chest silhouette, pivot and orientation still require art review. Both assets retain their source manifests and provenance beside the local GLBs.

The chest is an existing BrightForge-optimized asset with original generation method and source rights unestablished. Its report includes non-manifold edges and degenerate/duplicate faces. The doorway is a locally generated procedural module. Full AI environment generation was not exercised. This import integration consumes the supplied local export contract.

The rendered two-computer browser run is pending. The previously completed physical test established native game-protocol connectivity. Human gameplay and visual acceptance are pending operator review. Other engine imports are outside this Three.js validation.
