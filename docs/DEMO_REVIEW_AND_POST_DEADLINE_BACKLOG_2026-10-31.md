# Dungeon Core demo review and post-deadline backlog

Date: 2026-10-31

## Demo candidate

- Exact local revision: `d2a2de9a1f1865e7df7ee02c7bd5699002a370ce`
- Local demo: `http://localhost:3002/`
- Local health proof: 30 Hz and exact revision reported by `/healthz`
- Public demo: `https://dungeon-core-crawler.onrender.com/`
- Public revision: `e641fb033876af134d7145a331ddd469bd73d275`

The local candidate is the consolidated review build. The public build is healthy but older and must not be described as the same candidate until an approved deployment and revision check succeed.

## Confirmed in the consolidated candidate

- Server-authoritative movement, collision, damage, roles, weapon ranges, room state, and 30 Hz snapshots.
- Five-floor campaign state, Deepwood encounter, Floor Five victory, and optional stronger-cycle continuation.
- Two independent real browser clients passed shared movement, damage, boss defeat, and portal-transition checks.
- Deterministic companion corner routing around radius-expanded obstacles.
- Authored desktop and mobile controls, title artwork lane protection, attack feedback, and ranged hit traces.
- Full automated suite passed 138 of 138 on the candidate lineage.

## Owner tests required before the 7:00 p.m. cutoff

1. Join one room from the computer and one physical phone against the same reviewed build.
2. Verify movement, attack, targeting, collect, heal, revive, portal entry, orientation changes, reconnect, and HUD collapse.
3. Complete or deliberately accelerate a full campaign to confirm defeat, Floor Five victory, and optional harder-cycle choice.
4. Listen for attack, damage, pickup, portal, victory, and loss cues after browser audio unlock.
5. Record device, browser, visible defects, and whether the exact public revision matches the approved candidate after deployment.

## Held until after the competition submission

- Production GLB Wayfarers, Tree Sentinel, Barkwing, Rootlings, pillars, and five-floor environment kit.
- Barkwing attack, hit, defeat, and recovery clips plus final texture atlas and LODs.
- Ice Guardian and elemental mage-counterplay expansion.
- Finished Quest Master cinematic and complete story presentation.
- Provenance-cleared orchestral ambience, positional creature cues, and final win and loss mix.
- Public 2, 4, and 6 player performance matrix, longer soak, and wider reconnect testing.
- Portfolio redesign, Vercel preview, LinkedIn, YouTube, and post-submission media package.

These items remain in the backlog. They are not removed from the product direction. They are held because same-day integration would add untested asset loading, animation, performance, licensing, or deployment risk.

## Meshy and Blender outcome

Meshy did not produce a verified 3D asset. The legacy Smart Topology request returned `Invalid request` without spending credits. A later Agent request could not be verified because browser control timed out before job creation, approval, or balance changes could be confirmed.

Blender 5.1 did complete a deterministic Barkwing prototype and GLB export. The GLB re-imported cleanly, contains wing animation actions, and remains within a small polygon budget. It is not ready for the game because the visual jury scored the silhouette as a generic insect, the required combat clips are absent, no Three.js GLB loader or static route exists, and no desktop or phone runtime measurement has passed.

The safe plan is to ship the tested procedural Barkwing today. Continue the headless Blender workflow after submission, use Meshy only after verifying the workspace job and credit ledger, obtain Marcus's visual approval, then add the loader in an isolated branch with browser and phone performance evidence.
