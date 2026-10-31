# Notion board handoff: Dungeon Core Crawler

Prepared October 24, 2026 from repository baseline `b86f07d` and integration candidate `38f245b`. The board source is [NOTION_TASK_BOARD.csv](NOTION_TASK_BOARD.csv). The source is intentionally conservative: **In Progress** records code in development; **Needs Verification** records a candidate with an unpassed acceptance gate; **Blocked** records access gaps. It does not mark any new gameplay feature shipped.

## Import into Notion

1. Sign in to the intended Notion workspace. In a new page, use **Import → CSV** and select `docs/NOTION_TASK_BOARD.csv`.
2. Convert `Status`, `Priority`, `Area`, and `Owner` to Select properties; convert `Target date` to Date. Use a board view grouped by `Status`, then a timeline or calendar view by `Target date`.
3. Keep `Acceptance`, `Current evidence`, and `User input` visible inside each card. Add comments on a card or fill `User input` with changes to story, encounter feel, visual direction, and accessibility.
4. When an agent completes work, link its exact local commit and test/browser evidence in the card before moving it to **Verified**. Refresh statuses against the current worktree; this CSV is a dated snapshot, not live synchronization.

On October 31 the validated 42-row CSV was imported successfully into the live [Dungeon Core Crawler Release Board](https://app.notion.com/p/40a1b4945bee80e7b60ff09e26690db5?v=40a1b4945bee80a5bfbe000c40c5448c). All nine properties are present. `Area`, `Status`, and `Priority` use Select fields; `Target date` uses Date; the remaining evidence and ownership fields preserve their CSV text. Boundary rows and the unique `Meshy and Blender Barkwing production pipeline` task were visible after import. The prior import remains labeled `Dungeon Core Crawler Release Board - Draft Import` because its Notion Status mapping dropped values; it was not deleted. No credentials, room codes, reconnect data, or private player names were included.

## October 31 release cutoff

- Exact consolidated local candidate: `d2a2de9a1f1865e7df7ee02c7bd5699002a370ce`
- Local review URL: `http://localhost:3002/`
- Public Render revision: `e641fb033876af134d7145a331ddd469bd73d275`
- Feature cutoff: 7:00 p.m. Pacific for owner testing, deployment decision, and submission preparation
- Same-day Barkwing GLB integration is held because the asset and runtime loader gates are incomplete
