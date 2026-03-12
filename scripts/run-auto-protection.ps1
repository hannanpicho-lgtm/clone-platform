param(
  [string]$RepoDir = "",
  [string]$BackupDir = "",
  [int]$IntervalMinutes = 10,
  [switch]$EnableGitCheckpoint = $true
)

$ErrorActionPreference = "Continue"

if ([string]::IsNullOrWhiteSpace($RepoDir)) {
  $RepoDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
} else {
  $RepoDir = (Resolve-Path $RepoDir).Path
}

if ([string]::IsNullOrWhiteSpace($BackupDir)) {
  $BackupDir = Join-Path $HOME "Documents\TankPlatformBackups"
}

Write-Host "[protection] started: repo=$RepoDir backup=$BackupDir interval=$IntervalMinutes min"

while ($true) {
  try {
    Set-Location $RepoDir
    node scripts/backup-snapshot.js --once --project-dir "$RepoDir" --backup-dir "$BackupDir" | Out-Host
  } catch {
    Write-Host "[protection] backup error: $($_.Exception.Message)"
  }

  if ($EnableGitCheckpoint) {
    try {
      & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'git-wip-checkpoint.ps1') -RepoDir "$RepoDir" -Quiet | Out-Host
    } catch {
      Write-Host "[protection] git checkpoint error: $($_.Exception.Message)"
    }
  }

  Start-Sleep -Seconds ($IntervalMinutes * 60)
}
