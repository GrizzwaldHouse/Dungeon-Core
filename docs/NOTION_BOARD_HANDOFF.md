# Notion board handoff — Dungeon Core Crawler

Prepared October 24, 2026 from repository baseline `b86f07d` and integration candidate `38f245b`. The board source is [NOTION_TASK_BOARD.csv](NOTION_TASK_BOARD.csv). The source is intentionally conservative: **In Progress** records code in development; **Needs Verification** records a candidate with an unpassed acceptance gate; **Blocked** records access gaps. It does not mark any new gameplay feature shipped.

## Import into Notion

1. Sign in to the intended Notion workspace. In a new page, use **Import → CSV** and select `docs/NOTION_TASK_BOARD.csv`.
2. Convert `Status`, `Priority`, `Area`, and `Owner` to Select properties; convert `Target date` to Date. Use a board view grouped by `Status`, then a timeline or calendar view by `Target date`.
3. Keep `Acceptance`, `Current evidence`, and `User input` visible inside each card. Add comments on a card or fill `User input` with changes to story, encounter feel, visual direction, and accessibility.
4. When an agent completes work, link its exact local commit and test/browser evidence in the card before moving it to **Verified**. Refresh statuses against the current worktree; this CSV is a dated snapshot, not live synchronization.

The Notion web session opened to sign-in rather than an accessible workspace, and no callable Notion connector was exposed to this agent. Therefore the CSV has **not** been imported and there is no live Notion page yet. The opened login tab is left available for a signed-in handoff. No credentials or private room data are included in the board.
