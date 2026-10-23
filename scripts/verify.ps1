$ErrorActionPreference = 'Stop'
Push-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
try {
    npm run check
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    npm test
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    npm run measure -- --duration=4 --rooms=2 --players=6
    exit $LASTEXITCODE
}
finally { Pop-Location }
