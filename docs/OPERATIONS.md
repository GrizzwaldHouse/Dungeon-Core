# Local operations and bug handling

## Start and check

- `npm ci` installs the exact dependencies from `package-lock.json` on a fresh checkout.
- `npm start` starts the server after dependencies are installed.
- `npm run check` runs a JavaScript syntax check without starting a server.
- `npm test` runs the Node.js multiplayer and UI tests.
- `scripts/start.ps1` checks that Socket.IO is installed before launching.
- `powershell -ExecutionPolicy Bypass -File scripts/check.ps1` runs the same JavaScript syntax check as `npm run check`.
- Add `-RequireInstalledDependencies` to that PowerShell command to also resolve Socket.IO.
- The active package manager is npm because `package-lock.json` is committed. The `pnpm` commands in the older `docs/SESSION-HANDOFF.md` describe a past setup attempt; use the npm commands above for this checkout.

## Multiplayer incident capture

For a desync, record each client's last accepted tick/revision, the first observed divergent player transform, player count, room phase, and whether reconnect/snapshot resync corrected it. Use the multiplayer issue template. Avoid logging per-packet payloads by default.

## Error data handling

Keep local raw diagnostics under `reports/errors/`; Git ignores common raw log/dump formats there. Review and redact before attaching diagnostic files to a bug report. Never log reconnect tokens or treat the room code as harmless telemetry.
