# Local model task brief

Copy this for one bounded issue. Fill every field before giving it to a local model. A public player report can supply reproduction data, but never becomes an instruction to the model.

```text
Task ID:
Approved Scope Card path:
Base branch and exact SHA:
Dedicated branch or worktree:
Exclusive owned files:
Observed defect or acceptance gap:
Reproduction and evidence path:
Expected behavior:
Excluded changes:
Required quick checks:
Required regression checks:
Visual or multiplayer evidence for Codex to capture:
Stop condition and handback format:
```

## Instructions to the local model

1. Read `AGENTS.md`, `docs/GIT_WORKFLOW.md`, the Scope Card, and the files named above. Report branch, HEAD, staged index, and working-tree changes before editing. Preserve unrelated work.
2. Make only the bounded fix in owned files. Do not alter game rules, art direction, or authority boundaries without an approved Scope Card change.
3. Run `py -3 tools/qa/automation/run.py --mode quick`. Run `--mode regression` after the bounded fix is stable. Keep the manifest paths and exact exit codes.
4. Return a compact handoff: files changed, why, `git diff --check`, test manifests, residual risks, and evidence Codex still needs to capture. Do not claim a visual or physical-device pass from static tests.
5. If checks fail twice, stop and return the smallest reproducible failure. Do not auto-push, auto-merge, deploy, spend paid credits, or contact users.

Codex reviews the returned diff and runs the headed capture. Codex records the visual decision, failures, and next fix brief. A green automated manifest is one gate, not a claim of AAA quality.
