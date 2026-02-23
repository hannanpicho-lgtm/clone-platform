# Clone Platform - Quick Reference Card

**Print & Post**: Developer Quick Reference  
**Size**: Fits on desk (A4 page)

---

## 🚀 DEPLOYMENT

```bash
npm install
npm run build
npx supabase functions deploy make-server-44a642d3 --no-verify-jwt
npm run test:smoke  # Verify (expect: 27/27 passing)
```

---

## 📍 BASE URL

**Production**: `https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3`

**Local**: `http://localhost:3000` (with `npm run dev`)

---

## 🔑 AUTHENTICATION

All requests except public endpoints need auth header:

```bash
Authorization: Bearer <TOKEN>
```

Get token from `/signup` or `/signin` response.

---

## 🗂️ KEY FILES

| File | Purpose |
|------|---------|
| `supabase/functions/server/index.tsx` | ALL backend API logic |
| `src/app/components/Dashboard.tsx` | Main user dashboard |
| `src/app/components/AdminDashboard.tsx` | Admin panel |
| `test-*.js` | Smoke tests (27 total) |
| `API_REFERENCE.md` | Endpoint docs + examples |
| `openapi.yaml` | Machine-readable spec |
| `INTEGRATION_GUIDE.md` | Integration patterns |
| `OPERATIONS_RUNBOOK.md` | DevOps procedures |
| `TEAM_ONBOARDING.md` | New hire guide |

---

## 📋 COMMON COMMANDS

```bash
# Development
npm run dev              # Start dev server
npm run build           # Compile

# Testing
npm run test:smoke      # All tests (27)
npm run test:core       # Core only (10)
npm run test:customer   # Support systems (10)
npm run test:premium    # Premium products (7)

# Debugging
supabase functions logs make-server-44a642d3 -n 50

# Git
git log --oneline | head -10
git diff HEAD~1
```

---

## 🔧 ADDING AN ENDPOINT

1. **Backend** (`supabase/functions/server/index.tsx`):
```typescript
app.get('/my-endpoint', async (c) => {
  const token = c.req.header('authorization')?.split(' '][1];
  const user = await verifyToken(token);
  return c.json({ data: 'response' });
});
```

2. **Test** (`test-core-endpoints.js`):
```javascript
const res = await apiCall('/my-endpoint');
assert(res.data !== undefined);
```

3. **Frontend** (`src/app/components/Dashboard.tsx`):
```typescript
const data = await fetch(`${BASE_URL}/my-endpoint`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
```

4. **Deploy**:
```bash
npm run build && npx supabase functions deploy make-server-44a642d3
npm run test:smoke
```

---

## 🐛 DEBUGGING

**Endpoint returns 500?**
```bash
supabase functions logs make-server-44a642d3 -n 20
# Look for error message in logs
```

**Tests fail but manual API works?**
```bash
# Check environment variables
echo $FUNCTION_URL $SUPABASE_ANON_KEY
# Make sure test uses unique data (not hardcoded)
```

**Token invalid?**
```typescript
// Token format MUST be: "Bearer <token>"
// NOT: "<token>" or "bearer <token>"
const header = 'Authorization: Bearer eyJhbGc...';
```

---

## 💾 DATABASE OPERATIONS

**View user data**:
```sql
SELECT * FROM kv_store_44a642d3 
WHERE key = 'user:USER_UUID';
```

**List premium assignments**:
```sql
SELECT key FROM kv_store_44a642d3 
WHERE value::text LIKE '%premiumAssignment%';
```

**Delete test user** (backup first!):
```sql
DELETE FROM kv_store_44a642d3 
WHERE key = 'user:test-uuid';
```

---

## 📚 ENDPOINTS (30+)

### Auth (2)
- `POST /signup` - Create account
- `POST /signin` - Login

### Profile (2)
- `GET /profile` - User info
- `PUT /profile` - Update info

### Earnings (3)
- `GET /earnings` - Balance & totals
- `GET /referrals` - Network
- `GET /bonuses` - Bonuses

### Products (3)
- `POST /submit-product` - Submit new
- `GET /products` - List products
- `GET /product-reviews` - Reviews

### Support (7)
- `POST /support-tickets` - Create ticket
- `GET /support-tickets` - List tickets
- `POST /chat/messages` - Send message
- `GET /chat/messages` - Chat history
- `GET /faq` - FAQ list
- `GET /faq/search?q=term` - Search FAQ

### Financial (3)
- `POST /withdrawal` - Request withdrawal
- `GET /withdrawals` - History
- `GET /account-frozen-status` - Check freeze

### Admin (3)
- `GET /admin/withdrawals` - List pending
- `POST /admin/approve-withdrawal` - Approve
- `POST /admin-login` - Admin login

### Premium (4)
- `POST /admin/premium` - Assign
- `GET /admin/premium/list` - List assignments
- `POST /admin/premium/revoke` - Remove
- `GET /admin/premium/analytics` - Analytics

### System (1)
- `GET /health` - System status

---

## ⚡ COMMON PATTERNS

**Error Handling**:
```javascript
try {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
} catch (e) {
  console.error('API Error:', e.message);
  // Show user-friendly error
}
```

**Retry Logic**:
```javascript
async function retry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === maxRetries - 1) throw e;
      await new Promise(r => setTimeout(r, 2 ** i * 1000));
    }
  }
}
```

**Token Management**:
```typescript
const token = localStorage.getItem('authToken');
if (!token) {
  // Redirect to login
  window.location.href = '/login';
}
// Add to every request
headers: { 'Authorization': `Bearer ${token}` }
```

---

## 🚨 EMERGENCY PROCEDURES

**Production Down?**
```bash
# 1. Check function status
supabase functions list

# 2. View logs
supabase functions logs make-server-44a642d3 -n 50

# 3. Rollback to previous version
git checkout HEAD~1 -- supabase/functions/server/index.tsx
npm run build
npx supabase functions deploy make-server-44a642d3

# 4. Verify
npm run test:smoke
```

**Database Corrupted?**
```bash
# 1. Stop accepting requests (if needed)
# 2. Restore backup in Supabase: Applications → Backups
# 3. Verify data integrity
# 4. Redeploy function
```

---

## 📞 WHEN YOU'RE STUCK

1. **API docs**: See `API_REFERENCE.md`
2. **Code examples**: See `test-*.js` files (27 test cases)
3. **Integration patterns**: See `INTEGRATION_GUIDE.md`
4. **Check logs**: `supabase functions logs make-server-44a642d3`
5. **Ask in Slack**: #clone-platform-dev

---

## 🎯 TEST COVERAGE

```
✓ Core Endpoints        10/10 tests passing
✓ Customer Service      10/10 tests passing
✓ Premium Products       7/7 tests passing
─────────────────────────────────────────
✓ TOTAL                27/27 tests passing
```

Run anytime:
```bash
npm run test:smoke
```

---

## 📌 IMPORTANT NOTES

⚠️ **Never expose**:
- Service Role Key
- Admin API Key
- User passwords
- Withdrawal passwords

✅ **Always include**:
- Authorization header on protected endpoints
- Content-Type: application/json
- Proper error handling

🔐 **Auth Flow**:
```
User Email/Password → Supabase Auth → JWT Token → Bearer Header
```

📦 **Admin Operations**:
```
Use Service Role Key (not Anon Key)
Authorization: Bearer <SERVICE_ROLE_KEY>
```

---

## 🔄 RELEASE CHECKLIST

- [ ] `npm run test:smoke` passes (27/27)
- [ ] No console errors in DevTools
- [ ] Supabase function deployed
- [ ] `npm run build` succeeds
- [ ] Health check returns 200
- [ ] Admin endpoints return 401 without admin key
- [ ] User endpoints return 401 without token

---

**Print & Keep Handy!**

For full documentation, see:
- API_REFERENCE.md (how to use each endpoint)
- INTEGRATION_GUIDE.md (integration patterns)
- OPERATIONS_RUNBOOK.md (DevOps procedures)
- TEAM_ONBOARDING.md (new developer guide)
