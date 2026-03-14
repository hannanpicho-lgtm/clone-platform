#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const PROJECT_DIR = path.resolve(path.dirname(SCRIPT_FILE), '..');
const DEFAULT_BACKUP_DIR = path.resolve(os.homedir(), 'Documents', 'TankPlatformBackups');
const DEFAULT_INTERVAL_MINUTES = 10;
const DEFAULT_MAX_BACKUPS = 72;

const EXCLUDED_NAMES = new Set([
  '.git',
  'node_modules',
  '.next',
  '.cache',
  '.turbo',
  '.vite',
  'coverage',
  'tmp',
  'temp'
]);

const EXCLUDED_SUFFIXES = ['.log', '.tmp', '.cache'];

function timestampForName(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('') + '-' + [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join('');
}

function parseArgs(argv) {
  const args = {
    once: false,
    intervalMinutes: null,
    maxBackups: DEFAULT_MAX_BACKUPS,
    backupDir: DEFAULT_BACKUP_DIR,
    projectDir: PROJECT_DIR
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--once') args.once = true;
    if (token === '--backup-dir' && argv[i + 1]) {
      args.backupDir = path.resolve(argv[i + 1]);
      i += 1;
    }
    if (token === '--project-dir' && argv[i + 1]) {
      args.projectDir = path.resolve(argv[i + 1]);
      i += 1;
    }
    if (token === '--interval-minutes' && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) args.intervalMinutes = parsed;
      i += 1;
    }
    if (token === '--max-backups' && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) args.maxBackups = Math.floor(parsed);
      i += 1;
    }
  }

  if (!args.once && !args.intervalMinutes) {
    args.once = true;
  }

  if (!args.intervalMinutes && !args.once) {
    args.intervalMinutes = DEFAULT_INTERVAL_MINUTES;
  }

  return args;
}

function shouldExcludeName(name) {
  if (EXCLUDED_NAMES.has(name)) return true;
  return EXCLUDED_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyRecursive(srcDir, destDir) {
  ensureDir(destDir);
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (shouldExcludeName(entry.name)) continue;

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
      continue;
    }

    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isFile()) {
      ensureDir(path.dirname(destPath));
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function tryGitInfo(cwd) {
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd, encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf8' }).trim();
    const status = execSync('git status --short', { cwd, encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    return { commit, branch, statusCount: status.length, status };
  } catch {
    return { commit: null, branch: null, statusCount: null, status: [] };
  }
}

function pruneBackups(backupRoot, maxBackups) {
  const snapshots = fs.existsSync(backupRoot)
    ? fs.readdirSync(backupRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('backup-'))
      .map((entry) => {
        const fullPath = path.join(backupRoot, entry.name);
        const stat = fs.statSync(fullPath);
        return { name: entry.name, fullPath, mtimeMs: stat.mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
    : [];

  const stale = snapshots.slice(maxBackups);
  for (const item of stale) {
    fs.rmSync(item.fullPath, { recursive: true, force: true });
  }

  return { totalBefore: snapshots.length, removed: stale.map((s) => s.name) };
}

function writeIndex(backupRoot) {
  const snapshots = fs.readdirSync(backupRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('backup-'))
    .map((entry) => {
      const fullPath = path.join(backupRoot, entry.name);
      const stat = fs.statSync(fullPath);
      return {
        id: entry.name,
        fullPath,
        createdAt: stat.birthtime.toISOString(),
        updatedAt: stat.mtime.toISOString()
      };
    })
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  fs.writeFileSync(
    path.join(backupRoot, 'index.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), snapshots }, null, 2)}\n`,
    'utf8'
  );
}

function runBackup({ projectDir, backupDir, maxBackups }) {
  ensureDir(backupDir);

  const backupId = `backup-${timestampForName()}`;
  const targetDir = path.join(backupDir, backupId);
  const git = tryGitInfo(projectDir);

  copyRecursive(projectDir, targetDir);

  const manifest = {
    backupId,
    createdAt: new Date().toISOString(),
    projectDir,
    git,
    excludedTopLevel: Array.from(EXCLUDED_NAMES)
  };

  fs.writeFileSync(
    path.join(targetDir, 'tank-backup-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );

  const pruneResult = pruneBackups(backupDir, maxBackups);
  writeIndex(backupDir);

  return { backupId, targetDir, pruneResult };
}

function startWatch(config) {
  const minutes = config.intervalMinutes || DEFAULT_INTERVAL_MINUTES;
  const ms = minutes * 60 * 1000;

  const tick = () => {
    try {
      const result = runBackup(config);
      console.log(`[backup] created ${result.backupId} at ${result.targetDir}`);
      if (result.pruneResult.removed.length > 0) {
        console.log(`[backup] pruned: ${result.pruneResult.removed.join(', ')}`);
      }
    } catch (err) {
      console.error('[backup] failed:', err.message);
    }
  };

  tick();
  console.log(`[backup] watch mode active. Interval: ${minutes} minutes`);
  setInterval(tick, ms);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = {
    once: args.once,
    intervalMinutes: args.intervalMinutes,
    maxBackups: args.maxBackups,
    backupDir: args.backupDir,
    projectDir: args.projectDir
  };

  if (config.once) {
    const result = runBackup(config);
    console.log(`[backup] created ${result.backupId} at ${result.targetDir}`);
    if (result.pruneResult.removed.length > 0) {
      console.log(`[backup] pruned: ${result.pruneResult.removed.join(', ')}`);
    }
    return;
  }

  startWatch(config);
}

main();
