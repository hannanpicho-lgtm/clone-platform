#!/usr/bin/env node
/**
 * Install git hooks from scripts/hooks/ into .git/hooks/
 * Run via: npm run setup:hooks
 */
import { copyFileSync, chmodSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const HOOKS_SRC = resolve(ROOT, 'scripts', 'hooks');
const HOOKS_DEST = resolve(ROOT, '.git', 'hooks');

if (!existsSync(HOOKS_DEST)) {
  mkdirSync(HOOKS_DEST, { recursive: true });
}

const hooks = ['pre-commit'];

for (const hook of hooks) {
  const src = resolve(HOOKS_SRC, hook);
  const dest = resolve(HOOKS_DEST, hook);

  if (!existsSync(src)) {
    console.warn(`  SKIP  ${hook} — source not found`);
    continue;
  }

  copyFileSync(src, dest);
  try { chmodSync(dest, 0o755); } catch { /* Windows doesn't need chmod */ }
  console.log(`  INSTALLED  ${hook}`);
}

console.log('');
console.log('Git hooks installed. UI integrity check will run on every commit.');
