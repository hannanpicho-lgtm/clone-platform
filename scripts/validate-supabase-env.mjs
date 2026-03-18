#!/usr/bin/env node

import { assertSupabaseEnv } from './lib/supabase-env.mjs';

const args = new Set(process.argv.slice(2));
const modeArg = [...args].find((arg) => arg.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'local';
const requireAnonKey = !args.has('--no-require-anon-key');
const requireServiceRoleKey = !args.has('--no-require-service-role');
const requireAdminApiKey = args.has('--require-admin-api-key');
const requireTenantId = args.has('--require-tenant-id');

const resolved = assertSupabaseEnv({
  mode,
  requireUrl: true,
  requireAnonKey,
  requireServiceRoleKey,
  requireAdminApiKey,
  requireTenantId,
});

console.log('Supabase environment validation passed.');
console.log(`Mode: ${mode}`);
console.log(`Loaded env files: ${resolved.loadedFiles.length > 0 ? resolved.loadedFiles.join(', ') : 'none'}`);
console.log(`SUPABASE_URL: ${resolved.supabaseUrl ? 'set' : 'missing'}`);
console.log(`SUPABASE_ANON_KEY: ${resolved.supabaseAnonKey ? 'set' : 'missing'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${resolved.supabaseServiceRoleKey ? 'set' : 'missing'}`);
console.log(`SUPABASE_ADMIN_API_KEY: ${resolved.adminApiKey ? 'set' : 'missing'}`);
console.log(`TEST_TENANT_ID: ${resolved.tenantId ? resolved.tenantId : 'missing'}`);