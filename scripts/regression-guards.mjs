#!/usr/bin/env node

const FUNCTION_URL = (process.env.FUNCTION_URL || '').replace(/\/$/, '');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const FUNCTION_NAME = process.env.FUNCTION_NAME || 'make-server-44a642d3';

const BASE_URL = FUNCTION_URL || (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}` : '');

if (!BASE_URL) {
  console.error('Missing FUNCTION_URL or SUPABASE_URL env var for regression guards.');
  process.exit(1);
}

const failures = [];

const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const check = async (name, fn) => {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.error(`FAIL ${name}: ${error.message}`);
  }
};

const ensureStatusIn = (actual, allowed, context) => {
  if (!allowed.includes(actual)) {
    throw new Error(`${context} expected status in [${allowed.join(', ')}], got ${actual}`);
  }
};

const ensureNotMissingIdempotency = (payload, context) => {
  const message = String(payload?.error || payload?.message || '').toLowerCase();
  if (message.includes('idempotency-key header is required')) {
    throw new Error(`${context} returned hard idempotency header requirement`);
  }
};

await check('health endpoint returns ok', async () => {
  const response = await fetch(`${BASE_URL}/health`, { method: 'GET' });
  ensureStatusIn(response.status, [200], 'health');
});

await check('complete-product tolerates missing idempotency header', async () => {
  const response = await fetch(`${BASE_URL}/tasks/complete-product`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer invalid-token-for-regression-check',
      apikey: 'regression-check',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productName: 'Regression Guard Product',
      productValue: 100,
      profit: 1,
    }),
  });

  const payload = await parseJsonSafe(response);
  ensureNotMissingIdempotency(payload, 'complete-product missing header');
  ensureStatusIn(response.status, [401, 403], 'complete-product missing header');
});

await check('complete-product accepts lowercase idempotency header', async () => {
  const response = await fetch(`${BASE_URL}/tasks/complete-product`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer invalid-token-for-regression-check',
      apikey: 'regression-check',
      'Content-Type': 'application/json',
      'idempotency-key': `rg-lower-${Date.now()}`,
    },
    body: JSON.stringify({
      productName: 'Regression Guard Product',
      productValue: 100,
      profit: 1,
    }),
  });

  const payload = await parseJsonSafe(response);
  ensureNotMissingIdempotency(payload, 'complete-product lowercase header');
  ensureStatusIn(response.status, [401, 403], 'complete-product lowercase header');
});

await check('submit-product tolerates missing idempotency header', async () => {
  const response = await fetch(`${BASE_URL}/submit-product`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer invalid-token-for-regression-check',
      apikey: 'regression-check',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productName: 'Regression Guard Product',
      productValue: 100,
    }),
  });

  const payload = await parseJsonSafe(response);
  ensureNotMissingIdempotency(payload, 'submit-product missing header');
  ensureStatusIn(response.status, [401, 403], 'submit-product missing header');
});

await check('CORS preflight allows idempotency headers', async () => {
  const response = await fetch(`${BASE_URL}/tasks/complete-product`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://tanknewmedia.work',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,apikey,content-type,idempotency-key,x-idempotency-key',
    },
  });

  ensureStatusIn(response.status, [200, 204], 'preflight');

  const allowHeaders = String(response.headers.get('access-control-allow-headers') || '').toLowerCase();
  if (!allowHeaders.includes('idempotency-key')) {
    throw new Error(`preflight missing idempotency-key in allow-headers: ${allowHeaders || '<empty>'}`);
  }
});

await check('validate-super-key path is reachable (not 404)', async () => {
  const response = await fetch(`${BASE_URL}/admin/validate-super-key`, { method: 'GET' });
  ensureStatusIn(response.status, [401, 403], 'validate-super-key without auth');
});

if (failures.length > 0) {
  console.error('\nRegression guard failures:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('\nAll regression guards passed.');
