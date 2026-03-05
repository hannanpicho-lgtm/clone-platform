#!/usr/bin/env node
// Auto-save script for project backup
const fs = require('fs');
const path = require('path');
const os = require('os');

// CONFIGURATION
const SOURCE_DIR = path.resolve(__dirname, '..'); // Project root
const BACKUP_DIR = path.resolve(os.homedir(), 'TankPlatformBackups');
const INTERVAL_MINUTES = 10; // Backup every 10 minutes

function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-');
}

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  if (fs.lstatSync(src).isDirectory()) {
    fs.readdirSync(src).forEach(child => {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function backupProject() {
  const backupPath = path.join(BACKUP_DIR, `backup-${getTimestamp()}`);
  copyRecursiveSync(SOURCE_DIR, backupPath);
  console.log(`Backup completed: ${backupPath}`);
}

function startAutoSave() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`Auto-save started. Backups will be saved to: ${BACKUP_DIR}`);
  backupProject();
  setInterval(backupProject, INTERVAL_MINUTES * 60 * 1000);
}

startAutoSave();
