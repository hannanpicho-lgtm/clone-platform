param(
  [string]$BackupDir = "",
  [int]$Top = 20
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($BackupDir)) {
  $BackupDir = Join-Path $HOME "Documents\TankPlatformBackups"
}

if (-not (Test-Path $BackupDir)) {
  Write-Host "Backup directory not found: $BackupDir"
  exit 0
}

Get-ChildItem $BackupDir -Directory |
  Where-Object { $_.Name -like "backup-*" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First $Top Name, LastWriteTime
