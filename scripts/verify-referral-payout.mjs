#!/usr/bin/env node

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tpxgfjevorhdtwkesvcb.supabase.co';
const FUNCTION_NAME = process.env.FUNCTION_NAME || 'make-server-44a642d3';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRweGdmamV2b3JoZHR3a2VzdmNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNDE3MjIsImV4cCI6MjA4NjgxNzcyMn0.K50o48WDbgmWvASexy3SCX2XfWiP_WQtCAkou49aFO8';
const ADMIN_API_KEY = String(process.env.ADMIN_API_KEY || '').trim();

if (!ADMIN_API_KEY) {
  console.error('Missing ADMIN_API_KEY environment variable');
  process.exit(1);
}

const publicHeaders = {
  'Content-Type': 'application/json',
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
};

const adminHeaders = {
  'Content-Type': 'application/json',
  apikey: ANON_KEY,
  Authorization: `Bearer ${ADMIN_API_KEY}`,
};

const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  apikey: ANON_KEY,
  Authorization: `Bearer ${token}`,
});

async function request(path, { method = 'GET', headers = publicHeaders, body } = {}) {
  const response = await fetch(`${FUNCTION_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

function toMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

(async () => {
  const runId = Date.now();
  const parentUsername = `refp_${runId}`;
  const childUsername = `refc_${runId}`;

  const parentSignup = await request('/signup', {
    method: 'POST',
    body: {
      email: `${parentUsername}@tank.local`,
      username: parentUsername,
      password: 'Password123!',
      name: 'Referral Parent',
      withdrawalPassword: 'Withdraw123!',
      gender: 'male',
    },
  });

  if (!parentSignup.response.ok) {
    console.error('Parent signup failed:', parentSignup.response.status, parentSignup.data);
    process.exit(1);
  }

  const parentId = parentSignup.data?.user?.id;
  const inviteCode = parentSignup.data?.user?.invitationCode;

  const parentSignin = await request('/signin', {
    method: 'POST',
    body: { username: parentUsername, password: 'Password123!' },
  });

  if (!parentSignin.response.ok) {
    console.error('Parent signin failed:', parentSignin.response.status, parentSignin.data);
    process.exit(1);
  }

  const parentToken = parentSignin.data?.session?.access_token;

  const parentProfileBefore = await request('/profile', {
    headers: authHeaders(parentToken),
  });

  const parentBalanceBefore = toMoney(parentProfileBefore.data?.profile?.balance ?? 0);

  const childSignup = await request('/signup', {
    method: 'POST',
    body: {
      email: `${childUsername}@tank.local`,
      username: childUsername,
      password: 'Password123!',
      name: 'Referral Child',
      withdrawalPassword: 'Withdraw123!',
      gender: 'female',
      invitationCode: inviteCode,
    },
  });

  if (!childSignup.response.ok) {
    console.error('Child signup failed:', childSignup.response.status, childSignup.data);
    process.exit(1);
  }

  const childId = childSignup.data?.user?.id;

  const childSignin = await request('/signin', {
    method: 'POST',
    body: { username: childUsername, password: 'Password123!' },
  });

  if (!childSignin.response.ok) {
    console.error('Child signin failed:', childSignin.response.status, childSignin.data);
    process.exit(1);
  }

  const childToken = childSignin.data?.session?.access_token;

  const topup = await request('/admin/users/adjust-balance', {
    method: 'POST',
    headers: adminHeaders,
    body: {
      userId: childId,
      amount: 200,
      category: 'topup',
      note: 'referral payout verification',
    },
  });

  if (!topup.response.ok) {
    console.error('Child topup failed:', topup.response.status, topup.data);
    process.exit(1);
  }

  const childComplete = await request('/tasks/complete-product', {
    method: 'POST',
    headers: authHeaders(childToken),
    body: {
      productName: 'Referral Verification Product',
      productValue: 500,
    },
  });

  if (!childComplete.response.ok) {
    console.error('Child task completion failed:', childComplete.response.status, childComplete.data);
    process.exit(1);
  }

  const childProfit = toMoney(childComplete.data?.result?.profit ?? 0);
  const expectedParentCommission = toMoney(childProfit * 0.2);

  const parentProfileAfter = await request('/profile', {
    headers: authHeaders(parentToken),
  });

  const parentBalanceAfter = toMoney(parentProfileAfter.data?.profile?.balance ?? 0);
  const parentDelta = toMoney(parentBalanceAfter - parentBalanceBefore);

  const pass = Math.abs(parentDelta - expectedParentCommission) < 0.0001;

  console.log('REFERRAL_PAYOUT_VERIFICATION');
  console.log(`PARENT_ID=${parentId}`);
  console.log(`CHILD_ID=${childId}`);
  console.log(`CHILD_PROFIT=${childProfit.toFixed(2)}`);
  console.log(`EXPECTED_PARENT_COMMISSION=${expectedParentCommission.toFixed(2)}`);
  console.log(`PARENT_BALANCE_BEFORE=${parentBalanceBefore.toFixed(2)}`);
  console.log(`PARENT_BALANCE_AFTER=${parentBalanceAfter.toFixed(2)}`);
  console.log(`PARENT_BALANCE_DELTA=${parentDelta.toFixed(2)}`);
  console.log(`RESULT=${pass ? 'PASS' : 'FAIL'}`);

  if (!pass) {
    process.exit(1);
  }
})();
