# BrightForge game integration and browser QA

This candidate consumes the PowerSpec review export in Dungeon Core's Three.js renderer. Use the same importer and GLB/manifest bundle on the MSI and PowerSpec. The assets load when the game URL includes ?assets=brightforge. They are visual review meshes on the entry floor. The authoritative authored collision remains the gameplay geometry. Candidate models are converted from source Z up in meters to Three.js Y up, centered horizontally and placed on the floor.

## Import

Run npm ci with Node 24 or later. Use an extracted export folder containing EXPORT_CONTRACT.md, PROVENANCE.md, and one to eight asset subfolders with candidate.glb and manifest.json.

```powershell
$env:NODE_USE_SYSTEM_CA = '1'
npm ci --ignore-scripts
npm run assets:import -- C:\path\to\extracted-export
$env:QA_BRIGHTFORGE = '1'
$env:QA_HARDWARE = '1'
npm run test:browser -- C:\path\to\private-browser-evidence
```

The importer checks manifest status, file size, SHA-256, GLB framing, embedded resources and measured triangle budget before installing a complete scene atomically. A repeated import refuses to overwrite an existing candidate directory. Local assets and provenance are kept outside Git. Preserve an existing import by moving that directory to a chosen backup location before replacing it.

The renderer checks SHA-256 again before parsing. A missing or damaged review asset reports failure while the game continues rendering. The server exposes scene.json and the candidate GLBs through fixed URL patterns. Source manifests and provenance stay in the local import directory.

## PowerSpec candidate server

Fetch qa/brightforge-browser-integration into a separate sibling worktree. Import the same private export and run its tests there. For a separate candidate preview, run the following in a dedicated terminal. Port 3002 must be available.

```powershell
$env:DUNGEON_QA_PORT = '3002'
$env:GIT_COMMIT = (git rev-parse HEAD)
node scripts/two-device-qa.js serve
```

Inspect existing private Tailscale routes and use a free HTTPS port for this candidate. For port 8443, when available:

```powershell
tailscale serve --bg --https=8443 http://127.0.0.1:3002
```

Configure DUNGEON_QA_ORIGIN privately on each PC for that same server. PowerSpec can use its local loopback port 3002. MSI uses the private candidate HTTPS origin. Set DUNGEON_QA_REVISION to the full candidate commit on both roles.

## One rendered browser per PC

Use a new private directory outside Git on each machine and set QA_JOIN_FILE and QA_RECEIPT_FILE to absolute filenames there. Choose host.json on PowerSpec and peer.json on MSI. Ensure the MSI receiver can execute before creating a host ticket. The ticket is valid for three minutes.

Set QA_BROWSER_ROLE to host on PowerSpec and peer on MSI. Set QA_BRIGHTFORGE=1 and QA_HARDWARE=1 on both. QA_VISIBLE=1 opens visible Chrome. QA_KEEP_OPEN=1 keeps each successful browser session open for human review. The output directory is the first command argument.

```powershell
npm run qa:browser-device -- C:\path\to\private-browser-evidence
```

After the host writes its ticket, privately Taildrop it to MSI. Run the peer promptly. Each real browser renders the scene, moves its player through keyboard controls, observes the other player's movement, performs a melee strike, and observes both players' damage. Transfer peer.json and host.json privately and verify them with scripts/verify-browser-device.js. Additionally check both receipts have client=chrome-browser, rendering=webgl-ready, movement=local-and-remote, combat=both-players-dealt-damage and brightforge=two-models-loaded. Protocol receipts from an earlier run cannot establish these browser observations.

## Human review

For a fresh interactive session, run each browser role with QA_HUMAN_REVIEW=1 and QA_VISIBLE=1. The roles create and join a fresh room, then leave the controls to the human. They produce a ready status and await window closure. A human-review session produces no automated success receipt.

With both browser sessions open, focus the dungeon floor on each screen and use WASD or arrows. Check that the other screen shows movement. Walk close to the Sentinel and strike with Space. Confirm shared enemy health, visible hit feedback, collision at authored walls, readable chest and doorway scale, camera framing and orientation. The imported doorway and chest are visual review props and have no new authoritative collision.

Record the human's observed result and any defect in a private or sanitized report. A successful automation receipt leaves humanAcceptance=pending until the operator supplies that result. Close the review windows when finished.

## BrightForge provenance

The export contract identifies BrightForge revision bc00a9cd952878fee14ec6e4260b1a2238d055a2 and its existing forge3d generation, download, optimization, LOD and report routes. This integration uses the verified local export contract. No generation API request was submitted in this pass.

The chest has 700 triangles and derives from an existing BrightForge-optimized GLB. Its original generation model and rights are unestablished. It has reported non-manifold edges, duplicate and degenerate faces. The 60-triangle stone doorway was procedurally built from colored box meshes in BrightForge's Python environment. It is an environment blockout module. UVs, material finish, art approval, collision design and other engine imports remain review gates.
