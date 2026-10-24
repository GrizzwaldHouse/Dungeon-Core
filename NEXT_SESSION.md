# Next executable actions

1. From this repository, read `AGENTS.md` and `docs/GIT_WORKFLOW.md`; inspect branch, HEAD, Git status, and all uncommitted diffs. Preserve the board artifacts and other agent work.
2. Run `npm run check` and the six focused client/floor test files; resolve any source or test regression.
3. With local loopback access, run `npm test`. In particular verify `tests/server.test.js` now expects floor-one to lead to REST, and add tests for rest-to-floor-two, floor-three claims, floor-four rune order, Warden clear, and cycle reset.
4. Start the exact candidate with `npm start`, open two browsers, and manually exercise the sequence from lobby through the stronger Floor 1 cycle. Capture failure screenshots, room codes only for the test session, tick metrics, and browser console errors.
5. Update `TEST_RESULTS.md` and task statuses with fresh evidence. Make a reviewed local milestone commit with explicit source, test, and document paths per the Git workflow. Do not push or publish without the user's release authorization.

Figma and Notion require sign-in before the local SVG/CSV can become cloud boards. Their import instructions are in `docs/FIGMA_DESIGN_REVIEW.md` and `docs/NOTION_BOARD_HANDOFF.md`.
