# MAZE-01 scope card: Aqueduct route and collision contract

Status: candidate for one milestone decision. No runtime or physical-device acceptance is claimed.

Issue: https://github.com/GrizzwaldHouse/Dungeon-Core/issues/43

## Intended change

Author three adjacent 40 m by 40 m room modules for Floor Two: an approach with a forced left or right branch, one launcher chamber with six refuge positions and an accessible cache alcove, and an encounter/recovery module. Keep the existing 0.35 m player radius and 1.25 m boulder radius used by the reviewed integration lane. The transitions are approach exit to launcher entry, then launcher exit to encounter entry. The full route is not compressed into one vault.

Owned files for this slice: `shared/aqueduct-maze-route.js`, `tests/aqueduct-maze-route.test.js`, this scope card, the production plan, and `AGENTS.md` for the separately authorized standing workflow policy. Shared runtime contracts in `shared/dungeon-layout.js`, `server/server.js`, and `client/render.js` remain integrator-owned for a later reviewed milestone.

## Acceptance evidence

- A deterministic radius-expanded path exists from each of six arrival slots to the approach exit.
- Both sides of the divider have a traversable path to the regroup point.
- The boulder's full swept envelope does not intersect any launcher solid.
- Six distinct 4 m by 4 m refuge pockets are outside the swept threat lane and are reachable from the launcher entrance by paths with 3 m centerline clearance.
- The cache is reachable from both approaches and has a route to the exit.
- Every room keeps the current 40 m by 40 m bounds, and the encounter can proceed to recovery and exit.
- Focused tests and the full existing Node suite pass at the candidate SHA. Test evidence is local geometry evidence only.

Local verification completed on 2026-11-16: five focused route tests passed; `npm run check` syntax-checked 62 JavaScript files; the full `npm test` run passed 143 of 143 tests with permitted local loopback access. An initial sandboxed full run could not connect its WebSocket clients, so it is not counted as a game failure or as a passing run. No headed game, physical phone, or public-host acceptance has been performed for this route.

## Review decision

Approve or revise the three-room sequence, branch topology, launcher lane, six refuge positions, and cache alcove before shared runtime integration. The geometry checks meet the 3 m path and 4 m refuge targets, but usable timing and party movement remain hypotheses for headed playtesting. No change to damage, trap timing, reward entitlement, enemy order, or visual direction is included in this decision.

## Integration note

This candidate branch starts from remote `gameplay/release-integration` at `b67aa7b`. The separate local integration lane at `4a314fb` has later boulder and layout commits. The integrator must reconcile those changes before using this module in a playable room. The PR is a geometry contract for review, not a claim that Floor Two now runs this route.
