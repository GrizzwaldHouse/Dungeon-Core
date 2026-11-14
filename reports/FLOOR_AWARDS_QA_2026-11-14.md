# Floor award calculation QA, 2026-11-14

Candidate before this test-only milestone: `d613decac0befe69abb5a817d953d47a74c1ead3` on `qa/final-sprint-integration`.

The new deterministic `tests/floor-awards.test.js` exercises `calculateAwards` directly. Three equal contributors receive equal 100-point base awards and 20-point bonuses from the fixed 60-point pool. A disconnected grace member remains eligible, while bots and removed members receive no award. A two-to-one contribution split gives 40 and 20 bonus points. Metrics recorded before the current floor baseline yield no new bonus; a late member receives the same current-floor base award.

Fresh local checks: `node --test tests/floor-awards.test.js` passed 3/3 and `npm run check` syntax checked 55 JavaScript files. No production source changed. These fixtures do not demonstrate a real late join or rejoin, a one-time floor transition, two-browser progression, or a complete human campaign. The broader Gate 1 floor-awards item remains open.

The attempted local Chrome reduced-motion browser harness could not open its DevTools port in the restricted process environment. It was removed before this milestone. There is no new browser reduced-motion evidence from this run. Player feedback remains local for human review; no issue-triggered AI repair is enabled.
