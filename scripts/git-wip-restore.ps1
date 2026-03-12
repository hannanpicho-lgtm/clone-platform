param(
  [string]$RepoDir = "",
  [string]$Ref = "latest",
  [switch]$Index
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoDir)) {
  $RepoDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
} else {
  $RepoDir = (Resolve-Path $RepoDir).Path
}

Set-Location $RepoDir

if ($Ref -eq "latest") {
  $latest = (& git for-each-ref --sort=-creatordate --count=1 --format="%(refname)" "refs/autosave/wip").Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($latest)) {
    throw "No git checkpoints found under refs/autosave/wip"
  }
  $target = $latest
} else {
  $target = $Ref
}

$resolve = (& git rev-parse --verify $target 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($resolve)) {
  throw "Checkpoint ref not found: $target"
}

$applyArgs = @('stash', 'apply')
if ($Index) {
  $applyArgs += '--index'
}
$applyArgs += $resolve

& git @applyArgs
if ($LASTEXITCODE -ne 0) {
  throw "Failed to apply checkpoint $target ($resolve). Resolve conflicts and retry if needed."
}

Write-Host "Applied git checkpoint: $target ($resolve)"
