# Reduced-motion scene check, 2026-11-12

Candidate: `qa/final-sprint-integration` starting at `9e517389a9a0774a1bfba2d31db9e18791b0572b`.

The renderer already held character attack and flight poses steady under `prefers-reduced-motion: reduce`, and CSS suppressed viewport shake. Its ambient frame loop still pulsed lights, traps, warning discs, and portals and spun item orbs. `client/render.js` now holds those effects steady when the preference matches. Trap and warning opacity stay visible. The loop reads the preference on each frame, so changing the setting during a session takes effect without a reload.

Fresh local evidence: `node --test tests/character-render.test.js` passed 7/7, including a fixture that checks unchanged cue properties at two times, visible trap and warning cues, and resumed ordinary motion after the preference changes. `npm run check` syntax checked 53 JavaScript files. `git diff --check` passed.

This is source and fixture evidence. A browser-level reduced-motion capture, physical-device review, and the larger visual-distinction item remain open. No player feedback or room capability was exported.
