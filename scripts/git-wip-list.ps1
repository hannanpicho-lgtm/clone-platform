param(
  [string]$RepoDir = "",
  [int]$Top = 30
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoDir)) {
  $RepoDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
} else {
  $RepoDir = (Resolve-Path $RepoDir).Path
}

Set-Location $RepoDir

$lines = & git for-each-ref --sort=-creatordate --format="%(refname:short)|%(objectname:short)|%(creatordate:iso8601)|%(subject)" "refs/autosave/wip"
if ($LASTEXITCODE -ne 0 -or -not $lines) {
  Write-Host "No git checkpoints found under refs/autosave/wip"
  exit 0
}

$lines |
  Select-Object -First $Top |
  ForEach-Object {
    $parts = $_ -split "\|", 4
    [PSCustomObject]@{
      Ref = $parts[0]
      Oid = $parts[1]
      Created = $parts[2]
      Subject = $parts[3]
    }
  }
