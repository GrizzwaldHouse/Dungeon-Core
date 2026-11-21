param(
    [Parameter(Mandatory)][string]$Repository,
    [Parameter(Mandatory)][string]$Destination,
    [Parameter(Mandatory)][ValidateSet('web','godot')][string]$Candidate,
    [switch]$CheckOnly
)
$ErrorActionPreference = 'Stop'
$targets = @{
    web = @{ Branch = 'qa/brightforge-browser-integration'; Commit = '0a60d731eb7b0d7400fe14808ebeb5e55d1d1c3e' }
    godot = @{ Branch = 'qa/godot-brightforge-review'; Commit = '94b79bb9f11aee394bdaedd472ed255c20bbc261' }
}
function Invoke-RepositoryGit {
    param([string]$Directory, [string[]]$Arguments)
    $result = & git -C $Directory @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'Repository operation failed. Check repository access and checkout state locally.' }
    return $result
}
$repositoryPath = (Resolve-Path -LiteralPath $Repository).Path
$targetPath = [IO.Path]::GetFullPath($Destination)
$selected = $targets[$Candidate]
$null = Invoke-RepositoryGit $repositoryPath @('rev-parse','--git-dir')
if (-not $CheckOnly) {
    $null = Invoke-RepositoryGit $repositoryPath @('fetch','origin',$selected.Branch)
}
$resolved = Invoke-RepositoryGit $repositoryPath @('rev-parse',($selected.Commit+'^{commit}'))
if ($resolved -ne $selected.Commit) { throw 'Pinned candidate commit is unavailable.' }
$exists = Test-Path -LiteralPath $targetPath
if ($exists) {
    $actualRoot = Invoke-RepositoryGit $targetPath @('rev-parse','--show-toplevel')
    if ([IO.Path]::GetFullPath($actualRoot).TrimEnd('\','/') -ne $targetPath.TrimEnd('\','/')) {
        throw 'Destination must be its own checkout root.'
    }
    $pending = Invoke-RepositoryGit $targetPath @('status','--porcelain')
    if ($pending) { throw 'Destination contains changes. Preserve and review them before synchronizing.' }
    $current = Invoke-RepositoryGit $targetPath @('rev-parse','HEAD')
    if ($current -ne $selected.Commit) {
        $null = Invoke-RepositoryGit $targetPath @('merge-base','--is-ancestor','HEAD',$selected.Commit)
        if (-not $CheckOnly) {
            $null = Invoke-RepositoryGit $targetPath @('merge','--ff-only',$selected.Commit)
        }
    }
} elseif (-not $CheckOnly) {
    $null = Invoke-RepositoryGit $repositoryPath @('worktree','add','--detach',$targetPath,$selected.Commit)
}
[pscustomobject]@{
    Candidate = $Candidate
    Commit = $selected.Commit
    Mode = if ($CheckOnly) { 'preflight' } else { 'synchronized' }
    ExistingCheckout = $exists
} | ConvertTo-Json -Compress
