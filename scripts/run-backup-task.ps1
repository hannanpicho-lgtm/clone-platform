param(
  [string]$RepoDir,
  [string]$BackupDir
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoDir)) {
  throw "RepoDir is required."
}

if ([string]::IsNullOrWhiteSpace($BackupDir)) {
  throw "BackupDir is required."
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js was not found in PATH."
}

$repo = (Resolve-Path $RepoDir).Path
$backup = (Resolve-Path $BackupDir -ErrorAction SilentlyContinue)
if (-not $backup) {
  New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
  $backup = Resolve-Path $BackupDir
}

Set-Location $repo
node scripts/backup-snapshot.js --once --project-dir "$repo" --backup-dir "$($backup.Path)"
if ($LASTEXITCODE -ne 0) {
  throw "Backup command failed with exit code $LASTEXITCODE"
}
