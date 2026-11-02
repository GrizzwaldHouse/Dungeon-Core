# PowerSpec local-agent handoff

Date: November 2, 2026. This is a procedure, not a report that PowerSpec has been configured. The MSI game preview milestone is `e87423de0a167c37b81dda169f2200190ff4bd97` on `post-release/preview-polish-2026-11-01`. This branch has no verified remote upstream. The public game and the submitted Handshake link are separate from this candidate.

## MSI: review and transfer the exact candidate

1. In `C:\Users\daley\Projects\HandshakeGame_MSI\ChatGPT_MSI\DungeonCoreCrawler-post-release-polish`, inspect `git status --short --branch`, `git log -1 --format="%H %s"`, and `git diff --cached --name-status`. Confirm the game preview milestone above is in history and record the exact current HEAD with an empty staged index. Numerous untracked character studies and evidence folders are intentionally outside this commit.
2. Read `AGENTS.md`, `docs/GIT_WORKFLOW.md`, and `docs/SECRET_HANDLING.md`. Review `git show --stat --oneline HEAD` and `reports/PREVIEW_REVIEW_HANDOFF_2026-11-02.md`. Do not infer that an untracked asset is backed up by Git.
3. After Marcus approves transfer of this exact branch, run `git push -u origin post-release/preview-polish-2026-11-01`. This sends the branch, not `main`, and does not deploy it. Confirm the remote branch points to the full expected SHA. If the remote rejects the push, inspect its new tip and reconcile before retrying. Do not force push.
4. If Marcus wants any untracked art transferred, first audit provenance, license, dimensions, hashes, size, and private content. Commit an explicit approved subset in a separate milestone. Do not bulk stage generated folders.

## PowerSpec: isolate local-model work

1. In a new PowerShell window, verify `git --version`, `node --version`, `npm --version`, `opencode --version` if installed, `hermes --version` if its CLI is installed, and the local inference runtime actually present. A missing CLI does not prove the desktop app is absent.
2. Choose a new directory under your PowerSpec user profile, such as `$gameLocalRoot = Join-Path $env:USERPROFILE 'Projects\Dungeon-Core-local-agents'`. Run `gh repo clone GrizzwaldHouse/Dungeon-Core "$gameLocalRoot"`, then `git -C "$gameLocalRoot" fetch origin` and `git -C "$gameLocalRoot" switch --track origin/post-release/preview-polish-2026-11-01`. If that directory already exists, inspect it and choose a new name. Never overwrite an existing checkout.
3. Verify `git rev-parse HEAD` equals the MSI transfer SHA, `git status --short --branch` is clean, and `git show --stat --oneline HEAD` lists the intended files. Run `npm ci`, `npm run check`, and `npm test`. Label these PowerSpec results separately from the MSI results.
4. Make one branch or worktree per bounded task from this baseline, for example `local/owner-003-reconnect-observability` or `local/barkwing-art-review`. Read `AGENTS.md` in each. Assign exclusive files and have a read-only QA reviewer inspect the diff. Do not merge local model output into the preview branch without human and test review.

## One local model endpoint for two agent clients

Prefer one already installed OpenAI-compatible local server on PowerSpec. First identify its actual URL and model inventory there. Do not copy MSI model names or paths as PowerSpec facts. Keep the endpoint on loopback unless a separate network design is approved.

- If PowerSpec already uses Ollama, run `ollama list` and check `http://127.0.0.1:11434/api/tags`. Select an installed coding model that supports tool calls. OpenCode's current provider documentation describes local Ollama model discovery. Use `/models` in OpenCode to select the discovered `ollama/<actual-model-name>` entry.
- In Hermes Desktop, Settings > Providers > Local Models can manage a local llama.cpp runtime. This is a valid independent path. For the shared Ollama endpoint, use Hermes `hermes model` > Custom endpoint, URL `http://127.0.0.1:11434/v1`, and the exact installed model name. Check the actual context allocation. Current Hermes guidance requires a 64K working context for full agent workflows; a model's advertised maximum is not proof of its configured runtime context.
- If OpenCode does not discover the model, inspect the installed OpenCode version and its matching official provider documentation before editing configuration. Do not paste API tokens into repo files. If Hermes and OpenCode use separate runtimes, avoid loading two large models simultaneously until PowerSpec memory and GPU capacity are measured.
- Test with a read-only task first: ask each client to identify the checkout SHA, count test files, and explain `AGENTS.md`. Verify tool calls really execute and that no files changed. Only then allow scoped edits.

## Local-agent task contract

Give each agent the exact branch, starting SHA, owned paths, one acceptance test, and a maximum runtime. Default to read-only investigation. For an edit task, require a diff review, `npm run check`, the focused test, then `npm test` where the change touches gameplay or protocol. Require explicit-path staging and a local milestone commit. Never claim physical-phone, browser, public-host, or 95-point visual acceptance from unit tests. A local model may propose changes, but the lead reviews authority boundaries, generated assets, regressions, and any merge.

Suggested first tasks from the current board: OWNER-003 safe reconnect diagnostics in isolated client/network files; OWNER-004 measured phone load and WebGL recovery investigation; Barkwing Run 5 silhouette and budget review with no runtime promotion. Keep OWNER-009 arrival safety under the lead integrator because it touches authoritative combat and transition contracts.

## Return packet from PowerSpec

For each task, send the exact base SHA, branch, owned files, commit SHA if any, command and exit code, captured evidence paths, unresolved risks, and whether the checkout is dirty. Transfer a reviewed branch back through GitHub only after inspection. On MSI, fetch that branch into an isolated checkout for integration review. Do not pull it into a dirty shared worktree and do not treat a pushed branch as a deployed game.

## Official setup references

- OpenCode local models: https://dev.opencode.ai/v2/docs/models/
- OpenCode agent permissions: https://opencode.ai/docs/agents/
- Hermes Desktop local models: https://hermes-agent.nousresearch.com/docs/user-guide/local-models
- Hermes with Ollama: https://hermes-agent.nousresearch.com/docs/guides/local-ollama-setup
- GitHub push behavior: https://docs.github.com/en/get-started/using-git/pushing-commits-to-a-remote-repository
