param(
  [string]$RepoDir = "",
  [int]$MaxRefs = 200,
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoDir)) {
  $RepoDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
} else {
  $RepoDir = (Resolve-Path $RepoDir).Path
}

Set-Location $RepoDir

$inside = (& git rev-parse --is-inside-work-tree 2>$null)
if ($LASTEXITCODE -ne 0 -or $inside -ne "true") {
  throw "Not inside a git repository: $RepoDir"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$branch = (& git rev-parse --abbrev-ref HEAD).Trim()
if ($LASTEXITCODE -ne 0) {
  throw "Unable to determine current branch."
}

# Creates a stash-like commit object for tracked/staged changes without modifying the working tree.
$oid = (& git stash create "autosave/$timestamp branch:$branch").Trim()
if ($LASTEXITCODE -ne 0) {
  throw "git stash create failed."
}

if ([string]::IsNullOrWhiteSpace($oid)) {
  if (-not $Quiet) {
    Write-Host "No tracked changes to checkpoint."
  }
  exit 0
}

$ref = "refs/autosave/wip/$timestamp"
& git update-ref $ref $oid
if ($LASTEXITCODE -ne 0) {
  throw "Failed to write autosave ref: $ref"
}

$refs = & git for-each-ref --sort=-creatordate --format="%(refname)" "refs/autosave/wip"
if ($LASTEXITCODE -eq 0 -and $refs) {
  $toRemove = @($refs) | Select-Object -Skip $MaxRefs
  foreach ($oldRef in $toRemove) {
    & git update-ref -d $oldRef | Out-Null
  }
}

if (-not $Quiet) {
  Write-Host "Created git checkpoint: $ref -> $oid"
}
