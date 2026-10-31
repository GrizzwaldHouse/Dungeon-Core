# Cross-account handoff: Dungeon Core and portfolio

Prepared October 31, 2026 on the MSI laptop. Read this file before editing either repository.

## Truth snapshot

### Dungeon Core

- Repository checkout: `C:\Users\daley\Projects\HandshakeGame_MSI\ChatGPT_MSI\DungeonCoreCrawler-post-release-polish`
- Branch: `post-release/polish-reconciliation`
- Current QA HEAD before this documentation update: `4364f63d6314a12d7f3dfd3623cd06e6cf3183a4`
- Runtime source milestone: `553b1b779648b7ee5a898bd50181eeea1e793825`
- UI combat/title milestone: `f5427168a9bc59f59862923dba9832128c2b0999`
- Navigation milestone: `9d0043553cb044fb03b91b7814cdc0875131211a`
- Current fresh suite: 138 passed, 0 failed, 0 skipped, exit 0, 37.253 seconds.
- Local two-client proof: two independent browser processes passed seven shared-state observations twice at default health 100 and speed 5, with zero browser errors. It covers separate movement, natural damage, both players attacking the same Sentinel, defeat, and shared portal transition. It does not prove a physical phone or full five-floor default campaign.
- Floor Two: the approved sequential Keeper then Hexer then minion-cleanup contract matches implementation. Focused tests passed 8 of 8.
- Current public Render page and health endpoint are HTTP 200 but serve `e641fb033876af134d7145a331ddd469bd73d275`.
- Public URL: `https://dungeon-core-crawler.onrender.com/`
- Deployment mismatch: today's local fixes are not public. Do not describe the public build as the current candidate.
- Visual release gate: HOLD. The latest strict review observed 62.5 percent on the available Deepwood desktop subset and 56.25 percent on portrait. Missing views and unverified audio remain unscored. The required threshold is 95 percent with no mandatory hold.
- OBS clips exist at `C:\Users\daley\Videos\2026-10-31 11-14-02.mp4` and `C:\Users\daley\Videos\2026-10-31 11-26-08.mp4`; playback, audio, and scene-content acceptance remain unverified.

Implemented in the local candidate:

- Server-owned role weapon profiles. Vanguard stays melee; Mage, Scout, and Healer have bounded ranged reach. Client payloads cannot forge role, damage, or range. Walls still block attacks.
- Confirmed melee weapon swings and cosmetic ranged hit traces without client-owned damage.
- Radius-clear multi-corner companion pathing around pillars with safe stationary behavior when unreachable.
- Authored SVG touch controls, weathered pillars, improved procedural Wayfarers, Deepwood branches/canopy, title/form lane correction, and direct result-panel exit.
- Existing five-floor state machine, Floor Five victory, optional harder cycle, defeat, revive, story vote, inventory, recovery, and accountless rooms remain present.

Still open:

- Exact-candidate public deployment and served-SHA verification.
- Marcus's physical computer-plus-phone test against that exact deployed SHA.
- Default-balance five-floor human campaign, healing feel, reconnect, revive, victory, defeat, portrait and landscape checks.
- 95 percent visual matrix and visible OBS outcome review.
- Barkwing, tree boss, player models, and environment remain procedural and below the approved cover target. Runtime has no GLB loader or approved production Barkwing asset. A local screenshot-derived GLB is a review candidate only.
- Expanded phone mission panel remains readable but obscures substantial scene space until collapsed.

Preserve these untracked items. Do not clean or bulk-stage them:

- `docs/design/prototypes/barkwing-reference-v2/barkwing-reference.blend1`
- `docs/design/prototypes/barkwing-reference-v2/multiview-review/`
- current evidence folders under `docs/evidence/` and `reports/qa-2026-10-31/`
- `tools/blender/render_asset_review.py`

### Portfolio

- Checkout: `C:\Users\daley\Projects\HandshakeGame_MSI\ChatGPT_MSI\portfolio-website`
- Branch: `main`
- Local HEAD: `a49cef139681cfddbe30be26e5932ed07ab2002e`
- Remote `origin/main`: `30662d64844b6600610d6ba486b07225e322a639`
- Local branch is one commit ahead. Do not pull, push, reset, rebase, or merge until the PowerSpec handoff is compared.
- Local commit `a49cef1 Add Dungeon Core portfolio preview` adds the cover, project data, approved-game entry, external embed support, Play page entry, and tests.
- Private GitHub handoff branch `handoff/msi-dungeon-core-preview` now points to `a49cef1`. It excludes the dirty lockfile and does not change production `main`.
- `package-lock.json` has uncommitted dependency-metadata churn. Its intent is unknown. Preserve it and determine which computer produced it before staging.
- The live `marcusdaley.dev` home and Play pages do not currently list Dungeon Core. The MSI commit is local-only.
- PowerSpec contains newer portfolio changes and an intended redesign. Obtain its repository path, branch, full SHA, status, changed files, tests, screenshots, and remote availability before integrating.

The existing portfolio audit is `docs/superpowers/specs/2026-04-28-portfolio-audit.md`. It scores the current design 27 of 40 and identifies the main AI-default patterns: conflicting raw hex and CSS token systems, gradient text overuse, glassmorphism overuse, duplicated CTAs, inline font stacks, and a hub that looks elaborate but is not useful enough. Preserve the distinctive Play-page arcade treatment, Cinzel/Raleway/JetBrains typography, Navy-to-game-development story, and accessible focus behavior. Redesign from an approved brief and screenshots rather than applying another generic template.

## Required execution order for the other account

1. Read repository `AGENTS.md`, this handoff, the Dungeon Core completion scope, QA reports, portfolio audit, and any PowerSpec handoff.
2. Run fresh identity checks in both repositories: literal path, branch, HEAD, status, worktrees, remotes by name, and divergence. If any expected identity differs, report `HANDOFF REGRESSION` and stop mutations.
3. Do not combine PowerSpec and MSI portfolio work until their commits and dirty files are mapped. Prepare an integration table showing identical, unique, conflicting, and obsolete paths.
4. Preserve the MSI Dungeon Core preview commit. Rebase or cherry-pick only after comparing the PowerSpec redesign base. Resolve the uncommitted lockfile by provenance, never by deletion or blanket restore.
5. Create a portfolio redesign brief for Marcus before implementation. Include visual hierarchy, personal story, typography, project-card treatment, Dungeon Core presentation, screenshots, mobile layout, and which audit anti-patterns will be removed. Keep new ideas in the next milestone unless Marcus approves a scope change.
6. Integrate Dungeon Core as a portfolio case study and playable external game only after the game deployment serves the selected candidate SHA. Until then label the public game as an earlier build or keep the launch action unpublished.
7. Run portfolio lint, unit tests, production build, and desktop/phone screenshots. Verify the Dungeon Core card, project page, Play page, external launch, cover crop, accessibility, and error behavior.
8. Prepare a Vercel preview and a side-by-side redesign review. Do not push, deploy to production, or publish without Marcus's approval.
9. Update the Notion board from `docs/NOTION_TASK_BOARD.csv`. The local CSV is authoritative because this account has no callable Notion connector. Add evidence links, commit SHAs, owners, blockers, and exact next action. Keep local browser, public host, and physical-phone evidence separate.
10. For Dungeon Core, obtain approval before any push or Render deployment. After deployment, verify `/healthz`, served SHA, HTTPS/WSS, two public clients, and Marcus's phone. Then produce a GO or HOLD report and prepared Handshake submission. Do not press Submit without approval.

GitHub status from this account: the private portfolio handoff branch succeeded. The Dungeon Core repository is public, and the candidate contains internal documentation and local-path metadata. Automatic approval review rejected that public branch push and requires Marcus to explicitly approve the exact exposure. Do not assume a game handoff branch exists remotely.

Notion status from this account: no callable Notion tools were exposed to this chat, and the in-app Notion page remained signed out. No live Notion mutation is claimed. The validated CSV remains the source for the next signed-in account.

## Prompt for the new ChatGPT account

You are the lead integrator for the final Dungeon Core release and Marcus Daley portfolio redesign. Work from the existing MSI files and Git history. Do not start a replacement project.

First read `CROSS_ACCOUNT_HANDOFF_2026-10-31.md`, both repositories' `AGENTS.md`, the Dungeon Core QA kit and reports, `docs/OCT31_COMPLETION_SCOPE.md`, `docs/NOTION_TASK_BOARD.csv`, and the portfolio audit at `docs/superpowers/specs/2026-04-28-portfolio-audit.md`. Obtain and read the PowerSpec portfolio handoff before editing the portfolio.

Preflight both repositories and every worktree. Report exact path, branch, HEAD, status, remote divergence, unique commits, dirty files, and active ownership. If the state differs from the handoff, say `HANDOFF REGRESSION` and stop edits until the difference is understood. Preserve all untracked game assets and the portfolio `package-lock.json` change. Never reset, clean, force-push, bulk-stage, or overwrite another computer's work.

Dungeon Core priorities are: reconcile the reviewed local candidate; keep ranged/melee authority and companion navigation tests green; confirm Floor Two configuration; retain the existing five-floor systems; finish exact-candidate deployment only after approval; verify public SHA; run two public clients; guide Marcus through the physical computer-plus-phone campaign; capture win/loss, audio, healing, revive, reconnect, mobile orientation, and full default-balance progression; rerun the strict 95 percent visual gate. Runtime character, tree boss, Barkwing, pillar, and environment models must follow the approved Deepwood cover direction and must not be claimed complete while still procedural placeholders. Do not integrate an unapproved GLB.

Portfolio priorities are: reconcile PowerSpec work with MSI commit `a49cef1`; preserve the Dungeon Core preview; audit the redesign instead of repeating the current AI-default layout; prepare a visual brief for Marcus; remove token conflict, excessive gradient headings, excessive glass cards, duplicate CTAs, and weak hub hierarchy; preserve the distinctive arcade Play page, typography, personal Navy story, and accessible interaction; add a truthful Dungeon Core case study and external game launch; run lint, tests, build, desktop and phone visual QA; prepare a Vercel preview for approval before production.

The private GitHub branch `handoff/msi-dungeon-core-preview` contains `a49cef1`. Production `main` remains unchanged. Verify the connected Notion tools are actually callable inside the new chat before claiming synchronization.

Update the live Notion task board if a Notion connector or signed-in browser is available. Otherwise update `docs/NOTION_TASK_BOARD.csv` and provide exact import steps. Record every task with owner, status, SHA, evidence, blocker, and next action. Do not mark local automation as phone or public proof.

Do not push, merge, deploy, change permissions, or submit externally without Marcus's approval. Before requesting approval, provide the concrete candidate SHA, test results, screenshots, rollback point, conflict report, Vercel preview or Render revision, and exact actions you want approved.

Return first with: repository reconciliation table, current release GO/HOLD, portfolio redesign brief outline, Notion update status, and the smallest safe next implementation slice.

## Evidence links

- `docs/OCT31_COMPLETION_SCOPE.md`
- `reports/qa-2026-10-31/DC004_DC007_RESULTS.md`
- `reports/qa-2026-10-31/FINAL_CAPTURE_AND_JUDGE.md`
- `reports/qa-2026-10-31/two-real-browsers-final/`
- `docs/NOTION_TASK_BOARD.csv`
- `docs/NOTION_BOARD_HANDOFF.md`
- portfolio `docs/superpowers/specs/2026-04-28-portfolio-audit.md`
