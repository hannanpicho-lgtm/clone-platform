#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const serverFile = path.join(repoRoot, 'supabase', 'functions', 'server', 'index.tsx');

const getEnv = (...keys) => {
  for (const key of keys) {
    const value = String(process.env[key] || '').trim();
    if (value) return value;
  }
  return '';
};

const SUPABASE_URL = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_KEY');
const FUNCTION_NAME = process.env.FUNCTION_NAME || 'make-server-44a642d3';
const SUPABASE_ADMIN_API_KEY = process.env.SUPABASE_ADMIN_API_KEY || process.env.ADMIN_API_KEY || '';
const REQUEST_TIMEOUT_MS = Math.max(3000, Number(process.env.SWEEP_TIMEOUT_MS || 15000));
const REQUIRE_AUTH_BOOTSTRAP = String(process.env.SWEEP_REQUIRE_AUTH_BOOTSTRAP || 'true').toLowerCase() !== 'false';
const FUNCTION_URL = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/${FUNCTION_NAME}`;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL (or VITE_SUPABASE_URL)');
  if (!SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY / VITE_SUPABASE_KEY)');
  console.error(`Missing required env var(s): ${missing.join(', ')}`);
  console.error('PowerShell example:');
  console.error('$env:SUPABASE_URL="https://<project>.supabase.co"; $env:SUPABASE_ANON_KEY="<anon-key>"; npm run test:api:sweep');
  process.exit(1);
}

const publicRoutes = new Set([
  '/health',
  '/products',
  '/signup',
  '/signin',
  '/admin/signin',
  '/contact-links',
  '/deposit-config',
  '/faq',
  '/faq/search',
]);

const parseRoutes = () => {
  const source = fs.readFileSync(serverFile, 'utf8');
  const routeRegex = /app\.(get|post|put|delete|patch)\((['"])(.*?)\2/g;
  const discovered = [];
  let match;

  while ((match = routeRegex.exec(source)) !== null) {
    const method = match[1].toUpperCase();
    const route = match[3];
    if (!route || route === '*') continue;
    discovered.push({ method, route });
  }

  const unique = new Map();
  for (const item of discovered) {
    unique.set(`${item.method} ${item.route}`, item);
  }

  return Array.from(unique.values());
};

const withTimeoutFetch = async (url, options) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const buildHeaders = ({ token, adminKey } = {}) => {
  const headers = {
    'content-type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
  };

  if (adminKey) {
    headers.authorization = `Bearer ${adminKey}`;
  } else if (token) {
    headers.authorization = `Bearer ${token}`;
  } else {
    headers.authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  }

  return headers;
};

const buildBodyForRoute = (method, route, ctx) => {
  if (!['POST', 'PUT', 'PATCH'].includes(method)) {
    return undefined;
  }

  const now = Date.now();
  const username = `sweep_${now}`;
  const email = `${username}@tank.local`;

  if (route === '/signup') {
    return {
      email,
      username,
      password: 'SweepPassword123!',
      name: 'Sweep User',
      withdrawalPassword: 'Withdraw123!',
      gender: 'male',
    };
  }

  if (route === '/signin') {
    return {
      username: ctx?.bootstrapUsername || username,
      password: 'SweepPassword123!',
    };
  }

  if (route === '/admin/signin') {
    return {
      username: 'admin',
      password: 'invalid-password',
    };
  }

  if (route === '/vip-tier') {
    return { vipTier: 'VIP3' };
  }

  return {};
};

const materializeRoute = (route, ctx) => {
  return route.replace(/:([A-Za-z0-9_]+)/g, (_m, paramName) => {
    const key = String(paramName || '').toLowerCase();

    if (key === 'userid') {
      return ctx?.userId || 'test-user-id';
    }
    if (key === 'withdrawalid') {
      return `${ctx?.userId || 'test-user-id'}-test`;
    }
    if (key.includes('id')) {
      return 'test-id';
    }

    return 'test-value';
  });
};

const createUserSession = async () => {
  const now = Date.now();
  const username = `sweep_user_${now}`;
  const email = `${username}@tank.local`;
  const password = 'SweepPassword123!';

  const signupResponse = await withTimeoutFetch(`${FUNCTION_URL}/signup`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      email,
      username,
      password,
      name: 'Sweep User',
      withdrawalPassword: 'Withdraw123!',
      gender: 'male',
    }),
  });

  const signupData = await signupResponse.json().catch(() => ({}));
  if (Number(signupResponse.status || 0) >= 400) {
    return {
      token: null,
      userId: null,
      bootstrapUsername: username,
      bootstrapError: `signup failed with ${signupResponse.status}: ${String(signupData?.error || signupData?.message || 'unknown error')}`,
    };
  }
  const serverUsername = String(signupData?.user?.username || username).trim();

  const signinCandidates = [
    { username: serverUsername, password },
    { username, password },
    { email, password },
  ];

  for (const candidate of signinCandidates) {
    const signinResponse = await withTimeoutFetch(`${FUNCTION_URL}/signin`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(candidate),
    });

    const signinData = await signinResponse.json().catch(() => ({}));
    const token = signinData?.session?.access_token;
    if (token) {
      return {
        token,
        userId: String(signinData?.user?.id || '').trim() || null,
        bootstrapUsername: serverUsername || username,
      };
    }
  }

  return {
    token: null,
    userId: null,
    bootstrapUsername: username,
    bootstrapError: 'signin failed for all credential variants',
  };
};

const run = async () => {
  const routes = parseRoutes();
  const failures = [];
  const statusCounts = new Map();

  console.log(`Discovered ${routes.length} endpoints.`);

  const session = await createUserSession().catch(() => ({ token: null, userId: null, bootstrapUsername: null }));
  if (!session?.token) {
    const reason = String(session?.bootstrapError || 'unknown bootstrap error');
    if (REQUIRE_AUTH_BOOTSTRAP) {
      console.error(`Failed to bootstrap authenticated user session: ${reason}`);
      console.error('Set a valid SUPABASE_ANON_KEY for this project, or run with SWEEP_REQUIRE_AUTH_BOOTSTRAP=false to allow anon-only probing.');
      process.exit(1);
    }
    console.warn(`Warning: Could not bootstrap authenticated user session (${reason}); protected endpoints will be probed with anon token.`);
  }

  for (const endpoint of routes) {
    const routePath = materializeRoute(endpoint.route, session);
    const url = `${FUNCTION_URL}${routePath}`;
    const isAdmin = endpoint.route.startsWith('/admin/') && !publicRoutes.has(endpoint.route);
    const body = buildBodyForRoute(endpoint.method, endpoint.route, session);

    const headers = isAdmin && SUPABASE_ADMIN_API_KEY
      ? buildHeaders({ adminKey: SUPABASE_ADMIN_API_KEY })
      : buildHeaders({ token: session?.token || undefined });

    try {
      const response = await withTimeoutFetch(url, {
        method: endpoint.method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      const status = Number(response.status || 0);
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);

      // A valid endpoint response should not crash server-side.
      if (status >= 500 || status <= 0) {
        const snippet = await response.text().catch(() => '');
        failures.push({
          endpoint: `${endpoint.method} ${endpoint.route}`,
          status,
          reason: snippet.slice(0, 300),
        });
      }
    } catch (error) {
      failures.push({
        endpoint: `${endpoint.method} ${endpoint.route}`,
        status: 'REQUEST_FAILED',
        reason: String(error?.message || error),
      });
    }
  }

  const sortedStatuses = Array.from(statusCounts.entries()).sort((a, b) => a[0] - b[0]);
  console.log('\nStatus summary:');
  for (const [status, count] of sortedStatuses) {
    console.log(` - ${status}: ${count}`);
  }

  const successfulResponses = Array.from(statusCounts.entries())
    .filter(([status]) => status >= 200 && status < 400)
    .reduce((sum, [, count]) => sum + count, 0);
  const authOnlyResponses = Array.from(statusCounts.entries())
    .filter(([status]) => status === 401 || status === 403)
    .reduce((sum, [, count]) => sum + count, 0);

  if (successfulResponses === 0 && authOnlyResponses === routes.length) {
    failures.push({
      endpoint: 'GLOBAL',
      status: 'AUTH_ONLY_RESULTS',
      reason: 'All endpoints returned 401/403. This usually indicates invalid credentials or failed session bootstrap.',
    });
  }

  if (failures.length > 0) {
    console.error(`\nEndpoint sweep failed with ${failures.length} erroring endpoint(s):`);
    for (const failure of failures) {
      console.error(` - ${failure.endpoint} -> ${failure.status} (${failure.reason})`);
    }
    process.exit(1);
  }

  console.log('\nAll endpoints returned valid non-5xx responses.');
};

run().catch((error) => {
  console.error(`Endpoint sweep failed: ${error?.message || error}`);
  process.exit(1);
});
