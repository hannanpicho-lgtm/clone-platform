# Backup and Recovery (Windows)

This project now has an automatic snapshot backup pipeline that survives editor or agent restarts.

## What changed

- Backup script: `scripts/backup-snapshot.js`
- Scheduler installer: `scripts/install-backup-task.ps1`
- Backup list helper: `scripts/list-backups.ps1`
- Restore helper: `scripts/restore-backup.ps1`
- Git checkpoint save: `scripts/git-wip-checkpoint.ps1`
- Git checkpoint list: `scripts/git-wip-list.ps1`
- Git checkpoint restore: `scripts/git-wip-restore.ps1`
- Combined auto-protection loop: `scripts/run-auto-protection.ps1`
- NPM commands:
  - `npm run backup:once`
  - `npm run backup:watch`
  - `npm run backup:list`
  - `npm run backup:install-task`
  - `npm run backup:install-startup`
  - `npm run backup:restore`
  - `npm run checkpoint:save`
  - `npm run checkpoint:list`
  - `npm run checkpoint:restore`
  - `npm run protection:watch`

## Default backup location

`%USERPROFILE%\Documents\TankPlatformBackups`

Each snapshot is stored as `backup-YYYYMMDD-HHMMSS` and includes:

- project files (excluding heavy/cache dirs such as `.git`, `node_modules`)
- `tank-backup-manifest.json` with timestamp and git commit/status
- root `index.json` for quick lookup

## One-time backup now

```powershell
npm run backup:once
```

## Enable automatic recurring backups (recommended)

```powershell
npm run backup:install-task
```

This creates a Windows Scheduled Task named `TankPlatformAutoBackup` that runs every 10 minutes.

Inspect task status:

```powershell
schtasks /Query /TN TankPlatformAutoBackup /V /FO LIST
```

If task creation returns `Access is denied`, use startup fallback (no admin needed):

```powershell
npm run backup:install-startup
```

This installs `TankPlatformAutoBackup.cmd` into your Windows Startup folder and launches continuous backup watch at logon.

The startup launcher now runs both:

- snapshot backups to `%USERPROFILE%\Documents\TankPlatformBackups`
- git WIP checkpoint refs under `refs/autosave/wip`

## List available backups

```powershell
npm run backup:list
```

## Restore safely into a separate folder

```powershell
npm run backup:restore
```

This restores the latest snapshot into `_restore\backup-...` in your current working directory.

Restore a specific snapshot:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/restore-backup.ps1 -BackupId backup-20260308-050021
```

## Apply backup directly onto current workspace (overwrite)

Use only when you are sure:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/restore-backup.ps1 -ApplyToWorkspace -BackupId latest -Force
```

## Reliability notes

- If Node is unavailable in PATH, the scheduled task cannot run.
- Keep free disk space available for snapshots.
- Retention keeps the latest 72 backups by default; older snapshots are pruned automatically.

## Git WIP checkpoints (commit-level recovery)

Create a checkpoint without changing your working tree:

```powershell
npm run checkpoint:save
```

List available git checkpoints:

```powershell
npm run checkpoint:list
```

Restore latest git checkpoint onto current workspace state:

```powershell
npm run checkpoint:restore
```

Notes:

- Checkpoints are stored as refs (`refs/autosave/wip/*`) pointing to stash-like commit objects.
- This captures tracked/staged changes. Untracked files are covered by snapshot backups.
