$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
  $nodeCommand = Get-Command node -ErrorAction Stop
  & $nodeCommand.Source -e "require.resolve('socket.io')"
  if ($LASTEXITCODE -ne 0) {
    throw "Socket.IO is not installed. Run pnpm install after trusted npm registry access is configured."
  }
  & $nodeCommand.Source 'server/server.js'
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
