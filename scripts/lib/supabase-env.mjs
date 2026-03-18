#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function parseEnvFile(content) {
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function loadEnvFiles(mode) {
  const cwd = process.cwd();
  const explicitKeys = new Set(Object.keys(process.env));
  const candidates = [
    '.env',
    '.env.local',
    `.env.${mode}`,
    `.env.${mode}.local`,
  ];

  const loadedFiles = [];
  for (const relativePath of candidates) {
    const absolutePath = path.join(cwd, relativePath);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const parsed = parseEnvFile(fs.readFileSync(absolutePath, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (!explicitKeys.has(key)) {
        process.env[key] = value;
      }
    }
    loadedFiles.push(relativePath);
  }

  return loadedFiles;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) {
      return text;
    }
  }
  return '';
}

export function resolveSupabaseEnv(options = {}) {
  const {
    mode = 'test',
    requireUrl = true,
    requireAnonKey = false,
    requireServiceRoleKey = false,
    requireAdminApiKey = false,
    requireTenantId = false,
  } = options;

  const loadedFiles = loadEnvFiles(mode);

  const supabaseUrl = firstNonEmpty(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_URL);
  const supabaseAnonKey = firstNonEmpty(
    process.env.SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_KEY,
  );
  const supabaseServiceRoleKey = firstNonEmpty(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SERVICE_KEY,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  );
  const adminApiKey = firstNonEmpty(process.env.SUPABASE_ADMIN_API_KEY, process.env.ADMIN_API_KEY);
  const tenantId = firstNonEmpty(process.env.TEST_TENANT_ID, process.env.DEFAULT_TENANT_ID, 'tank');

  if (supabaseUrl) {
    process.env.SUPABASE_URL = supabaseUrl;
    process.env.VITE_SUPABASE_URL = firstNonEmpty(process.env.VITE_SUPABASE_URL, supabaseUrl);
  }
  if (supabaseAnonKey) {
    process.env.SUPABASE_ANON_KEY = supabaseAnonKey;
    process.env.VITE_SUPABASE_ANON_KEY = firstNonEmpty(process.env.VITE_SUPABASE_ANON_KEY, supabaseAnonKey);
  }
  if (supabaseServiceRoleKey) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseServiceRoleKey;
    process.env.SUPABASE_SERVICE_KEY = firstNonEmpty(process.env.SUPABASE_SERVICE_KEY, supabaseServiceRoleKey);
  }
  if (adminApiKey) {
    process.env.SUPABASE_ADMIN_API_KEY = adminApiKey;
    process.env.ADMIN_API_KEY = firstNonEmpty(process.env.ADMIN_API_KEY, adminApiKey);
  }
  if (tenantId) {
    process.env.TEST_TENANT_ID = tenantId;
  }

  const missing = [];
  if (requireUrl && !supabaseUrl) missing.push('SUPABASE_URL');
  if (requireAnonKey && !supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');
  if (requireServiceRoleKey && !supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (requireAdminApiKey && !adminApiKey) missing.push('SUPABASE_ADMIN_API_KEY');
  if (requireTenantId && !tenantId) missing.push('TEST_TENANT_ID');

  return {
    mode,
    loadedFiles,
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    adminApiKey,
    tenantId,
    missing,
  };
}

export function assertSupabaseEnv(options = {}) {
  const resolved = resolveSupabaseEnv(options);
  if (resolved.missing.length > 0) {
    const filesText = resolved.loadedFiles.length > 0 ? resolved.loadedFiles.join(', ') : 'none';
    console.error(`Missing required Supabase environment variables: ${resolved.missing.join(', ')}`);
    console.error(`Checked shell environment and env files for mode '${resolved.mode}': ${filesText}`);
    console.error('Canonical variables: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  return resolved;
}

export function buildPublicHeaders(anonKey, tenantId) {
  return {
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'x-tenant-id': tenantId,
  };
}

export function buildAuthHeaders(accessToken, anonKey, tenantId, contentType = false) {
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken}`,
    'x-tenant-id': tenantId,
  };
  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}