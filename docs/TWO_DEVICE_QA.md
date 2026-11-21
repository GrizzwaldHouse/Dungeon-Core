# Dungeon Core two-computer multiplayer QA

Use Node 24 or later on Windows. Run from this QA checkout on both computers. The PowerSpec is the room host and the MSI is the joining peer. Each role uses a real Socket.IO connection. Both must receive the server's RUNNING snapshot with the same two connected players.

## Get the QA checkout

From an existing Handshake Dungeon-Core clone, fetch the workflow and put it in a sibling folder. Reuse that folder on later runs. Pin both role runners to the same commit. The QA branch is based on game revision 1f398c79.

```powershell
git fetch origin qa/two-device-multiplayer-workflow
git worktree add --detach ..\Dungeon-Core-multiplayer-qa FETCH_HEAD
Set-Location ..\Dungeon-Core-multiplayer-qa
git rev-parse HEAD
```

## Connect the two roles

First reuse a running PowerSpec server. If it is stopped, run `npm ci` in the QA checkout, then `node scripts/two-device-qa.js serve` in a dedicated PowerSpec terminal. This serves the browser game and the protocol on local port 3001. Stop that foreground process with Ctrl+C after testing.

If you already have an approved, working SSH connection from the MSI to the PowerSpec, use its saved alias with this command in a separate MSI terminal. Replace POWER_SPEC_PROFILE with the existing alias. The command forwards only the MSI's local port 3011 to the PowerSpec game's local port 3001, and fails if that local port is busy. Authenticate through your existing SSH method. Close the terminal when the test ends.

```powershell
ssh -o ExitOnForwardFailure=yes -o StrictHostKeyChecking=yes -N -L 127.0.0.1:3011:127.0.0.1:3001 POWER_SPEC_PROFILE
```

For this route, set `$env:DUNGEON_QA_ORIGIN = 'http://localhost:3011'` in the MSI runner terminal and `$env:DUNGEON_QA_ORIGIN = 'http://localhost:3001'` in the PowerSpec runner terminal. An already-approved private route directly to the game can supply the MSI origin instead. A remote desktop connection by itself supplies no game transport.

## Use the Tailscale connection

Connect both PCs to the same Tailscale network through their existing Tailscale installations. Confirm that each device is online and permitted by the network policy. If sign-in or device approval is requested, complete it in the Tailscale interface.

On the PowerSpec, inspect the existing Serve configuration locally and preserve any existing routes. If the HTTPS root is free, publish the game inside the Tailscale network with the following command. Complete any account-level HTTPS enablement requested by Tailscale.

```powershell
tailscale serve --bg http://127.0.0.1:3001
```

Set DUNGEON_QA_ORIGIN on the MSI to the private HTTPS origin supplied by Serve, through the local agent environment. Keep that origin out of committed files and run receipts. On the PowerSpec, the local origin can remain http://localhost:3001. Check game health and the Socket.IO handshake from the MSI. The application requires the browser origin to match the game endpoint. Use the same private HTTPS origin when opening the browser game.

Inspect and stop only this run's Serve route after testing if it was created temporarily. Preserve other services. The installed CLI's serve help describes scoped route removal.


## Run against one server

Use the existing PowerSpec game server. Give each agent DUNGEON_QA_ORIGIN in its process environment. On the PowerSpec this may be the local origin. On the MSI use the approved private route to that same server. Set DUNGEON_QA_REVISION to the expected full SHA on both computers when the server advertises its build through /healthz. The runner rejects a missing or different advertised revision when this option is set. The probes need only Node and the checked-out files.

1. On each computer choose a private directory for this run outside the repository. Set QA_RUN_DIR to its absolute path in each process environment. A private shared directory also works. Use new filenames each run.
2. Start the PowerSpec role. It creates a private, short-lived join file and waits up to three minutes for a peer. If using separate directories, transfer join.json privately to the MSI as soon as it appears.
3. Start the MSI role. Each process writes its receipt when it observes the running game. Transfer the MSI receipt to the PowerSpec run directory if needed.
4. Verify both receipts on either machine. The exit status is zero only on success. Preserve the two receipts and verifier result. Discard the temporary join file after use.

For separate directories, initialize one on each computer before starting its role:

```powershell
$env:QA_RUN_DIR = Join-Path $env:LOCALAPPDATA ('DungeonCoreQA\' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $env:QA_RUN_DIR -ErrorAction Stop | Out-Null
```

PowerSpec:

```powershell
node scripts/two-device-qa.js host "$env:QA_RUN_DIR\join.json" "$env:QA_RUN_DIR\host.json"
```

MSI:

```powershell
node scripts/two-device-qa.js peer "$env:QA_RUN_DIR\join.json" "$env:QA_RUN_DIR\peer.json"
```

Verify:

```powershell
node scripts/two-device-qa.js verify "$env:QA_RUN_DIR\host.json" "$env:QA_RUN_DIR\peer.json"
```

Each receipt uses a run-specific hash of the native computer name. Run the clients directly on the named computers and confirm placement through the two host agents. Container or VM names can differ on one physical machine. A pass covers game transport, room membership and replicated start state. To test rendering and controls, use the game's browser clients on the same private route, create a fresh room, and verify movement from each screen.

## Rehearse on one machine

Install the locked server dependencies with npm ci if needed, then run the command below. It starts an ephemeral loopback server, runs both clients, validates the observations and closes the server. Rehearsal receipts cannot pass the physical-run verifier.

```powershell
node scripts/two-device-qa.js rehearse
```

A game-health failure means the origin did not return the expected game health response. A socket-handshake failure occurs after health succeeds. A join rejection commonly follows a stale room or a different server. A missing role receipt leaves the physical result pending. Both participants use synchronized system clocks for handoff expiry.

## Install for other agent projects

The portable skill is in skills/two-device-game-qa/SKILL.md. To install for the current user's Codex agent on another PC, run the following from this checkout. The copy fails if the destination already contains a skill, so review existing versions before updating.

```powershell
$skillDir = Join-Path $env:USERPROFILE '.codex\skills\two-device-game-qa'
[System.IO.Directory]::CreateDirectory($skillDir) | Out-Null
[System.IO.File]::Copy((Resolve-Path 'skills\two-device-game-qa\SKILL.md').Path, (Join-Path $skillDir 'SKILL.md'), $false)
```

## Windows shutdown verification

On Node 24.12.0 for Windows, the original runner reached RUNNING and then aborted with UV_HANDLE_CLOSING during forced process exit. The runner now drains naturally and clears pending observation timers when a socket closes. Three consecutive local rehearsals exited 0 under Node 24.12.0 after the fix. A failed host handoff exited 1 and produced no success receipt. A local rehearsal also exited 0 under MSI Node 24.22.1. Physical MSI and PowerSpec acceptance still requires the two role receipts.
