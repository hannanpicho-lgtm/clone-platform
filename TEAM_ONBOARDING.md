# Team Onboarding Guide

**For**: New developers, QA engineers, product managers  
**Duration**: 30-60 minutes to get up to speed  
**Last Updated**: February 23, 2026

---

## Welcome to Clone Platform! 👋

This guide gets you productive in 30 minutes.

---

## 1. First Time Setup (10 minutes)

### Clone the Repository

```bash
git clone https://github.com/yourorg/clone-platform.git
cd clone-platform
```

### Install Dependencies

```bash
# Frontend & build tools
npm install

# Or if using yarn
yarn install
```

### Create Environment File

Create `.env.local`:

```bash
VITE_SUPABASE_URL=https://tpxgfjevorhdtwkesvcb.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_from_supabase
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_supabase
```

**Get Keys from**:
1. Log in to https://app.supabase.com
2. Select "Clone Platform" project
3. Settings → API → Copy keys

### Verify Setup

```bash
# Start dev server
npm run dev

# Should see: ✓ vite v4.x.x ready in XXXms
# Open http://localhost:5173

# Run tests
npm run test:smoke
# Should see: 27 passing tests
```

✅ **Setup complete!**

---

## 2. Architecture Overview (5 minutes)

```
┌─────────────────────────────────────────────┐
│       React Frontend (Dashboard)             │
│  - User signup/signin                        │
│  - Product submission                        │
│  - Earnings dashboard                        │
│  - Support tickets/chat                      │
│  - Admin premium management                  │
└────────────────┬────────────────────────────┘
                 │ HTTP API Calls
                 ▼
┌─────────────────────────────────────────────┐
│  Supabase Edge Functions (Backend)           │
│  - All business logic                        │
│  - User authentication                       │
│  - Referral system                           │
│  - Withdrawal processing                     │
│  - Premium product administration            │
└────────────────┬────────────────────────────┘
                 │ SQL/KV Operations
                 ▼
┌─────────────────────────────────────────────┐
│   Supabase PostgreSQL + KV Store             │
│  - User data                                 │
│  - Product submissions                       │
│  - Earnings records                          │
│  - Support tickets                           │
│  - Premium assignments                       │
└─────────────────────────────────────────────┘
```

**Key Tech Stack**:
- **Frontend**: React + TypeScript + Vite
- **Backend**: Hono.js (Edge Functions)
- **Database**: Supabase PostgreSQL + KV Store
- **Auth**: Supabase Auth (JWT)
- **Deployment**: Supabase Functions

---

## 3. Project Structure (5 minutes)

```
clone-platform/
├── src/
│   ├── app/
│   │   ├── App.tsx          ← Main app shell
│   │   └── components/
│   │       ├── Dashboard.tsx       ← User dashboard
│   │       ├── AdminDashboard.tsx ← Admin panel
│   │       ├── AuthPage.tsx        ← Signup/signin
│   │       ├── ProductsView.tsx    ← Product submission
│   │       ├── ActivityPage.tsx    ← Earnings tracking
│   │       ├── RecordsPage.tsx     ← Withdrawal history
│   │       ├── CustomerServiceChat.tsx ← Chat
│   │       ├── FAQPage.tsx         ← FAQ list
│   │       ├── PremiumMergedProduct.tsx ← Premium UI
│   │       └── ...other components
│   │   └── ui/               ← Shadcn UI components
│   ├── utils/
│   │   └── safeFetch.ts      ← API client with error handling
│   ├── styles/               ← CSS + tailwind
│   └── main.tsx              ← Entry point
│
├── supabase/
│   └── functions/
│       └── server/
│           └── index.tsx     ← ALL backend API logic (2424 lines)
│
├── test-*.js                 ← Smoke test suites
│   ├── test-core-endpoints.js
│   ├── test-customer-service.js
│   └── test-premium-endpoints.js
│
├── openapi.yaml              ← API specification
├── API_REFERENCE.md          ← API documentation
├── INTEGRATION_GUIDE.md       ← Integration patterns
├── OPERATIONS_RUNBOOK.md      ← DevOps guide
└── README.md

Key Files to Know:
- src/app/App.tsx = Where to add new pages
- supabase/functions/server/index.tsx = Where to add new APIs
- test-*.js = Where to see how endpoints work
```

---

## 4. Common Tasks (15 minutes)

### Task 1: Adding a New Endpoint

**Scenario**: Add endpoint to get user preferences

**Steps**:

1. **Add route in backend** (`supabase/functions/server/index.tsx`):
```typescript
app.get('/preferences', async (c) => {
  const token = c.req.header('authorization')?.split(' ')[1];
  const user = await verifyToken(token);
  
  const prefs = await kv.get(`user:${user.id}`);
  return c.json(prefs?.preferences || {});
});
```

2. **Test it** (before frontend):
```bash
curl -X GET http://localhost:3000/preferences \
  -H "Authorization: Bearer $TOKEN"
# Expected: JSON response with user preferences
```

3. **Call from frontend** (`src/app/components/Dashboard.tsx`):
```typescript
const [prefs, setPrefs] = useState(null);

useEffect(() => {
  fetch('/api/preferences', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(r => r.json())
    .then(setPrefs);
}, [token]);

return <div>{prefs?.theme === 'dark' ? '🌙' : '☀️'}</div>;
```

4. **Add smoke test** (`test-core-endpoints.js`):
```javascript
test('GET /preferences returns user prefs', async () => {
  const prefsRes = await apiCall('/preferences');
  assert(prefsRes.theme !== undefined);
});
```

5. **Deploy**:
```bash
npm run build
npx supabase functions deploy make-server-44a642d3
npm run test:smoke  # Verify
```

### Task 2: Fixing a Bug

**Scenario**: Premium assignment returns wrong amount

**Example workflow**:

```bash
# 1. Identify issue
# - User reports: "premium assignment shows $5000 instead of $2000"
# - Check test: npm run test:premium
# - Test passes → Bug is in calculation

# 2. Find code
# src/app/components/PremiumManagementPanel.tsx line 150
# supabase/functions/server/index.tsx line 1800

# 3. Trace execution
# Admin submits form → POST /admin/premium → calculates commission
# Check: Is amount multiplied by 2? Is position wrong?

# 4. Fix it
# Edit supabase/functions/server/index.tsx:
#   const boostedComm = amount * (position === 1 ? 2.5 : 1.5)
#                       ↓
#   const boostedComm = amount * (position === 1 ? 2.0 : 1.0)

# 5. Test it
# Create test user, assign premium, verify amount
npm run test:premium

# 6. Deploy
npm run build
npx supabase functions deploy make-server-44a642d3
npm run test:smoke  # Full regression

# 7. Verify in production
# Admin dashboard → assign test premium → check amount
```

### Task 3: Reading API Documentation

**Need to integrate with `/earnings` endpoint?**

1. Open [API_REFERENCE.md](API_REFERENCE.md)
2. Search for "Earnings"
3. See:
   - What auth is needed (Bearer token)
   - What it returns (balance, totalEarned, breakdown)
   - Error cases (401, 404)
   - JavaScript example
   - cURL example

**Need to check OpenAPI spec?**

1. Open [openapi.yaml](openapi.yaml)
2. Search for `/earnings`
3. See machine-readable spec (for code generation, Swagger UI, etc.)

---

## 5. Key Concepts

### Authentication Flow

```
User signs up with email/password
         ↓
Supabase creates user + JWT
         ↓
Frontend stores JWT in localStorage
         ↓
Every API request includes: Authorization: Bearer JWT_TOKEN
         ↓
Backend verifies JWT using verifyToken() function
         ↓
If valid, get user ID from token claims
         ↓
Return user-specific data
```

**Code Example**:
```typescript
// Backend
async function verifyToken(token: string) {
  try {
    const decoded = jwtDecode(token);
    return decoded; // { sub: user_id, email, ... }
  } catch (e) {
    throw new Error('Invalid token');
  }
}

// Frontend
const token = localStorage.getItem('authToken');
fetch(`${BASE_URL}/earnings`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Referral System

```
Parent (invitationCode: "ABC123")
    ├─ Child A
    │   ├─ Grandchild A1
    │   └─ Grandchild A2
    └─ Child B

Parent earns:
- 10% from each child's products
- 5% from each grandchild's products

Example:
- Child A submits $1000 product
  - Child A gets: $500 (50%)
  - Parent gets: $100 (10%)
  - Grandparent gets: $30 (3%)
```

### Premium Products

```
Admin assigns premium product to user:
- Amount: $5000
- Position: 1 (top-tier)

System automatically:
1. Deducts $5000 from user's balance (if not enough → error)
2. Freezes account (user can't withdraw until revoked)
3. Boosts referral commissions 2x (position 1) or 1.5x (position 2+)

Admin can later:
- View all premium assignments (analytics)
- Revoke premium → unfreezes account, refunds $5000
```

### KV Store (Data Persistence)

Not a typical database. More like a key-value store:

```
Key: "user:abc-123-def"
Value: {
  name: "John",
  email: "john@example.com",
  balance: 1500.00,
  premiumAssignment: null,
  ...more fields...
}

Key: "withdrawal:abc-123:wd-001"
Value: {
  amount: 250.00,
  status: "pending",
  createdAt: "2026-02-20T10:30:00Z"
}
```

**Common Operations**:
```typescript
const user = await kv.get('user:abc-123-def');
const updated = await kv.set('user:abc-123-def', {...user, balance: 2000});
const allUsers = await kv.getByPrefix('user:');
await kv.delete('withdrawal:abc-123:wd-001');
```

---

## 6. Debugging Tips

### Problem: "Unauthorized" error on API call

```typescript
// ❌ WRONG - Using wrong token
const token = sessionStorage.getItem('userId');  // This is user ID, not token!
fetch('/api/earnings', { headers: { 'Authorization': `Bearer ${token}` } });

// ✅ CORRECT - Using auth token
const token = sessionStorage.getItem('authToken');  // This is JWT!
fetch('/api/earnings', { headers: { 'Authorization': `Bearer ${token}` } });

// Check browser DevTools:
// Application → Storage → Local Storage → Look for 'authToken'
```

### Problem: API call returns 500

1. Check function logs:
```bash
supabase functions logs make-server-44a642d3 -n 20
```

2. Add debugging:
```typescript
// In backend
console.error('Premium assignment error:', error);
console.log('User:', userId, 'Amount:', amount);
return c.json({ error: error.message }, 500);
```

3. View logs:
```bash
# Terminal where function is running shows console.log/error
```

### Problem: Test fails but manual API call works

1. Check test environment variables:
```bash
echo $FUNCTION_URL  # Should be set
echo $SUPABASE_ANON_KEY  # Should be set
```

2. Make sure test creates unique data:
```typescript
// ❌ WRONG - Uses hardcoded test user
const user = await getUser('fixed-test-uuid');

// ✅ CORRECT - Creates new user each test
const user = await signup(`test-${Date.now()}@test.com`);
```

### Problem: Premium assignment amount is wrong

1. Check calculation in backend:
```typescript
// supabase/functions/server/index.tsx, search "boostedCommission"
const boostedComm = amount * (position === 1 ? 2.5 : 1.5);
```

2. Trace through test:
```bash
npm run test:premium -- --verbose
# Shows each step: create user → assign → verify
```

3. Manual verification:
```javascript
// Direct API call
const res = await fetch(`${BASE_URL}/admin/premium`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${ADMIN_KEY}` },
  body: JSON.stringify({ userId, amount: 5000, position: 1 })
});
console.log(await res.json());
// Check: boostedCommission matches position multiplier
```

---

## 7. Testing in Different Scenarios

### Test as Regular User

```bash
# 1. Signup
curl -X POST http://localhost:3000/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Test123!","name":"User"}'
# Response: { user: {...}, session: { access_token: "..." } }

# 2. Save token
TOKEN="eyJhbGc..." # from response

# 3. Get earnings
curl -X GET http://localhost:3000/earnings \
  -H "Authorization: Bearer $TOKEN"
```

### Test as Admin

```bash
# 1. Get admin key (Supabase console)
ADMIN_KEY="eyJhbGc..." # Service Role Key from Supabase

# 2. List withdrawals
curl -X GET http://localhost:3000/admin/withdrawals \
  -H "Authorization: Bearer $ADMIN_KEY"
```

### Test Premium Workflow

```bash
# Full workflow:
1. Create test user
2. Assign premium: $5000
3. Check: User balance decreased by 5000
4. Check: Account frozen
5. Revoke premium
6. Check: Balance refunded
7. Check: Account unfrozen
```

---

## 8. Common Questions

**Q: Where do I find API documentation?**
A: Three options:
- [API_REFERENCE.md](API_REFERENCE.md) - Human-readable with code examples
- [openapi.yaml](openapi.yaml) - Machine-readable spec
- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) - Integration patterns and examples

**Q: How do I add a new feature?**
A: 
1. Implement endpoint in `supabase/functions/server/index.tsx`
2. Add React component in `src/app/components/`
3. Add smoke test in `test-*.js`
4. Deploy and verify

**Q: How do withdrawals work?**
A: 
1. User submits with withdrawal password
2. Admin approves in dashboard
3. System marks as approved (actual payment happens externally)

**Q: Can I run backend locally?**
A: Not easily - it requires Supabase functions. Just:
- Use test deployment at tpxgfjevorhdtwkesvcb.supabase.co
- Or deploy own Supabase project

**Q: What if I break production?**
A: 
1. Check [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md) → Rollback Procedures
2. Most common: Redeploy previous commit
3. Database issues: Restore from backup

---

## 9. Next Steps

1. **Complete Setup**: Run `npm install && npm run dev`
2. **Read API Docs**: Spend 5 min on [API_REFERENCE.md](API_REFERENCE.md)
3. **Run Tests**: `npm run test:smoke` to see system working
4. **Pick First Task**: Ask your manager for a small feature/bug to start with
5. **Join Slack Channel**: #clone-platform-dev

---

## 10. Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Compile TypeScript

# Testing
npm run test:smoke      # Run all 27 smoke tests
npm run test:core       # Core endpoints only (10 tests)
npm run test:customer   # Customer service (10 tests)
npm run test:premium    # Premium products (7 tests)

# Deployment
npm run build
npx supabase functions deploy make-server-44a642d3

# Debugging
supabase functions logs make-server-44a642d3 -n 50  # Last 50 logs
git log --oneline | head -20                         # Recent commits
git diff HEAD~1 -- src/                              # What changed

# Database
# Use Supabase dashboard → SQL Editor
# Or use PostgreSQL client: psql postgresql://...
```

---

## Troubleshooting First Time Setup

| Problem | Solution |
|---------|----------|
| `npm install` fails | Delete `node_modules` and `package-lock.json`, run again |
| Tests fail immediately | Check `.env.local` has correct Supabase keys |
| Frontend won't load | Check `npm run dev` shows `✓ vite ready` |
| Endpoints return 401 | Token isn't being passed, or token is expired |
| Can't deploy function | Run `npm install` first, make sure TypeScript compiles |

---

## Getting Help

1. **Check Docs First**: [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md), [API_REFERENCE.md](API_REFERENCE.md)
2. **Check Tests**: `test-*.js` files show how to call endpoints
3. **Ask in Slack**: #clone-platform-dev
4. **Check Function Logs**: `supabase functions logs make-server-44a642d3`

---

## Welcome Aboard! 🚀

You're all set. Start with a small task, read the code, and don't hesitate to ask questions.

Happy coding!
