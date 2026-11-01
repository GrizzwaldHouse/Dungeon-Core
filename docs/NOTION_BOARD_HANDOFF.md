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

## Cross-account portfolio implementation handoff

Marcus is moving the portfolio implementation to a new ChatGPT account. The next account must complete the Dungeon Core release and submission checks before beginning the website redesign.

### Verified design kit

- ZIP: `C:\Users\daley\Downloads\Marcus_Daley_Olive_Portfolio_Design_Kit.zip`
- SHA-256: `A8C4639892FEE9DAA9DCBCDF86C96690A75A76B6FA4D5861F06FEFDC7F5F7074`
- Primary reference: `reference-images/dark-olive-reference.png`
- Primary tokens: `tokens/dark-olive.css` and `tokens/theme-tokens.json`
- Direction: Olive Command Deck, recruiter-first, restrained mission-console detail
- Mid Olive is reference-only until contrast-tested and must not become a runtime theme.

### Exact Dark Olive contract

- Backgrounds: `#0B0F08`, `#11180D`, `#182012`
- Surfaces: `#1E2917`, hover `#26331D`
- Borders: `#3F4D2C`, strong `#697A3F`
- Primary: `#879B45`, hover `#9EB457`, muted `#54642B`
- Accent: `#B7C66B`
- Text: `#F3F4E8`, secondary `#C5C9B4`, muted `#929983`
- Status: success `#78A45A`, warning `#C0A85A`, error `#B85D52`
- Focus: `0 0 0 3px rgba(135,155,69,0.35)` plus a visible outline
- Radius: card `10px`, control `6px`

### Branch and ownership boundary

- Repository: `GrizzwaldHouse/portfolio-website`
- Existing raw-token lane: `feature/olive-naval-dossier-redesign`
- That lane owns `src/lib/themes.ts`.
- The new layout lane must use a separate branch such as `feature/olive-command-deck-pages`.
- Page components must use `var(--color-*)` and must not hardcode the palette.
- Preserve every project and slug from `src/data/projects.ts`.
- Build Home, Projects, Project Detail, and Interactive Lab or Play layouts from the supplied references.
- Do not push to main, merge, deploy, or publish before Marcus reviews the combined preview.

### Required implementation sequence

1. Verify the public Dungeon Core revision, physical phone behavior, desktop-plus-phone multiplayer, and Handshake form contents.
2. Prepare the form and stop before final submission for Marcus's approval.
3. Inspect current portfolio main, worktrees, feature branches, pull requests, and working-tree changes.
4. Implement the page layouts without touching the token lane's owned file.
5. Combine both reviewed commits only on a temporary integration branch.
6. Run lint, type checking, production build, tests, Playwright, accessibility, mobile, broken-link, reduced-motion, and visual-regression checks.
7. Produce desktop and mobile previews for approval.
8. After explicit approval, merge and deploy to `marcusdaley.dev`.
9. Verify the production domain and the Dungeon Core playable link after deployment.
