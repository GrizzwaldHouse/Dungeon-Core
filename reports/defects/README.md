# Canonical defect ledger

Until a GitHub repository is connected, this directory is the source of truth for confirmed defects. Use one Markdown file per defect. Keep its status current when a fix is proposed, tested, or closed. A GitHub issue may mirror a record after publication; link both records and avoid divergent descriptions.

Every record must include:

- Status and severity (`P0` release blocker, `P1` major, `P2` minor, or `P3` cosmetic).
- First observed date, exact source revision, and any uncommitted files that affect the result.
- Expected and actual behavior, numbered reproduction steps, and reproduction rate.
- Affected room and player count, or `not applicable` for a local/tooling failure.
- Evidence link, including the command or browser used, plus owner, workaround, and fix verification.

Use fake room codes in examples. Never include real room codes, reconnect tokens, IP addresses, credentials, or unredacted logs. A reported issue is not verified until someone reproduces it on a named revision. Keep historical failures in the ledger after a fix so release review can trace them.
