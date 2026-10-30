# Visual release gate for the October 30 candidate

This is an internal art and usability gate. It is deliberately stricter than the Handshake competition's four-category score and does not predict its judges. A green test suite cannot override a failed visual gate.

## Current decision

**HOLD for visual publication.** The October 29 headless Floor One capture and the owner's iPhone 15 captures show a large gap between the approved dusk five-floor concept and the playable scene: plain blue grid, simple rectangular walls/pillars, capsule figures, little material variation or depth, and interface panels that can dominate the phone view. The user's screenshots are physical-device evidence; the desktop headless image is a local capture. Neither proves the latest unpublished commits on the public service.

## Tenfold review standard

For each of the five floors, review ten concrete items at play size on desktop, iPhone portrait, and iPhone landscape. That is 150 visual observations before a final visual pass, with stills and a short continuous recording for each floor. Score each item 0 (absent/broken), 1 (present but weak), or 2 (clear, consistent, and readable). The floor/device score must be at least 18/20; no item may score 0. A separate functional test result is recorded alongside, not substituted for these observations.

1. Distinct floor silhouette and focal point visible in the first three seconds.
2. Dusk palette and material consistency: slate/stone, weathering, muted moss/frost, restrained violet/cyan.
3. Lighting and fog create depth while preserving enemy, player, hazards, and exits.
4. Walls, ledges, pillars, and paths read as a coherent place with obvious walkable boundaries.
5. Player and companion silhouettes remain distinguishable during motion and combat.
6. Enemy silhouette, current health, incoming attack, impact, and defeat are legible before mock teammates end the fight.
7. Portal closed/open states and entry area are unmistakable; active particles do not obscure the path.
8. Trap/tripwire is visible before entry, with a distinguishable warning, active, and cleared state.
9. HUD occupies no more than necessary, never covers the player, objective, portal, or enemy, and no text/control/toast overlaps.
10. Text hierarchy, color contrast, tap targets, animation timing, audio cue, and reduced-motion alternative are consistent.

**Automatic visual failure:** clipped/overlapping text, an inaccessible control, a scene hidden by the HUD, a hazard that cannot be identified before damage, a portal that looks inactive when available, a player lost against the floor, a missing/ambiguous health change, or a floor whose look is merely a recolor of the previous floor. Review screenshots at normal phone size, not only zoomed desktop inspection.

## Tomorrow's practical sequence

1. Finish a coherent Floor One vertical slice: environment shape, material, light/fog, player and Sentinel silhouettes, health/attack, portal, trap, and compact phone HUD.
2. Apply the same visual language to the remaining floors, adding unmistakable Deepwood and Permafrost landmarks. Use the concept sheet as direction, not a claim that its exact 3D architecture exists.
3. Capture portrait, landscape, and desktop images at the same gameplay moments. Have a separate visual judge review them blind against this gate; log every 0/1 item as a defect with an owner.
4. Complete a continuous physical-phone and desktop campaign to results, including stuck-input recovery, combat, portal story, trap, reconnect, and zoom. Record console and deployed revision separately.
5. Publish the final candidate only when both functional and visual gates pass and the owner accepts the actual phone captures. Otherwise submit an honest playable prototype with its scope described accurately, if the competition rules still allow entry.

## Evidence ledger

Current visual references: `docs/evidence/headless-current-level-2026-10-29.png`, the owner's iPhone screenshots in the October 29 conversation, and `docs/design/concepts/dungeon-five-floor-layout-dusk.png`. The concept PNG is an untracked approval reference; do not stage it as a runtime asset. Attach new final-build captures with exact build SHA, browser, viewport/device, floor, camera mode, and timestamp. Record judge initials and scores per item. No visual score is entered for an unobserved final build.
