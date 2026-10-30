# Dungeon Core Layout and Portal Proof — 2026-10-30

## Stage two isolated candidate

- Worktree: `C:\Users\daley\Projects\HandshakeGame_MSI\ChatGPT_MSI\DungeonCoreCrawler-layout-qa`.
- Branch: `qa/layout-proof-stage-2`; starting revision: `1bc30fd1d18a4423782bfa58d0cb221ad18a5217`.
- Stage-two commit: recorded in the handoff after this report is committed once.
- Every stage-two screenshot was taken from this isolated worktree with `client/render.js` and `shared/dungeon-layout.js` at combined SHA-256 `f3515db6040aa4edfa85f0357bf1211869a87cc69433456bae901fcb2b034fd1`. The capture's Git HEAD was the starting revision because the reviewed change had not yet been committed. The final commit contains those same source bytes.
- Capture: `docs/evidence/layout-stage-two/capture-2026-10-30T15-37-12-556Z/`. The new capture script runs the authoritative server and headless Chrome in one process, hides the room-code and status fields in screenshots, and records no room code, reconnect token, or local IP address in its JSON report. This is local browser evidence.

### Layout delta and contract

The two entry-room root clusters moved from x=−9.5/+9.5 to x=−12/+12. Their manifest height fell from 1.9 m to 0.75 m, with the center lowered from y=0.35 to y=−0.22. The renderer replaces upright stump-like branches with a flat, dark moss patch and three thin ground-level root marks. They are scenery, carry `collider: false`, remain at least 8 m from the central approach by their manifest bounds, and add no authoritative obstacle. The portal arches, walls, spawn positions, trap timing, and server state were unchanged. Collision parity remains **entry 21/21, amber 7/7, violet 8/8**.

The new layout assertion checks a 0.35 m player sphere at x=−1.1, 0, and +1.1 over the portal approach samples z=−10, −9, −8, −7, 0, 7, 8, 9, and 10. None intersects an entry-room AABB. The decorative-root assertion checks their `collider: false` contract, their separation from the central lane, and a visible upper bound below y=0.2.

### Current-revision captures and trap sequence

The capture folder contains `desktop-angled.png`, `desktop-top-down.png`, `phone-viewport-angled.png`, and `phone-viewport-top-down.png`, plus `trap-pre-trigger-entry.png`, `trap-warning.png`, `trap-active.png`, and `trap-cleared.png`. `report.json` records connected/WebGL-ready state for all four room views, one canvas, recovery hidden, **zero browser errors**, and two favicon-only 404 warnings. No room code is visible in the reviewed images.

The trap sequence is server-backed: pre-trigger entry at tick 206 has **no trap object**; the vault trap is `TELEGRAPHED` at tick 703, `ACTIVE` at tick 747, and `CLEARED` at tick 778. The warning and active images show the raised tripwires changing from amber to red, while the cleared image shows the hazard removed. There is no separate dormant trap state in the current authoritative game, so the pre-trigger image is explicitly labelled absent. The story chapter was dismissed by the capture harness to expose the trap; the actual travel event still occurred.

### Phone visibility and lead recommendation

At 390×844, the HUD panel occupies approximately x=147..376 (229 px, 59% of screen width) and y=80..830 (750 px, 89% of screen height). The clear left scene strip is only about 147 px wide. The portal center projects behind the HUD in both angled and top-down phone captures; the left doorway post remains visible. This is a **visual hold** for phone portal readability. The lead should place essential vitals/party status in a short top band and keep a clear central scene lane in both camera modes. This worktree does not edit HUD code.

### Validation and integration boundary

- Focused layout/trap tests: **7/7 pass**.
- Five-floor progression tests: **2/2 pass**.
- `npm run check`: **50 JavaScript files syntax-checked**.
- `npm test`: **116/116 pass** when local Socket.IO loopback access is available. The first restricted run failed at transport setup, before assertions; the approved loopback rerun passed.
- `git diff --check`: pass.
- The isolated worktree used the existing checkout's installed dependencies through `NODE_PATH` after an offline install found an uncached package. No dependency manifest or lockfile was changed.

The character-visuals worktree at `dd3d7592fde74acd456c694e50e4485d8a7926f3` also changes `client/render.js`. Its observed hunks are at the file top and approximately line 670 onward, while this stage edits the environment/root region around lines 169–205. There is no observed line-range overlap, but integration must review the combined renderer and rerun browser capture after merging the two branches. Physical-phone frame rate, touch behavior, safe-area handling, and public HTTPS/WSS/deployed-SHA proof remain pending.

---

## Stage one record

## Checkout and scope

- Repository: `C:\Users\daley\Projects\HandshakeGame_MSI\ChatGPT_MSI\DungeonCoreCrawler`
- Branch: `gameplay/release-integration`
- Starting commit: `875568c209e859e4202b15ec74a674e0b68f3396`
- Ending commit: the layout-only handoff commit containing this report; its exact SHA is recorded in the handoff message after commit creation.
- The starting commit is a documentation-only release audit on top of `1063f366c06651461a0e21d813f9949b36f3e50a`, the code revision used by the visual captures below.

Only the entry room's non-colliding Deepwood root dressing and trap presentation were changed in the layout worktree. No authoritative simulation, portal rules, UI, title page, deployment, portfolio, or marketing files were changed by the layout handoff. The phone HUD edits remain lead-owned and were left intact.

## Room contract and collision proof

`node scripts/validate-layout.js` reports 35 manifest objects over `entry`, `amber-vault`, and `violet-vault`. Every `collider: true` visible box is converted to a min/max AABB and compared against the server's authoritative obstacle list, including reveal metadata. All three room comparisons passed exactly.

| Space | Visible solids | Authoritative AABBs | Bounds and notes |
|---|---:|---:|---|
| Entry | 21 | 21 | World bounds x/z −20..20; perimeter walls limit player-center travel to approximately −19.4..19.4 with the 0.35 m player radius. Player starts at (0, 0, 0). |
| Amber vault | 7 | 7 | Four shared perimeter walls, two vault arches, one altar. |
| Violet vault | 8 | 8 | Four shared perimeter walls, two spires, two dividers. |

The entry manifest's 21 solids are four perimeter walls, six pillars, the secret wall, two columns, and eight portal-frame pieces. The exact portal-frame IDs are `entry-portal-arch-west-north`, `entry-portal-arch-east-north`, `entry-portal-crown-west-north`, `entry-portal-crown-east-north`, and the corresponding four `*-south` pieces.

### Solid delta for this handoff

- Added, removed, or moved collision solids: **none**.
- Added decorative, non-colliding objects: `entry-deepwood-root-west` and `entry-deepwood-root-east`.
- Existing decorative inlays remain non-colliding: `entry-wayfinder-inlay-1` through `entry-wayfinder-inlay-4`; the secret floor marker also remains non-colliding.
- The root-clump runtime meshes are procedural cylinders; their bounds fit within their manifest extents and intentionally have no server AABB. They are presentation-only. The trap stakes, tips, wires, and warning ring are also procedural runtime geometry, not collision solids.

### Routes, portals, traps, and secrets

- Entry portal and exit portal are centered at x=0, z=−8 and z=+8. Each side has four frame pieces. At floor level the posts leave 4.35 m between their inner faces; a 0.35 m-radius player leaves 3.65 m of effective width. The upper crowns have a 3.0 m visible opening and sit above the server's floor-level player collision sphere. The portal interaction radius is 1.4 m, so a player center within 1.75 m can activate it. No frame AABB crosses the centerline approach.
- The player spawn (0,0,0) is clear of all entry AABBs. The first Sentinel test spawn around (6.3,0,0) is separated from the player start and is reached through the open arena. The root clusters sit outside the central lane.
- The secret wall AABB is x=−9.25..−8.75, z=−3..3. Its reveal volume remains x=−8.5..−6.5, z=−2..2. The roots do not cover or change that discovery boundary.
- Five-floor integration moves to the vault trap, disarms it in range, clears each required encounter, and enters every available portal. The floor-one exit is replay-safe; the full run ends with one successful final transition while a simultaneous second intent is refused.
- `tests/five-floor-integration.test.js` passes 2/2. The broader suite also covers blocked movement, remote portal rejection, destination collision replacement, stale/replayed portal intents, trap range/replay handling, collectible access, and progression through the five-floor route.
- No room is stranded by the tested route. These are automated authoritative-server results, not a human campaign playthrough.

## Tests and checks

- `node scripts/validate-layout.js` — passed; 35 objects, collider counts 21 / 7 / 8.
- `node --test tests/layout-parity.test.js tests/layout-trap-render.test.js` — passed, 6/6.
- `node --test tests/five-floor-integration.test.js` — passed, 2/2.
- `npm run check` — passed; 51 JavaScript files syntax-checked.
- `npm test` — passed, 120/120.
- `git diff --check` — passed.

The new trap-render test verifies two stakes, two feet, two lit tips, three raised wires, warning/active color changes, and mesh reuse across snapshots. The full suite ran after adding that test.

## Visual evidence

Primary captures are in `docs/evidence/layout-capture-2026-10-30T08-57-28-002Z/`:

- `desktop-angled.png` — 1440×900 angled entry scene.
- `desktop-top-down.png` — 1440×900 top-down entry scene.
- `phone-viewport-angled.png` — 390×844 phone-sized angled scene.
- `phone-viewport-top-down.png` — 390×844 phone-sized top-down scene.
- `report.json` — capture state, console/resource findings, and source commit.

All four captures report connected, one WebGL canvas, WebGL ready, and recovery UI hidden. The capture reported zero JavaScript/browser errors. The only resource warning was the optional `/favicon.ico` 404. The capture was made by local headless Chrome with SwiftShader against `http://127.0.0.1:3000/`; the report names candidate HEAD `1063f366c06651461a0e21d813f9949b36f3e50a` with the layout source files modified. That code is the parent of the starting documentation-only audit commit.

The headless capture could not be regenerated in the current session because local socket access to port 3000 is denied, even after starting the server and retrying with elevated local access. No newer screenshot is claimed. The existing captures visibly include temporary room code `MD6P`; the folder and images are **internal-only** and must be redacted or recaptured before external sharing.

The read-only visual review found no obvious static wall/frame gap in the shown frames. The angled phone image keeps the player, portal, route and party in view. In phone top-down, the HUD partly occludes the portal. The fallen-root silhouettes can read like blocking hazards although they are deliberately non-colliding. Still images do not prove collision, travel, animation timing, or touch behavior.

## Runtime geometry and remaining defects

- Runtime environment dressing is procedural Three.js geometry. Trap telegraph hardware is procedural Three.js geometry. No Blender export or generated concept asset has been integrated into the playable scene.
- New root dressing adds two groups with six low-poly meshes each. The trap adds a ring, stakes, feet, tips, and three wires when a live trap is rendered. No physical-phone GPU/performance benchmark was run.
- The trap meshes and colors are unit-tested, and server tests prove trap reachability/disarm authority. There is no captured in-world warning/active/cleared trap sequence in this handoff.
- Phone top-down portal obstruction and ambiguous non-colliding branch silhouettes remain visual defects. Recheck them on a physical phone after the UI owner integrates the responsive HUD.
- Headless browser evidence is neither physical-device acceptance nor public HTTPS/WSS/deployed-SHA acceptance.

## Ownership confirmation

The layout handoff changes only `client/render.js`, `shared/dungeon-layout.js`, `tests/layout-parity.test.js`, `tests/layout-trap-render.test.js`, this report, and the existing layout-capture evidence directory. No UI, server-state, deployment, or portfolio files were edited or staged by the layout handoff.
