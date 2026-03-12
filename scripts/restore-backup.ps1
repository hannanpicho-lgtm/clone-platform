param(
  [string]$BackupDir = "",
  [string]$BackupId = "latest",
  [string]$TargetDir = "",
  [switch]$ApplyToWorkspace,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($BackupDir)) {
  $BackupDir = Join-Path $HOME "Documents\TankPlatformBackups"
}

if (-not (Test-Path $BackupDir)) {
  throw "Backup directory not found: $BackupDir"
}

if ([string]::IsNullOrWhiteSpace($TargetDir)) {
  $TargetDir = Join-Path (Get-Location) "_restore"
}

$backups = Get-ChildItem $BackupDir -Directory | Where-Object { $_.Name -like "backup-*" } | Sort-Object LastWriteTime -Descending
if (-not $backups -or $backups.Count -eq 0) {
  throw "No backups found in $BackupDir"
}

if ($BackupId -eq "latest") {
  $selected = $backups[0]
} else {
  $selected = $backups | Where-Object { $_.Name -eq $BackupId } | Select-Object -First 1
}

if (-not $selected) {
  throw "Backup '$BackupId' not found in $BackupDir"
}

$source = $selected.FullName

if ($ApplyToWorkspace) {
  $workspace = (Get-Location).Path
  if (-not $Force) {
    throw "Apply mode overwrites files in current workspace. Re-run with -Force if intended."
  }

  robocopy $source $workspace /E /R:1 /W:1 /NFL /NDL /NP /XD ".git" | Out-Null
  $code = $LASTEXITCODE
  if ($code -ge 8) {
    throw "Restore to workspace failed with robocopy exit code $code"
  }

  Write-Host "Applied backup '$($selected.Name)' to workspace: $workspace"
  exit 0
}

$destination = Join-Path $TargetDir $selected.Name
New-Item -ItemType Directory -Force -Path $destination | Out-Null

robocopy $source $destination /E /R:1 /W:1 /NFL /NDL /NP | Out-Null
$code = $LASTEXITCODE
if ($code -ge 8) {
  throw "Restore copy failed with robocopy exit code $code"
}

Write-Host "Restored backup '$($selected.Name)' into: $destination"
Write-Host "Inspect and copy needed files back into your workspace."
