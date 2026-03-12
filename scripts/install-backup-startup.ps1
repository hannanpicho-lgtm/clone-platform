param(
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

$startupDir = [Environment]::GetFolderPath('Startup')
$startupCmd = Join-Path $startupDir "TankPlatformAutoBackup.cmd"
$protectorScript = Join-Path $RepoDir "scripts\run-auto-protection.ps1"

$cmdContent = @"
@echo off
cd /d "$RepoDir"
start "TankPlatformAutoBackup" /min powershell -NoProfile -ExecutionPolicy Bypass -File "$protectorScript" -RepoDir "$RepoDir" -BackupDir "$BackupDir" -IntervalMinutes $IntervalMinutes
"@

Set-Content -Path $startupCmd -Value $cmdContent -Encoding ASCII

Write-Host "Installed startup backup launcher: $startupCmd"
Write-Host "It will start backup watch at logon every session."
