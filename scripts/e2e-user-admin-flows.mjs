#!/usr/bin/env node

const SUPABASE_URL = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = String(
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY || ''
).trim();
const FUNCTION_NAME = String(process.env.FUNCTION_NAME || 'make-server-44a642d3').trim();
const ADMIN_API_KEY = String(process.env.SUPABASE_ADMIN_API_KEY || process.env.ADMIN_API_KEY || '').trim();
const REQUIRE_ADMIN = String(process.env.E2E_REQUIRE_ADMIN || 'true').toLowerCase() !== 'false';

if (!SUPABASE_URL) {
  console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) env var.');
  process.exit(1);
}

if (!SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY/VITE_SUPABASE_KEY) env var.');
  process.exit(1);
}

if (REQUIRE_ADMIN && !ADMIN_API_KEY) {
  console.error('Missing SUPABASE_ADMIN_API_KEY (or ADMIN_API_KEY) env var while E2E_REQUIRE_ADMIN=true.');
  process.exit(1);
}

const BASE_URL = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/${FUNCTION_NAME}`;

const state = {
  failures: [],
  warnings: [],
};

const logStep = (message) => {
  console.log(`\n[STEP] ${message}`);
};

const recordFailure = (message) => {
  state.failures.push(message);
  console.error(`  FAIL: ${message}`);
};

const recordWarning = (message) => {
  state.warnings.push(message);
  console.warn(`  WARN: ${message}`);
};

const recordPass = (message) => {
  console.log(`  PASS: ${message}`);
};

const buildHeaders = ({ token, adminKey, idempotencyKey, skipAuth } = {}) => {
  const headers = {
    'content-type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
  };

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  // For signup/signin, use public key as bearer token for gateway auth
  if (skipAuth) {
    headers.authorization = `Bearer ${SUPABASE_ANON_KEY}`;
    return headers;
  }

  if (adminKey) {
    headers.authorization = `Bearer ${adminKey}`;
  } else if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  // Do NOT set Authorization for anon key by default
  return headers;
};

const request = async ({ method, path, token, adminKey, body, idempotencyKey, skipAuth }) => {
  const url = `${BASE_URL}${path}`;
  const headers = buildHeaders({ token, adminKey, idempotencyKey, skipAuth });
  let response, text = '', data = null;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    text = await response.text().catch(() => '');
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
  } catch (err) {
    console.error(`\n[DIAGNOSTIC] Fetch failed for ${method} ${url}`);
    console.error('Headers:', headers);
    if (body !== undefined) console.error('Body:', body);
    console.error('Error:', err);
    return {
      status: 0,
      ok: false,
      data: null,
      text: String(err),
    };
  }
  if (!response.ok) {
    console.error(`\n[DIAGNOSTIC] Request failed: ${method} ${url}`);
    console.error('Status:', response.status);
    console.error('Headers:', headers);
    if (body !== undefined) console.error('Body:', body);
    console.error('Response:', text.slice(0, 600));
  }
  return {
    status: response.status,
    ok: response.ok,
    data,
    text,
  };
};

const ensure = (condition, failureMessage, passMessage) => {
  if (!condition) {
    recordFailure(failureMessage);
    return false;
  }
  if (passMessage) {
    recordPass(passMessage);
  }
  return true;
};

const run = async () => {
  const runId = Date.now();
  const email = `e2e_user_${runId}@tank.local`;
  const username = `e2e_user_${runId}`;
  const password = 'E2EPassword123!';
  const withdrawalPassword = 'Withdraw123!';

  let userToken = '';
  let userId = '';
  let initialBalance = 0;
  let balanceAfterFunding = 0;

  logStep('Create account');
  const signup = await request({
    method: 'POST',
    path: '/signup',
    body: {
      email,
      username,
      password,
      name: 'E2E User',
      withdrawalPassword,
      gender: 'male',
    },
    skipAuth: true,
  });

  ensure(
    signup.status < 500,
    `/signup returned server error (${signup.status})`,
    `/signup returned ${signup.status}`,
  );

  logStep('Sign in user');
  const signinCandidates = [
    { username: String(signup?.data?.user?.username || username), password },
    { username, password },
    { email, password },
  ];

  let signin = null;
  for (const candidate of signinCandidates) {
    const attempt = await request({ method: 'POST', path: '/signin', body: candidate, skipAuth: true });
    if (attempt.ok && attempt?.data?.session?.access_token) {
      signin = attempt;
      break;
    }
  }

  if (!ensure(Boolean(signin), 'Unable to sign in test user using username/email candidates', 'User signed in')) {
    process.exit(1);
  }

  userToken = String(signin.data?.session?.access_token || '');
  userId = String(signin.data?.user?.id || signup?.data?.user?.id || '').trim();

  logStep('Read profile and capture initial balance');
  const profileBefore = await request({ method: 'GET', path: '/profile', token: userToken });
  ensure(profileBefore.status === 200, `/profile expected 200, got ${profileBefore.status}`, 'Profile fetched');
  initialBalance = Number(profileBefore?.data?.profile?.balance || 0);

  logStep('Attempt product submission before funding (expect guarded behavior)');
  const preFundingTask = await request({
    method: 'POST',
    path: '/tasks/complete-product',
    token: userToken,
    idempotencyKey: `e2e-pre-funding-${runId}`,
    body: {
      productName: 'E2E Test Product',
      productValue: 120,
    },
  });
  ensure(
    preFundingTask.status < 500,
    `/tasks/complete-product pre-funding returned server error (${preFundingTask.status})`,
    `Pre-funding task attempt returned ${preFundingTask.status}`,
  );

  if (ADMIN_API_KEY) {
    logStep('Admin operation: adjust user balance');
    const adjust = await request({
      method: 'POST',
      path: '/admin/users/adjust-balance',
      adminKey: ADMIN_API_KEY,
      body: {
        userId,
        amount: 250,
        category: 'bonus',
        note: `e2e_funding_${runId}`,
      },
    });
    // Diagnostic: Show adminKey used
    console.log('[DIAGNOSTIC] AdminKey used for adjust-balance:', ADMIN_API_KEY.slice(0, 12) + '...');
    ensure(adjust.status === 200, `/admin/users/adjust-balance expected 200, got ${adjust.status}`, 'Admin balance adjustment applied');

    logStep('Verify balance update');
    const profileAfterFunding = await request({ method: 'GET', path: '/profile', token: userToken });
    ensure(profileAfterFunding.status === 200, `/profile after funding expected 200, got ${profileAfterFunding.status}`, 'Profile after funding fetched');
    balanceAfterFunding = Number(profileAfterFunding?.data?.profile?.balance || 0);
    ensure(
      balanceAfterFunding >= initialBalance + 200,
      `Balance did not increase as expected (initial=${initialBalance}, afterFunding=${balanceAfterFunding})`,
      `Balance updated from ${initialBalance} to ${balanceAfterFunding}`,
    );

    logStep('Submit product after funding');
    const postFundingTask = await request({
      method: 'POST',
      path: '/tasks/complete-product',
      token: userToken,
      idempotencyKey: `e2e-post-funding-${runId}`,
      body: {
        productName: 'E2E Funded Product',
        productValue: 130,
      },
    });
    ensure(
      postFundingTask.status < 500,
      `/tasks/complete-product post-funding returned server error (${postFundingTask.status})`,
      `Post-funding task submission returned ${postFundingTask.status}`,
    );

    logStep('Verify records endpoint returns valid response');
    const records = await request({ method: 'GET', path: '/records', token: userToken });
    ensure(records.status === 200, `/records expected 200, got ${records.status}`, 'Records endpoint returned 200');

    logStep('Admin operation: list withdrawals');
    const adminWithdrawals = await request({ method: 'GET', path: '/admin/withdrawals', adminKey: ADMIN_API_KEY });
    // Diagnostic: Show adminKey used
    console.log('[DIAGNOSTIC] AdminKey used for withdrawals:', ADMIN_API_KEY.slice(0, 12) + '...');
    ensure(
      adminWithdrawals.status < 500,
      `/admin/withdrawals returned server error (${adminWithdrawals.status})`,
      `/admin/withdrawals returned ${adminWithdrawals.status}`,
    );
  } else {
    recordWarning('Admin API key not provided; admin operations were skipped. Set SUPABASE_ADMIN_API_KEY to run full flow.');
  }

  console.log('\n=== E2E Flow Summary ===');
  console.log(`Failures: ${state.failures.length}`);
  console.log(`Warnings: ${state.warnings.length}`);

  if (state.failures.length > 0) {
    process.exit(1);
  }
};

run().catch((error) => {
  console.error(`Unhandled E2E flow error: ${String(error?.message || error)}`);
  process.exit(1);
});
