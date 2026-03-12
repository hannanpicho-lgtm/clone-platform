param(
  [string]$BackupDir = "",
  [string]$RepoDir = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoDir)) {
  $RepoDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
} else {
  $RepoDir = (Resolve-Path $RepoDir).Path
}

if ([string]::IsNullOrWhiteSpace($BackupDir)) {
  $BackupDir = Join-Path $HOME "Documents\TankPlatformBackups"
}

Set-Location $RepoDir
node scripts/backup-snapshot.js --once --project-dir "$RepoDir" --backup-dir "$BackupDir"
if ($LASTEXITCODE -ne 0) {
  throw "Backup failed with exit code $LASTEXITCODE"
}
