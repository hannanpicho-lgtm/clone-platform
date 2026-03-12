#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const targetScript = path.join(scriptDir, 'backup-snapshot.js');

const child = spawn(
  process.execPath,
  [targetScript, '--interval-minutes', '10'],
  { stdio: 'inherit' }
);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
