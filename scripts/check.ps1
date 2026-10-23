param(
  [switch]$RequireInstalledDependencies
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
  $nodeCommand = Get-Command node -ErrorAction Stop
  & $nodeCommand.Source --check 'server/server.js'
  if ($LASTEXITCODE -ne 0) {
    throw "Node.js syntax check failed with exit code $LASTEXITCODE."
  }

  if ($RequireInstalledDependencies) {
    & $nodeCommand.Source -e "require.resolve('socket.io')"
    if ($LASTEXITCODE -ne 0) {
      throw "Socket.IO is not installed. Restore trusted registry access, then run pnpm install."
    }
  }

  Write-Host 'Server syntax check passed.'
}
finally {
  Pop-Location
}
