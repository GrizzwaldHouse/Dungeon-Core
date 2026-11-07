# Asset automation review

The local preflight now handles checks that were repeatedly consuming agent time. Run one command from the repository root:

`python tools/qa/asset_pipeline_preflight.py --run-tests --output docs/evidence/asset-pipeline-preflight.json`

## Safe to automate

- Reuse the verified Blender executable and report its current version.
- Confirm that Meshy authentication exists without reading or printing the key.
- Enforce the 1,200-credit ceiling and report consumed and remaining credits.
- Check GLB headers, hashes, file presence, preview presence, animation-frame metadata, and the named `AttackEmitter` socket.
- Run the bounded character, spider, encounter, and animation regression set.
- Record machine-readable JSON evidence for later agents and local models.
- Reject another charged attempt when the previous attempt is unresolved or already used both allowed generations.

## Keep supervised

- Approval of reference images before they leave the computer for Meshy.
- The decision to spend credits on each Meshy submission.
- Front, side, back, and gameplay-camera review of generated geometry.
- Judgment of silhouette, material fidelity, anatomy, mouth alignment, animation readability, and collision fit.
- Promotion of a Meshy or Blender candidate into the live game.
- Physical phone review and public deployment approval.

## Current review outcome

- The four new isolated references meet the intended visual direction and are ready for human approval.
- Matchjaw now has an explicit mouth below the eyes and a centered attack nozzle.
- The Blender candidates prove hierarchy, animation keys, GLB export, and attack-socket placement. Their geometry is still an engineering draft and is not approved as final art.
- Meshy submission is pending an authenticated browser or a locally configured `MESHY_API_KEY`, plus per-submission credit approval.
