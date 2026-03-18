/**
 * Backfill withdrawal indexes.
 *
 * Reads every withdrawal:<id> record from the KV store and upserts each ID
 * into the per-user index key  withdrawals:user:<userId>  so that the new
 * listWithdrawalsByUserId() helper (which reads the index instead of scanning
 * all withdrawal keys) works correctly for pre-existing records.
 *
 * Run ONCE against production:
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_KEY=... node scripts/backfill-withdrawal-index.mjs
 *
 * Set DRY_RUN=1 to preview without writing:
 *   DRY_RUN=1 SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/backfill-withdrawal-index.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { assertSupabaseEnv } from './lib/supabase-env.mjs';

const env = assertSupabaseEnv({ mode: 'production', requireUrl: true, requireServiceRoleKey: true });
const SUPABASE_URL = env.supabaseUrl;
const SUPABASE_SERVICE_KEY = env.supabaseServiceRoleKey;
const DRY_RUN = process.env.DRY_RUN === '1';
const KV_TABLE = 'kv_store_44a642d3';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function kvGetByPrefix(prefix) {
  const { data, error } = await supabase
    .from(KV_TABLE)
    .select('key, value')
    .like('key', `${prefix}%`);
  if (error) throw new Error(`kvGetByPrefix failed: ${error.message}`);
  return data ?? [];
}

async function kvGet(key) {
  const { data, error } = await supabase
    .from(KV_TABLE)
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw new Error(`kvGet(${key}) failed: ${error.message}`);
  return data?.value ?? null;
}

async function kvSet(key, value) {
  const { error } = await supabase
    .from(KV_TABLE)
    .upsert({ key, value });
  if (error) throw new Error(`kvSet(${key}) failed: ${error.message}`);
}

async function main() {
  console.log(`\nBackfill withdrawal index  ${DRY_RUN ? '[DRY RUN]' : '[LIVE]'}\n`);

  // 1. Fetch every withdrawal:<id> record
  const rows = await kvGetByPrefix('withdrawal:');
  // Exclude per-user index rows (withdrawals:user:...)
  const withdrawalRows = rows.filter(r => /^withdrawal:[^:]+$/.test(r.key));
  console.log(`Found ${withdrawalRows.length} withdrawal records.`);

  if (withdrawalRows.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  // 2. Group withdrawal IDs by userId
  const byUser = new Map();
  let missing = 0;
  for (const { key, value } of withdrawalRows) {
    const userId = value?.userId ?? value?.user_id ?? null;
    if (!userId) {
      console.warn(`  [warn] ${key} has no userId — skipping`);
      missing++;
      continue;
    }
    if (!byUser.has(userId)) byUser.set(userId, []);
    byUser.get(userId).push(String(value?.id ?? key.replace('withdrawal:', '')));
  }

  console.log(`${byUser.size} unique users, ${missing} records skipped (no userId).\n`);

  // 3. For each user, merge new IDs into existing index
  let upserted = 0;
  let unchanged = 0;

  for (const [userId, ids] of byUser) {
    const indexKey = `withdrawals:user:${userId}`;
    const existing = await kvGet(indexKey);
    const existingIds = Array.isArray(existing) ? existing : [];
    const merged = Array.from(new Set([...existingIds, ...ids]));

    if (merged.length === existingIds.length) {
      unchanged++;
      continue;
    }

    console.log(`  ${indexKey}  ${existingIds.length} → ${merged.length} IDs`);
    if (!DRY_RUN) {
      await kvSet(indexKey, merged);
    }
    upserted++;
  }

  console.log(`\nDone.  Indexes updated: ${upserted}  Already up-to-date: ${unchanged}`);
  if (DRY_RUN) {
    console.log('(No writes were made — re-run without DRY_RUN=1 to apply)');
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
