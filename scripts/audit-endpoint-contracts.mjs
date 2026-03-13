#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const serverFile = path.join(repoRoot, 'supabase', 'functions', 'server', 'index.tsx');

const SUPABASE_URL = process.env.SUPABASE_URL;
const FUNCTION_NAME = process.env.FUNCTION_NAME || 'make-server-44a642d3';
const FUNCTION_URL = SUPABASE_URL
  ? `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/${FUNCTION_NAME}`
  : '';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const ADMIN_API_KEY = process.env.SUPABASE_ADMIN_API_KEY || process.env.ADMIN_API_KEY || '';

if (!SUPABASE_URL) {
  console.error('Missing SUPABASE_URL env var.');
  process.exit(1);
}

if (!ANON_KEY) {
  console.error('Missing SUPABASE_ANON_KEY env var.');
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

const isAdminRoute = (route) => route.startsWith('/admin/');
const isPublicRoute = (route) => publicRoutes.has(route);
const requiresUserAuth = (route) => !isPublicRoute(route) && !isAdminRoute(route);

const normalizeRoutePath = (routePath) => {
  return routePath.replace(/:([^/]+)/g, (_m, name) => {
    if (String(name).toLowerCase().includes('id')) {
      return 'test-id';
    }
    return 'test-value';
  });
};

const parseRoutes = () => {
  const source = fs.readFileSync(serverFile, 'utf8');
  const routeRegex = /app\.(get|post|put|delete|patch)\((['"])(.*?)\2/g;
  const all = [];
  let match;

  while ((match = routeRegex.exec(source)) !== null) {
    const method = match[1].toUpperCase();
    const route = match[3];
    if (!route || route === '*') continue;
    all.push({ method, route });
  }

  const dedup = new Map();
  for (const item of all) {
    dedup.set(`${item.method} ${item.route}`, item);
  }

  return Array.from(dedup.values());
};

const jsonHeaders = {
  'content-type': 'application/json',
};

const buildHeaders = ({ token, adminKey }) => {
  const headers = { ...jsonHeaders };
  if (ANON_KEY) {
    headers.apikey = ANON_KEY;
  }
  if (adminKey) {
    headers.authorization = `Bearer ${adminKey}`;
  } else if (token) {
    headers.authorization = `Bearer ${token}`;
  } else if (ANON_KEY) {
    headers.authorization = `Bearer ${ANON_KEY}`;
  }
  return headers;
};

const doRequest = async ({ method, route, token, adminKey, body }) => {
  const normalized = normalizeRoutePath(route);
  const response = await fetch(`${FUNCTION_URL}${normalized}`, {
    method,
    headers: buildHeaders({ token, adminKey }),
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
};

const createTestUserSession = async () => {
  const runId = Date.now();
  const username = `audit_user_${runId}`;
  const email = `${username}@tank.local`;
  const password = 'AuditPassword123!';

  const signup = await doRequest({
    method: 'POST',
    route: '/signup',
    body: {
      email,
      username,
      password,
      name: 'Audit User',
      withdrawalPassword: 'Withdraw123!',
      gender: 'male',
    },
  });

  if (signup.status >= 500) {
    throw new Error(`Signup failed during test bootstrap: ${signup.status}`);
  }

  const registeredUsername = String(signup.data?.user?.username || username).trim();
  const normalizedUsername = registeredUsername || username;

  const signinAttempts = [
    { username: normalizedUsername, password },
    { username, password },
    { email, password },
  ];

  let signin = null;
  for (const attempt of signinAttempts) {
    const candidate = await doRequest({
      method: 'POST',
      route: '/signin',
      body: attempt,
    });

    if (candidate.status < 500 && candidate.data?.session?.access_token) {
      signin = candidate;
      break;
    }
  }

  if (!signin) {
    throw new Error('Signin failed during test bootstrap: unable to obtain session token');
  }

  const token = signin.data?.session?.access_token;
  if (!token) {
    throw new Error(`Signin failed during test bootstrap: ${signin.status}`);
  }

  return token;
};

const shouldHaveBodyCheck = (method) => ['POST', 'PUT', 'PATCH'].includes(method);

const run = async () => {
  const routes = parseRoutes();
  const failures = [];

  console.log(`Discovered ${routes.length} endpoints from server source.`);
  const userToken = await createTestUserSession();

  for (const endpoint of routes) {
    const key = `${endpoint.method} ${endpoint.route}`;
    const publicRoute = isPublicRoute(endpoint.route);
    const adminRoute = !publicRoute && isAdminRoute(endpoint.route);
    const userRoute = requiresUserAuth(endpoint.route);

    if (adminRoute) {
      const noAuth = await doRequest({ method: endpoint.method, route: endpoint.route });
      if (![401, 403, 404, 429].includes(noAuth.status)) {
        failures.push(`${key} expected admin auth rejection, got ${noAuth.status}`);
      }

      if (ADMIN_API_KEY) {
        const withAdmin = await doRequest({
          method: endpoint.method,
          route: endpoint.route,
          adminKey: ADMIN_API_KEY,
          body: shouldHaveBodyCheck(endpoint.method) ? {} : undefined,
        });
        if (withAdmin.status >= 500) {
          failures.push(`${key} returned ${withAdmin.status} with admin key`);
        }
      }

      continue;
    }

    if (userRoute) {
      const noAuth = await doRequest({ method: endpoint.method, route: endpoint.route });
      if (![401, 403, 404].includes(noAuth.status)) {
        failures.push(`${key} expected user auth rejection, got ${noAuth.status}`);
      }

      const withUser = await doRequest({
        method: endpoint.method,
        route: endpoint.route,
        token: userToken,
        body: shouldHaveBodyCheck(endpoint.method) ? {} : undefined,
      });
      if (withUser.status >= 500) {
        failures.push(`${key} returned ${withUser.status} with user token`);
      }
      continue;
    }

    const publicCheck = await doRequest({
      method: endpoint.method,
      route: endpoint.route,
      body: shouldHaveBodyCheck(endpoint.method) ? {} : undefined,
    });

    if (publicCheck.status >= 500 || publicCheck.status === 404) {
      failures.push(`${key} returned ${publicCheck.status} on public request`);
    }
  }

  // Explicit high-risk checks
  const vipEscalationProbe = await doRequest({
    method: 'PUT',
    route: '/vip-tier',
    token: userToken,
    body: { vipTier: 'VIP3' },
  });
  if (![401, 403].includes(vipEscalationProbe.status)) {
    failures.push(`/vip-tier expected 401/403 for self-service VIP escalation, got ${vipEscalationProbe.status}`);
  }

  const signupBadPayload = await doRequest({
    method: 'POST',
    route: '/signup',
    body: { username: '', password: '', name: '' },
  });
  if (![400, 429].includes(signupBadPayload.status)) {
    failures.push(`/signup invalid payload expected 400/429, got ${signupBadPayload.status}`);
  }

  const signinBadPayload = await doRequest({
    method: 'POST',
    route: '/signin',
    body: { username: '', password: '' },
  });
  if (![400, 401, 429].includes(signinBadPayload.status)) {
    failures.push(`/signin invalid payload expected 400/401/429, got ${signinBadPayload.status}`);
  }

  const withdrawalNoAuth = await doRequest({
    method: 'POST',
    route: '/request-withdrawal',
    body: { amount: 100, withdrawalPassword: 'x' },
  });
  if (withdrawalNoAuth.status !== 401) {
    failures.push(`/request-withdrawal without auth expected 401, got ${withdrawalNoAuth.status}`);
  }

  console.log(`Completed checks for ${routes.length} endpoints.`);
  if (ADMIN_API_KEY) {
    console.log('Admin API key provided: admin endpoint non-500 checks were executed.');
  } else {
    console.log('No admin API key provided: admin endpoints were checked for unauthenticated rejection only.');
  }

  if (failures.length > 0) {
    console.error('\nFailures:');
    for (const failure of failures) {
      console.error(` - ${failure}`);
    }
    process.exit(1);
  }

  console.log('All endpoint contract checks passed.');
};

run().catch((error) => {
  console.error(`Audit endpoint test failed: ${error.message}`);
  process.exit(1);
});
