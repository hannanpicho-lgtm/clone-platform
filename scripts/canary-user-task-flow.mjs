#!/usr/bin/env node

const getEnv = (...keys) => {
  for (const key of keys) {
    const value = String(process.env[key] || '').trim();
    if (value) return value;
  }
  return '';
};

const FUNCTION_URL = getEnv('FUNCTION_URL');
const SUPABASE_URL = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
const FUNCTION_NAME = getEnv('FUNCTION_NAME') || 'make-server-44a642d3';
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_KEY');
const ADMIN_API_KEY = getEnv('SUPABASE_ADMIN_API_KEY', 'ADMIN_API_KEY');

const BASE_URL = FUNCTION_URL || (SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/${FUNCTION_NAME}` : '');

if (!BASE_URL) {
  console.error('Missing FUNCTION_URL or SUPABASE_URL env var for user task-flow canary.');
  process.exit(1);
}

if (!SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY / VITE_SUPABASE_KEY).');
  process.exit(1);
}

const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const ensureStatusIn = (actual, allowed, context) => {
  if (!allowed.includes(actual)) {
    throw new Error(`${context} expected status in [${allowed.join(', ')}], got ${actual}`);
  }
};

const ensureNoHardIdempotencyFailure = (payload, context) => {
  const message = String(payload?.error || payload?.message || '').toLowerCase();
  if (message.includes('idempotency-key header is required')) {
    throw new Error(`${context} returned hard idempotency requirement`);
  }
};

const request = async ({ method, path, token, body, idempotencyKey, skipAuth = false, adminKey = '' }) => {
  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
  };

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
    headers['X-Idempotency-Key'] = idempotencyKey;
  }

  if (skipAuth) {
    headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  } else if (adminKey) {
    headers.Authorization = `Bearer ${adminKey}`;
  } else if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await parseJsonSafe(response);
  return {
    status: response.status,
    ok: response.ok,
    payload,
  };
};

const run = async () => {
  const runId = Date.now();
  const username = `canary_user_${runId}`;
  const email = `${username}@tank.local`;
  const password = 'CanaryPassword123!';

  console.log('CANARY: signup');
  const signup = await request({
    method: 'POST',
    path: '/signup',
    skipAuth: true,
    body: {
      email,
      username,
      password,
      name: 'Canary User',
      withdrawalPassword: 'Withdraw123!',
      gender: 'male',
    },
  });
  ensureStatusIn(signup.status, [200, 201, 400, 409], 'signup');

  const signinCandidates = [
    { username, password },
    { email, password },
  ];

  let signin = null;
  for (const candidate of signinCandidates) {
    const attempt = await request({ method: 'POST', path: '/signin', skipAuth: true, body: candidate });
    if (attempt.ok && attempt.payload?.session?.access_token) {
      signin = attempt;
      break;
    }
  }

  if (!signin) {
    throw new Error('signin failed for canary test user');
  }

  const userToken = String(signin.payload?.session?.access_token || '').trim();
  const userId = String(signin.payload?.user?.id || signup.payload?.user?.id || '').trim();

  if (ADMIN_API_KEY && userId) {
    console.log('CANARY: admin funding test user');
    const fund = await request({
      method: 'POST',
      path: '/admin/users/adjust-balance',
      adminKey: ADMIN_API_KEY,
      body: {
        userId,
        amount: 500,
        category: 'bonus',
        note: `canary_funding_${runId}`,
      },
    });

    if ([401, 403].includes(fund.status)) {
      console.log(`CANARY: admin funding skipped (status ${fund.status}) - key not available/authorized in this environment`);
    } else {
      ensureStatusIn(fund.status, [200, 404], 'admin funding');
    }
  }

  console.log('CANARY: fetch next task product');
  const nextProduct = await request({ method: 'GET', path: '/tasks/next-product', token: userToken });
  ensureNoHardIdempotencyFailure(nextProduct.payload, 'next-product');
  ensureStatusIn(nextProduct.status, [200, 400, 403, 409], 'next-product');

  if (nextProduct.status !== 200) {
    console.log(`CANARY: next-product returned ${nextProduct.status}, skipping complete-product happy-path assertion`);
    console.log('CANARY: PASS (guard-level checks passed)');
    return;
  }

  const product = nextProduct.payload?.product;
  if (!product?.name || !Number(product?.totalAmount)) {
    throw new Error('next-product returned 200 without a valid product payload');
  }

  console.log('CANARY: complete product with idempotency key');
  const idempotencyKey = `canary-complete-${runId}`;
  const complete = await request({
    method: 'POST',
    path: '/tasks/complete-product',
    token: userToken,
    idempotencyKey,
    body: {
      productName: String(product.name),
      productValue: Number(product.totalAmount),
      profit: Number(product.profit || 0),
    },
  });
  ensureNoHardIdempotencyFailure(complete.payload, 'complete-product');
  ensureStatusIn(complete.status, [200, 400, 403, 409], 'complete-product');

  console.log('CANARY: replay complete-product with same idempotency key');
  const replay = await request({
    method: 'POST',
    path: '/tasks/complete-product',
    token: userToken,
    idempotencyKey,
    body: {
      productName: String(product.name),
      productValue: Number(product.totalAmount),
      profit: Number(product.profit || 0),
    },
  });
  ensureNoHardIdempotencyFailure(replay.payload, 'complete-product replay');
  ensureStatusIn(replay.status, [200, 409], 'complete-product replay');

  console.log('CANARY: PASS');
};

run().catch((error) => {
  console.error(`CANARY: FAIL ${String(error?.message || error)}`);
  process.exit(1);
});
