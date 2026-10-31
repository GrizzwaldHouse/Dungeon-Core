# DC004 and DC007 QA scope card

Owner: release visual QA agent. Repository: DungeonCoreCrawler-post-release-polish. Starting branch: post-release/polish-reconciliation. Starting commit: 44ea402. Preserve all current renderer, UI, weapon-profile, navigation, and server edits owned by other agents.

## Locked experience

Two independent browser clients must observe the same authoritative dungeon. Each player moves independently, attacks an enemy through a real client action, observes shared enemy state and player damage, and reaches a portal transition without mock teammates. Floor Two remains the sequential Keeper then Hexer design unless the owner explicitly changes DC004.

## Owned outputs

Only scripts/qa-2026-10-31 and reports/qa-2026-10-31 additions. No game source or deployment changes. No new gameplay or paid assets.

## Targets

Use the approved title-cover contract and Game-QA-Agent-Kit visual target board qualities for screenshots. Capture desktop1440x900, portrait390x844, landscape844x390. Headless Chrome is automation evidence; visible in-app browser plus OBS is a separate recording gate. Physical phone remains owner acceptance.

## Acceptance

- Two real browser pages with independent transports, no ProbeClient or bot as multiplayer proof.
- Inputs dispatched through browser keyboard and native UI controls.
- Compare positions, enemy state, damage, and room transition through trusted read-only server snapshots and both client DOMs.
- Default game health and speed when feasible; disclose all overrides and never conflate assisted outcome proof with default combat balance.
- Record revision and source fingerprints before/after.
- Recheck once source freezes; dirty-source run cannot pass exact-candidate release.
-95 percent visual threshold; incomplete matrix stays HOLD.

Stop on client/server errors, source ownership conflict, unexplained state divergence, or missing source identity. Log issues without silently expanding scope.
