# Visual QA gate: 95 percent

The owner raised the minimum to 95 percent. This supersedes lower internal thresholds for this sprint. It is an internal acceptance threshold, not a prediction of competition judging.

## Scoring

Use the ten criteria in `reports/VISUAL_RELEASE_GATE_2026-10-29.md`, each scored 0, 1, or 2. Each floor and each viewport must score at least 19/20 (95 percent), with no zero. Do not average a failed view into a passing overall score.

Required matrix: Floors One through Five, desktop 1440x900, portrait 390x844, landscape 844x390. Deepwood is an additional encounter view. Victory and defeat each require all three viewports. Preserve visual evidence and observed defects for every score below full credit.

The ten criteria cover floor identity, palette/materials, lighting/readability, architecture/walkability, party silhouettes, combat feedback, portal states, trap states, HUD obstruction, and controls/accessibility/audio.

## Hard holds

- Emoji or placeholder controls remain in the playable interface.
- A required result screen lacks a fresh actual server-owned outcome capture.
- Controls, text, objectives, hazards, player, or exits are obscured.
- A hazard cannot be identified before damage.
- A flying minion appears grounded or lacks distinct wings and shadow.
- Public served revision differs from the tested candidate.
- Phone plus computer gameplay is untested or observed state diverges.
- Default-balance healing or survival has an unresolved owner-reported failure.

## Evidence classes

An accelerated authoritative campaign can prove state transitions and actual UI rendering. It does not prove normal combat balance or physical-phone usability. Server-owned damage fixtures can prove defeat presentation, but they are distinct from losing through natural combat. Headless screenshots do not prove OBS captured the session. A local recording does not prove a public server serves that code.

No score is assigned to unobserved content. Missing views are NOT_VERIFIED and remain a hold. A claimed 95 percent requires the full view matrix, current candidate identity, and no hard hold.
