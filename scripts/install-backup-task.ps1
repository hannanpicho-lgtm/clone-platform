param(
  [string]$TaskName = "TankPlatformAutoBackup",
  [int]$IntervalMinutes = 10,
  [string]$BackupDir = "",
  [string]$RepoDir = ""
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js was not found in PATH. Install Node.js first."
}

if ([string]::IsNullOrWhiteSpace($RepoDir)) {
  $RepoDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
} else {
  $RepoDir = (Resolve-Path $RepoDir).Path
}

if ([string]::IsNullOrWhiteSpace($BackupDir)) {
  $BackupDir = Join-Path $HOME "Documents\TankPlatformBackups"
}

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$runnerScript = Join-Path $RepoDir "scripts\run-backup-task.ps1"
if (-not (Test-Path $runnerScript)) {
  throw "Task runner script not found: $runnerScript"
}

$taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runnerScript -RepoDir $RepoDir -BackupDir $BackupDir"

$createArgs = @(
  '/Create',
  '/F',
  '/SC', 'MINUTE',
  '/MO', "$IntervalMinutes",
  '/TN', "$TaskName",
  '/TR', "$taskCommand"
)

& schtasks @createArgs | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Failed to create scheduled task '$TaskName' (exit code $LASTEXITCODE)."
}

& schtasks /Run /TN $TaskName | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Task '$TaskName' was created but failed to start (exit code $LASTEXITCODE)."
}

Write-Host "Installed task '$TaskName' to run every $IntervalMinutes minutes."
Write-Host "Backup directory: $BackupDir"
Write-Host "Use 'schtasks /Query /TN $TaskName /V /FO LIST' to inspect status."
