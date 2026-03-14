/**
 * One-time migration: convert console.error route-handler catch blocks
 * to structured logServerEvent calls.  Run once, then delete this file.
 *
 *   node scripts/migrate-logging.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, '../supabase/functions/server/index.tsx');

const content = readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// Lines (1-indexed) that must NOT be touched:
//   120,123,145,149,164,167,186 → verifyJWT / getServiceClient helpers (plain-string calls)
//   1097                        → console.error(serialized) inside logServerEvent itself
const SKIP = new Set([120, 123, 145, 149, 164, 167, 186, 1097]);

const slug = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

let changed = 0;

const migrated = lines.map((line, i) => {
  const lineNum = i + 1;
  if (SKIP.has(lineNum)) return line;

  const t = line.trim();
  if (!t.startsWith('console.error(')) return line;

  const indent = line.match(/^(\s*)/)[1];
  let m;

  // ── Special: Cleanup failed for user ${userId}: ${error}
  if (t.includes('Cleanup failed for user') && t.includes('${userId}')) {
    changed++;
    return `${indent}logServerEvent('error', 'cleanup_user.failed', { userId: String(userId), error: String(error) });`;
  }

  // ── Special: Email send failed with response.statusText
  if (t.includes('Email send failed:') && t.includes('response.statusText')) {
    changed++;
    return `${indent}logServerEvent('error', 'email.send.failed', { status: String(response.statusText) });`;
  }

  // ── Auth warn: Authorization error while X: ${error}
  m = t.match(/^console\.error\(`Authorization error while (.+?): \$\{(error(?:\.message)?)\}`\);$/);
  if (m) {
    changed++;
    return `${indent}logServerEvent('warn', '${slug(m[1])}.auth.failed', { error: String(${m[2]}) });`;
  }

  // ── Error during X: ${error.message}
  m = t.match(/^console\.error\(`Error during (.+?): \$\{(error(?:\.message)?)\}`\);$/);
  if (m) {
    changed++;
    return `${indent}logServerEvent('error', '${slug(m[1])}.failed', { error: String(${m[2]}) });`;
  }

  // ── Error X: ${error}  (most common)
  m = t.match(/^console\.error\(`Error (.+?): \$\{(error(?:\.message)?)\}`\);$/);
  if (m) {
    changed++;
    return `${indent}logServerEvent('error', '${slug(m[1])}.failed', { error: String(${m[2]}) });`;
  }

  // ── X error: ${error}  (e.g. "Signin error", "Admin signin error")
  m = t.match(/^console\.error\(`(.+?) error: \$\{(error(?:\.message)?)\}`\);$/);
  if (m) {
    changed++;
    return `${indent}logServerEvent('error', '${slug(m[1])}.failed', { error: String(${m[2]}) });`;
  }

  // Unmatched console.error — leave as-is and warn
  console.warn(`  [skip] line ${lineNum}: ${t.slice(0, 100)}`);
  return line;
});

writeFileSync(filePath, migrated.join('\n'));
console.log(`\nDone — ${changed} lines migrated.\n`);
