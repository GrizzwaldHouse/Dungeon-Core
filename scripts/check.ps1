param(
  [switch]$RequireInstalledDependencies
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
  $npmCommand = Get-Command npm.cmd -ErrorAction Stop
  & $npmCommand.Source run check
  if ($LASTEXITCODE -ne 0) {
    throw "JavaScript syntax check failed with exit code $LASTEXITCODE."
  }

  if ($RequireInstalledDependencies) {
    $nodeCommand = Get-Command node -ErrorAction Stop
    & $nodeCommand.Source -e "require.resolve('socket.io')"
    if ($LASTEXITCODE -ne 0) {
      throw "Socket.IO is not installed. Restore trusted registry access, then run npm ci."
    }
  }

  Write-Host 'JavaScript syntax check passed.'
}
finally {
  Pop-Location
}
