# Dungeon Core Crawler agent instructions

These instructions apply to every agent editing this repository. The human user has asked for a recoverable Git baseline and for that discipline to continue throughout development.

## Before changing files

1. Run `git status --short --branch` and `git log -1 --oneline` from this repository root. Read `docs/GIT_WORKFLOW.md` and the relevant project instructions.
2. Identify existing user or other-agent changes. Preserve them. Coordinate file ownership before concurrent edits.
3. If `HEAD` is missing or Git is unavailable, stop repository mutations and report the blocker to the lead. Do not recreate or reset the repository.
4. State the bounded files and acceptance evidence for the work. Keep current code and documentation truth separate from future designs.

## After changing files

1. Review `git diff` and `git status --short`; run checks relevant to the changed behavior when testing is requested or part of the task.
2. Stage explicit intended paths. Never use `git add .` or `git add -A`. Inspect `git diff --cached --name-status` and `git diff --cached` before committing.
3. Exclude `node_modules`, environment files, keys, credentials, raw logs, dumps, generated assets, and live room or reconnect data. Do not print secrets while auditing.
4. Make a small local commit for each verified milestone, including the evidence or checklist update where applicable. Report the full commit hash and any remaining uncommitted work to the lead.
5. Do not push, publish, create tags, install hooks, rewrite history, amend, reset, clean, delete user files, or change remotes without a separate direct user request.

This rule maintains local recoverability. A local commit is not an off-machine backup; publication still needs a separate approved remote or archival plan.
