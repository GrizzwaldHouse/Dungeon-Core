# Git recovery workflow

**Repository:** Dungeon Core Crawler  
**Owner:** Marcus Daley  
**Policy start:** 2026-10-23

## Scope

The first commit preserves the existing runnable source, dependency manifest and lockfile, tests, scripts, design and operations documents, issue template, and CI workflow. It deliberately omits installed dependencies and private/generated diagnostics. The legacy Claude Code prompt is retained as a historical document; ChatGPT Work agents follow `AGENTS.md` and `docs/PUBLISH_READINESS_AND_TEST_PLAN.md` for active work.

## Agent preflight

From the repository root, read `git status --short --branch` and `git log -1 --oneline` before edits. Preserve existing changes. Agree ownership when another agent is changing the same file. If there is no `HEAD`, ask the Git steward/lead to restore a baseline before continuing.

## Milestone recovery

After a bounded change, inspect `git diff` and `git status --short`. Stage only explicit project paths, review `git diff --cached --name-status` and the staged diff, then create a descriptive local commit. Record its full SHA and the checks or visual evidence in the task handoff. Any later uncommitted edits must be reported separately; never describe the worktree as clean without a fresh status read.

Do not commit `node_modules`, `.env` files, credentials, room codes, reconnect tokens, IP addresses, raw diagnostic logs, dumps, or generated outputs. Review new paths for sensitive data before staging. Keep `.gitignore` current, but do not rely on it as a secret scanner.

## Recovery and publication boundary

Use `git log --oneline` and `git show <sha>` to inspect prior milestones. Restore a specific file only after checking whether it contains newer user work. Avoid destructive Git commands, history rewrites, force pushes, blanket staging, and automatic hooks. No remote is configured at baseline creation, so these commits protect against accidental local edits but not disk loss. A separate approved off-machine backup and release tag are required before public launch.
