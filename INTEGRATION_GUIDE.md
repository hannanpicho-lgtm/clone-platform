# Clone Platform - Integration Guide

**For**: Partners, Mobile Apps, Third-party Integrations  
**Updated**: February 23, 2026

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Management Flow](#user-management-flow)
3. [Earning Money Flow](#earning-money-flow)
4. [Customer Support Integration](#customer-support-integration)
5. [Admin Integration](#admin-integration)
6. [Common Patterns](#common-patterns)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### 1. Get Your API Credentials

**For Testing/Development**:
- Use the Supabase Anon Key (found in project settings)
- Works for user operations

**For Admin Access**:
- Use the Service Role Key from Supabase
- Keep this **secret** - never expose in client apps

### 2. Understand Authentication

```
User Operations: Bearer Token (from /signup or /signin)
Admin Operations: Admin API Key (from Supabase console)
```

### 3. Set Your Base URL

```
https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3
```

---

## User Management Flow

### Sign Up New User

```javascript
// Step 1: Send signup request
const signupRes = await fetch('${BASE_URL}/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    name: 'John',
    gender: 'male',
    withdrawalPassword: 'WithdrawPass456!',
    invitationCode: 'OPTIONAL_PARENT_CODE' // Links to parent
  })
});

const { user, session } = await signupRes.json();
const token = session.access_token;

// Step 2: Store token securely
localStorage.setItem('authToken', token); // ⚠️ Only for web apps
// For mobile: Use secure storage / keychain
```

### Sign In Existing User

```javascript
const signinRes = await fetch('${BASE_URL}/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!'
  })
});

const { session } = await signinRes.json();
const token = session.access_token;
```

### Get User Profile

```javascript
const token = localStorage.getItem('authToken');

const profileRes = await fetch('${BASE_URL}/profile', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const profile = await profileRes.json();
console.log(`User: ${profile.name}, Balance: $${profile.balance}`);
```

---

## Earning Money Flow

### Referral Network Setup

**Flow**:
1. Parent signs up, gets invitation code (e.g., "ABC123XY")
2. Parent shares code with children
3. Children signup with parent's code
4. Parent earns 10% on child's products
5. Parent earns 5% on grandchild's products

**Example**:

```javascript
// Parent signup
const parent = await fetch('${BASE_URL}/signup', {
  method: 'POST',
  body: JSON.stringify({
    email: 'parent@example.com',
    password: 'ParentPass123!',
    name: 'Parent Name'
  })
}).then(r => r.json());

const parentCode = parent.user.invitationCode; // "ABC123XY"

// Child signup with parent code
const child = await fetch('${BASE_URL}/signup', {
  method: 'POST',
  body: JSON.stringify({
    email: 'child@example.com',
    password: 'ChildPass123!',
    name: 'Child Name',
    invitationCode: parentCode // Links to parent
  })
}).then(r => r.json());

// Parent verifies child in their network
const parentToken = parent.session.access_token;
const referrals = await fetch('${BASE_URL}/referrals', {
  headers: { 'Authorization': `Bearer ${parentToken}` }
}).then(r => r.json());

console.log(`Parent has ${referrals.totalChildren} children`);
```

### Submit Products & Earn

```javascript
const submitRes = await fetch('${BASE_URL}/submit-product', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    productName: 'Amazing Software',
    productValue: 1000
  })
});

const result = await submitRes.json();
console.log(`
  Product: ${result.product.name}
  You earned: $${result.product.userEarned}
  Parent earned: $${result.product.commissionsCascade[0]?.amount || 0}
`);
```

### Check Earnings

```javascript
const earningsRes = await fetch('${BASE_URL}/earnings', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const earnings = await earningsRes.json();
console.log(`
  Balance: $${earnings.balance}
  Total earned: $${earnings.totalEarned}
  From direct children: $${earnings.fromDirectChildren}
  From indirect referrals: $${earnings.fromIndirectReferrals}
`);
```

---

## Customer Support Integration

### Create Support Ticket

```javascript
const ticketRes = await fetch('${BASE_URL}/support-tickets', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    subject: 'Help with withdrawal',
    description: 'I submitted a withdrawal but haven\'t received it yet'
  })
});

const { ticket } = await ticketRes.json();
console.log(`Ticket created: ${ticket.id}`);
```

### Live Chat

```javascript
// Send message
const chatRes = await fetch('${BASE_URL}/chat/messages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'What\'s the withdrawal minimum?'
  })
});

// Get chat history
const historyRes = await fetch('${BASE_URL}/chat/messages', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { messages } = await historyRes.json();
messages.forEach(msg => {
  console.log(`${msg.author}: ${msg.message}`);
});
```

### Access FAQ

```javascript
// List all FAQs
const faqRes = await fetch('${BASE_URL}/faq');
const { faqs } = await faqRes.json();

// Search FAQs
const searchRes = await fetch('${BASE_URL}/faq/search?q=withdrawal');
const { results } = await searchRes.json();
```

---

## Admin Integration

### List All Premium Assignments

```javascript
const adminKey = process.env.SUPABASE_ADMIN_API_KEY;

const premiumRes = await fetch('${BASE_URL}/admin/premium/list', {
  headers: { 'Authorization': `Bearer ${adminKey}` }
});

const { assignments } = await premiumRes.json();
assignments.forEach(a => {
  console.log(`${a.userName}: $${a.assignment.amount} (frozen: ${a.accountFrozen})`);
});
```

### Assign Premium Product

```javascript
const assignRes = await fetch('${BASE_URL}/admin/premium', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'user-uuid',
    amount: 10000,
    position: 1
  })
});

const { user, result } = await assignRes.json();
console.log(`Assigned $${result.boostedCommission}, frozen: ${result.frozen}`);
```

### Get Analytics Dashboard

```javascript
const analyticsRes = await fetch('${BASE_URL}/admin/premium/analytics', {
  headers: { 'Authorization': `Bearer ${adminKey}` }
});

const { analytics } = await analyticsRes.json();
console.log(`
  Total assignments: ${analytics.totalAssignments}
  Total premium value: $${analytics.totalPremiumValue}
  Frozen accounts: ${analytics.frozenAccounts}
`);
```

### Manage Withdrawals

```javascript
// List pending withdrawals
const withdrawalsRes = await fetch('${BASE_URL}/admin/withdrawals?status=pending', {
  headers: { 'Authorization': `Bearer ${adminKey}` }
});

const { withdrawals } = await withdrawalsRes.json();

// Approve a withdrawal
const approveRes = await fetch('${BASE_URL}/admin/approve-withdrawal', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    withdrawalId: 'wd-uuid'
  })
});
```

---

## Common Patterns

### Error Handling

```javascript
async function apiCall(endpoint, options = {}) {
  try {
    const res = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error: ${error.message}`);
    // Re-throw for calling code to handle
    throw error;
  }
}

// Usage
try {
  const profile = await apiCall('${BASE_URL}/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(profile);
} catch (error) {
  // Show error to user
  alert(`Failed to load profile: ${error.message}`);
}
```

### Pagination

```javascript
async function getAllUsers(adminKey, limit = 50) {
  const users = [];
  let offset = 0;

  while (true) {
    const res = await fetch(
      `${BASE_URL}/admin/users?limit=${limit}&offset=${offset}`,
      { headers: { 'Authorization': `Bearer ${adminKey}` } }
    );
    
    const { users: batch, total } = await res.json();
    users.push(...batch);

    if (users.length >= total) break;
    offset += limit;
  }

  return users;
}
```

### Retry Logic

```javascript
async function apiCallWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}

// Usage
const profile = await apiCallWithRetry(() =>
  fetch('${BASE_URL}/profile', { headers: {...} })
);
```

### Session Management

```javascript
class SessionManager {
  constructor() {
    this.token = localStorage.getItem('authToken');
    this.expiresAt = parseInt(localStorage.getItem('expiresAt'));
  }

  isTokenValid() {
    return this.token && Date.now() < this.expiresAt;
  }

  async ensureValidToken() {
    if (!this.isTokenValid()) {
      await this.refreshToken();
    }
  }

  storetToken(accessToken, expiresIn) {
    this.token = accessToken;
    this.expiresAt = Date.now() + expiresIn * 1000;
    
    localStorage.setItem('authToken', this.token);
    localStorage.setItem('expiresAt', this.expiresAt);
  }

  async refreshToken() {
    // Redirect to login or request new token
    throw new Error('Token expired - please login again');
  }

  logout() {
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('expiresAt');
  }
}
```

---

## Troubleshooting

### "Unauthorized - Invalid token"

**Causes**:
1. Token expired (valid for 1 hour)
2. Token not in header correctly
3. Wrong token format

**Solution**:
```javascript
// ❌ Wrong
headers: { 'Authorization': 'eyJhbGc...' }

// ✅ Correct
headers: { 'Authorization': 'Bearer eyJhbGc...' }
```

### "User not found"

**Causes**:
1. User ID doesn't exist
2. User was deleted
3. Wrong project

**Solution**:
- Verify user ID is correct
- Check you're using the right project

### "Insufficient balance"

**Causes**:
1. User requested withdrawal > balance
2. Premium product froze account for top-up

**Solution**:
```javascript
// Check balance before withdrawal
const profile = await apiCall('${BASE_URL}/profile', {...});
if (withdrawalAmount > profile.balance) {
  throw new Error(`Insufficient balance. Available: $${profile.balance}`);
}
```

### "Premium assignment failed"

**Causes**:
1. User doesn't exist
2. Invalid amount (must be > 0)
3. Invalid position (must be integer > 0)

**Solution**:
```javascript
// Validate before sending
if (amount <= 0) throw new Error('Amount must be > 0');
if (!Number.isInteger(position) || position <= 0) throw new Error('Position must be positive integer');
if (!userId) throw new Error('User ID required');
```

### CORS Issues

**In Browser**:
- API is properly CORS-enabled
- Requests must include proper headers

**In Node.js**:
- No CORS issues (backend to backend)
- Just make sure you have network access

### Rate Limit Exceeded

**Signs**:
- Sudden 429 responses
- Multiple rapid requests to same endpoint

**Solution**:
```javascript
async function waitForRateLimit() {
  await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds
}

if (response.status === 429) {
  await waitForRateLimit();
  // Retry request
}
```

---

## Next Steps

1. **Read [API_REFERENCE.md](API_REFERENCE.md)** for complete endpoint documentation
2. **Check [openapi.yaml](openapi.yaml)** for OpenAPI spec
3. **Create support ticket** if you hit issues
4. **Join integration channel** for partner updates

---

**Questions?** email: support@cloneplatform.local  
**Issues?** Use `/support-tickets` endpoint  
**Chat?** Use `/chat` endpoint
