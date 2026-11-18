# Local QA automation

Run with Python 3. These examples use the repository root; from another directory, pass the full path to `run.py`. The runner finds this checkout and a known local `socket.io` dependency. It uses only the Python standard library and the game's existing Node scripts. It does not require an API key or start a cloud model.

```powershell
py -3 tools/qa/automation/run.py --mode quick
py -3 tools/qa/automation/run.py --mode regression
py -3 tools/qa/automation/run.py --mode headed
```

The headed mode opens two separate Chrome processes. It chooses Vanguard and Mage, moves each through keyboard input, has each attack the same first-floor Sentinel, checks shared snapshots and a portal transition, and saves two canvas WebM recordings. Each run writes a new timestamped directory under `reports/qa/automation-local/`. This output is local evidence and remains untracked. Headed mode needs a desktop session and loopback access. A sandbox that blocks local WebSockets may need an approved local retry. If Chrome cannot launch, the manifest records failure. The runner does not silently switch to headless mode.

## Model handoff

Give a local model this README, the current Scope Card, and the manifest path. Ask it to run `quick` after each bounded code change and `regression` before review. It may draft a fix on its own task branch with exclusive file ownership and rerun the checks. The model must preserve failing evidence, list exact files changed, and never mark an open gate complete from a passing unit test alone. It must not push, merge, deploy, consume paid generation credits, export player reports, or modify the public game. The local model must not assign itself a new feature or silently change the acceptance criteria.

Codex runs `headed` when the assigned task changes visuals or multiplayer. Codex reviews source diffs, the manifest, screenshots, and sampled frames or full recordings. Codex owns the final evidence matrix and reports the revision, checks, browser mode, video paths, and observed defects. A local model's verdict is advisory. The manifest leaves `codex_video_review` as `PENDING` until a separate human-visible review records a decision. For a failed gate, Codex writes one bounded fix brief for the local model, including reproduction, owned files, required checks, and what evidence would close the gate. The local model returns a diff and test manifest. Codex reviews that result before another capture. Stop after two unsuccessful repair attempts and report the blocker rather than looping without supervision.

## Completion contract

For each task, require: an approved Scope Card; a dedicated branch and owned files; a reproducible defect or acceptance criterion; passing relevant automated checks; headed evidence when the task changes visuals or multiplayer; honest failures and remaining gates; and a reviewed local milestone commit with explicit paths. Physical iPhone, public deployment, and subjective visual jury judgments remain separate. The two-client capture covers only the first encounter and portal. The remaining campaign, maze, revive, device, and edge-case gates in the manifest require additional scripts and direct evidence.
