#!/usr/bin/env node
/**
 * UI Integrity Check — Production Guard
 * 
 * Prevents accidental UI regressions by verifying critical markers exist in
 * source files BEFORE a build ships. Runs in CI and as a pre-commit hook.
 *
 * If this script fails, it means a commit has removed or broken a critical
 * UI component. DO NOT bypass this check — fix the source code instead.
 *
 * To add a new guard: append an entry to the CRITICAL_MARKERS array below.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/**
 * Each marker defines:
 *   file     — path relative to project root
 *   pattern  — regex that MUST match at least `minCount` times
 *   minCount — minimum number of matches required (default 1)
 *   label    — human-readable description of what this guards
 */
const CRITICAL_MARKERS = [
  // ── Homepage Financial Card ──────────────────────────────────────
  {
    file: 'src/app/components/Dashboard.tsx',
    pattern: /#0c5b8e/,
    label: 'Homepage financial card (brand color #0c5b8e)',
  },
  {
    file: 'src/app/components/Dashboard.tsx',
    pattern: /formatUsdFigure/,
    minCount: 2,
    label: 'formatUsdFigure helper (used in financial card)',
  },
  {
    file: 'src/app/components/Dashboard.tsx',
    pattern: /todaysCommissionValue/,
    label: "Today's Commission computed value",
  },
  {
    file: 'src/app/components/Dashboard.tsx',
    pattern: /projectedTotalAccountBalanceValue/,
    label: 'Projected Total Account Balance computed value',
  },
  {
    file: 'src/app/components/Dashboard.tsx',
    pattern: /upholdAmountValue/,
    label: 'Uphold Amount computed value',
  },
  {
    file: 'src/app/components/Dashboard.tsx',
    pattern: /creditScoreOffset/,
    label: 'Credit score SVG ring offset',
  },
  {
    file: 'src/app/components/Dashboard.tsx',
    pattern: /Rocket/,
    label: 'Rocket icon import (financial card)',
  },
  {
    file: 'src/app/components/Dashboard.tsx',
    pattern: /Snowflake/,
    label: 'Snowflake icon import (freeze indicator)',
  },

  // ── Backend Persistence (Settings) ───────────────────────────────
  {
    file: 'src/app/components/Dashboard.tsx',
    pattern: /profile\/change-password/,
    label: 'Login password change API call',
  },
  {
    file: 'src/app/components/Dashboard.tsx',
    pattern: /profile\/change-withdrawal-password/,
    label: 'Withdrawal password change API call',
  },
  {
    file: 'src/app/components/Dashboard.tsx',
    pattern: /profile\/payment-details/,
    minCount: 2,
    label: 'Payment details persistence (banking + crypto)',
  },

  // ── Core Architecture ────────────────────────────────────────────
  {
    file: 'src/app/components/Dashboard.tsx',
    pattern: /bankingDetails\?\.accountName/,
    label: 'Banking details hydration on login',
  },
  {
    file: 'src/app/components/Dashboard.tsx',
    pattern: /cryptoWallet\?\.walletAddress/,
    label: 'Crypto wallet hydration on login',
  },
  {
    file: 'src/app/App.tsx',
    pattern: /useVersionCheck/,
    label: 'Version check hook (stale build detection)',
  },
  {
    file: 'public/_headers',
    pattern: /no-cache/,
    label: 'Cache-busting headers for HTML',
  },
];

// ── Run checks ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

for (const marker of CRITICAL_MARKERS) {
  const filePath = resolve(ROOT, marker.file);
  const minCount = marker.minCount ?? 1;

  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    failures.push({ label: marker.label, reason: `File not found: ${marker.file}` });
    failed++;
    console.error(`  FAIL  ${marker.label}`);
    console.error(`        File not found: ${marker.file}`);
    continue;
  }

  const matches = content.match(new RegExp(marker.pattern, 'g'));
  const count = matches ? matches.length : 0;

  if (count >= minCount) {
    passed++;
    console.log(`  PASS  ${marker.label} (${count} match${count > 1 ? 'es' : ''})`);
  } else {
    failed++;
    failures.push({
      label: marker.label,
      reason: `Expected >= ${minCount} match(es) for /${marker.pattern.source}/, found ${count}`,
    });
    console.error(`  FAIL  ${marker.label}`);
    console.error(`        Expected >= ${minCount} match(es) for /${marker.pattern.source}/, found ${count}`);
  }
}

console.log('');
console.log(`UI Integrity: ${passed} passed, ${failed} failed, ${CRITICAL_MARKERS.length} total`);

if (failed > 0) {
  console.error('');
  console.error('╔══════════════════════════════════════════════════════════════╗');
  console.error('║  UI INTEGRITY CHECK FAILED — critical UI markers missing!   ║');
  console.error('║  A commit has removed or broken a critical UI component.    ║');
  console.error('║  Review the failures above and fix before deploying.        ║');
  console.error('╚══════════════════════════════════════════════════════════════╝');
  console.error('');
  process.exit(1);
}

console.log('');
console.log('All critical UI markers verified. Safe to deploy.');
