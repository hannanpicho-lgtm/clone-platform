#!/usr/bin/env node

/**
 * Test Premium Management Endpoints
 * Tests the new premium dashboard endpoints:
 * - GET /admin/premium/list - List all premium assignments
 * - POST /admin/premium/revoke - Revoke a premium assignment
 * - GET /admin/premium/analytics - Get premium analytics
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tpxgfjevorhdtwkesvcb.supabase.co';
const FUNCTION_NAME = process.env.FUNCTION_NAME || 'make-server-44a642d3';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`;
const ADMIN_API_KEY = process.env.SUPABASE_ADMIN_API_KEY || '';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function test(name, fn) {
  try {
    log(`\n▶ ${name}`, 'blue');
    await fn();
    log(`✓ ${name} passed`, 'green');
    return true;
  } catch (error) {
    log(`✗ ${name} failed: ${error.message}`, 'red');
    return false;
  }
}

async function request(path, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${ADMIN_API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const url = `${FUNCTION_URL}${path}`;
  console.log(`    Request: ${method} ${url.replace(SUPABASE_URL, '')}`);
  
  const res = await fetch(url, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(`${res.status}: ${data.error || 'Unknown error'}`);
  }

  return data;
}

async function runTests() {
  log('\n=== Premium Management Endpoints Test Suite ===\n', 'blue');

  let passed = 0;
  let failed = 0;

  // Create a test user first
  let testUserId = '';
  log('\n▶ Setup: Creating test user', 'blue');
  try {
    const timestamp = Date.now();
    const signupRes = await fetch(`${FUNCTION_URL}/signup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRweGdmamV2b3JoZHR3a2VzdmNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNDE3MjIsImV4cCI6MjA4NjgxNzcyMn0.K50o48WDbgmWvASexy3SCX2XfWiP_WQtCAkou49aFO8"}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `premium-test-${timestamp}@test.local`,
        password: 'TestPassword123!',
        name: 'Premium Test User',
        withdrawalPassword: 'WithdrawPass123!',
      }),
    });
    const signupData = await signupRes.json();
    if (signupData.user && signupData.user.id) {
      testUserId = signupData.user.id;
      log(`✓ Test user created: ${testUserId.slice(0, 8)}...`, 'green');
    } else {
      log(`✗ Failed to create user: ${signupData.error || 'Unknown error'}`, 'red');
      log("Skipping premium assignment tests", 'yellow');
    }
  } catch (err) {
    log(`✗ Error creating user: ${err.message}`, 'red');
  }

  // Test 1: List premium assignments
  if (await test('GET /admin/premium/list', async () => {
    const data = await request('/admin/premium/list');
    if (!data.success) throw new Error('Response not successful');
    if (!Array.isArray(data.assignments)) throw new Error('assignments is not an array');
    log(`  Found ${data.total} premium assignments`, 'yellow');
  })) {
    passed++;
  } else {
    failed++;
  }

  // Test 2: Get premium analytics
  if (await test('GET /admin/premium/analytics', async () => {
    const data = await request('/admin/premium/analytics');
    if (!data.success) throw new Error('Response not successful');
    if (!data.analytics) throw new Error('analytics not in response');
    
    const { totalAssignments, totalPremiumValue, frozenAccounts } = data.analytics;
    log(`  Total Assignments: ${totalAssignments}`, 'yellow');
    log(`  Total Value: $${totalPremiumValue.toFixed(2)}`, 'yellow');
    log(`  Frozen Accounts: ${frozenAccounts}`, 'yellow');
  })) {
    passed++;
  } else {
    failed++;
  }

  // Test 3: Assign a premium product (only if user created)
  if (testUserId) {
    if (await test('POST /admin/premium (assign)', async () => {
      const data = await request('/admin/premium', 'POST', {
        userId: testUserId,
        amount: 5000,
        position: 1,
      });
      if (!data.success) throw new Error('Response not successful');
      if (!data.user) throw new Error('user not in response');
      
      log(`  Assigned premium to: ${data.user.name || data.user.id}`, 'yellow');
      log(`  Premium Amount: $${data.user.premiumAssignment?.amount}`, 'yellow');
      log(`  Account Frozen: ${data.user.accountFrozen}`, 'yellow');
    })) {
      passed++;
    } else {
      failed++;
    }

    // Test 4: List again to verify assignment
    if (await test('GET /admin/premium/list (verify assignment)', async () => {
      const data = await request('/admin/premium/list');
      if (!data.success) throw new Error('Response not successful');
      
      const assignment = data.assignments.find(a => a.userId === testUserId);
      if (!assignment) throw new Error(`Could not find assigned premium for ${testUserId}`);
      
      log(`  Verified assignment: $${assignment.assignment.amount}`, 'yellow');
    })) {
      passed++;
    } else {
      failed++;
    }

    // Test 5: Get analytics again
    if (await test('GET /admin/premium/analytics (verify new assignment)', async () => {
      const data = await request('/admin/premium/analytics');
      if (!data.success) throw new Error('Response not successful');
      
      const { totalAssignments, totalPremiumValue } = data.analytics;
      log(`  Total now: ${totalAssignments} assignments, $${totalPremiumValue.toFixed(2)}`, 'yellow');
    })) {
      passed++;
    } else {
      failed++;
    }

    // Test 6: Revoke premium assignment
    if (await test('POST /admin/premium/revoke', async () => {
      const data = await request('/admin/premium/revoke', 'POST', {
        userId: testUserId,
      });
      if (!data.success) throw new Error('Response not successful');
      if (data.user?.premiumAssignment !== null) throw new Error('Premium assignment not cleared');
      
      log(`  Revoked premium from: ${testUserId}`, 'yellow');
    })) {
      passed++;
    } else {
      failed++;
    }

    // Test 7: Verify revocation
    if (await test('GET /admin/premium/list (verify revocation)', async () => {
      const data = await request('/admin/premium/list');
      if (!data.success) throw new Error('Response not successful');
      
      const assignment = data.assignments.find(a => a.userId === testUserId);
      if (assignment) throw new Error(`Premium still exists after revocation for ${testUserId}`);
      
      log(`  Verified revocation`, 'yellow');
    })) {
      passed++;
    } else {
      failed++;
    }
  } else {
    log('\n⚠ Skipping premium assignment/revocation tests (no test user)', 'yellow');
    failed += 5; // Count as failures since they weren't run
  }

  // Summary
  log(`\n=== Test Summary ===\n`, 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`Total: ${passed + failed}`, 'blue');

  if (failed > 0) {
    process.exit(1);
  }
}

// Check for admin API key
if (!ADMIN_API_KEY) {
  log('ERROR: SUPABASE_ADMIN_API_KEY environment variable not set', 'red');
  log('Set it via: export SUPABASE_ADMIN_API_KEY=your-key-here', 'yellow');
  process.exit(1);
}

runTests().catch(err => {
  log(`Fatal error: ${err.message}`, 'red');
  process.exit(1);
});
