# Secret-safe diagnostics and response

This rule applies to every agent and helper working on Dungeon Core Crawler. Terminal and tool output can appear in the chat transcript and logs. Do not assume a command is safe merely because it is read-only.

## Before a diagnostic command

- Identify whether the command can print credentials from environment variables, Git URLs/configuration, credential stores, process arguments, files, or logs. If it can, change the command to emit only names, counts, booleans, or redacted summaries.
- Never run raw environment listings such as `Get-ChildItem Env:*`, `Get-ChildItem Env:GIT*`, `env`, `printenv`, or `set` in tool output. Never print `$env:...` for a credential variable.
- In PowerShell, use `Get-ChildItem Env:GIT* | Select-Object -ExpandProperty Name` when names are needed, or `[bool][Environment]::GetEnvironmentVariable('GITHUB_PERSONAL_ACCESS_TOKEN')` when only presence matters. Do not print the value or its length.
- Use `git remote` to list remote names. Inspect a remote URL only if necessary, through a command that removes any embedded credentials before output. Do not dump full Git configuration or authentication files.
- Avoid pasting a token into chat, source, `.env` examples, issue reports, screenshots, or command-line arguments. Prefer GitHub CLI browser login or a scoped GitHub App connection over a long-lived personal access token.
- Before sending a tool call, inspect the command and its possible output. If a command fails, do not blindly print entire logs; select safe error lines first.

## If a credential appears in output

1. Stop using or redisplaying the credential. Do not test whether it works.
2. Tell the owner what type of credential was exposed, where it appeared, and that it must be revoked or rotated. Never include the value or a partial value in the report.
3. Revoke the credential in its provider. Removing it from a local environment or deleting a transcript does not make an exposed credential safe again.
4. After revocation, remove obsolete local copies from the relevant credential store or environment scope without printing their values. Restart terminals or processes that inherited the old value.
5. Resume work using name-only or presence-only diagnostics. Record the remediation status without recording the old or new credential.

For a GitHub personal access token, use GitHub **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Delete** for the affected token. Create a replacement only if a token is necessary; restrict it to the intended repository, minimum permissions, and a short expiration. A browser-based `gh auth login` usually avoids a manually managed token.
