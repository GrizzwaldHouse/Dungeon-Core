# Dungeon Core Layout and Portal Proof — 2026-10-30

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
