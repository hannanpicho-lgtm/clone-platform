# Production Deployment & Operations Runbook

**For**: DevOps, Operations, Product Teams  
**Last Updated**: February 23, 2026  
**Status**: ✅ Ready for Production

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Production Deployment](#production-deployment)
3. [Monitoring & Alerts](#monitoring--alerts)
4. [Common Operations](#common-operations)
5. [Incident Response](#incident-response)
6. [Rollback Procedures](#rollback-procedures)
7. [Performance Tuning](#performance-tuning)

---

## Pre-Deployment Checklist

### Code Quality

- [ ] **All Tests Pass**: `npm run test:smoke` (should show 27/27 passing)
  ```bash
  npm run test:smoke
  # Expected output: 27 passing tests
  ```

- [ ] **No Lint Errors**: `npm run lint` (if configured)
  ```bash
  npm run lint
  # Expected: No errors, only warnings acceptable
  ```

- [ ] **Type Safety**: TypeScript compiles without errors
  ```bash
  npx tsc --noEmit
  # Expected: No output (success) or warnings only
  ```

### Security Validation

- [ ] **Admin Key Not Exposed**: Verify `.env.local` is in `.gitignore`
  ```bash
  git check-ignore .env.local
  # Expected: .env.local
  ```

- [ ] **JWT Validation Working**: Health check succeeds
  ```bash
  curl -X GET https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/health
  # Expected: { "status": "ok" }
  ```

- [ ] **No Hardcoded Secrets**: Grep for API keys
  ```bash
  grep -r "sk-" src/ --exclude-dir=node_modules
  # Expected: No results
  ```

### Environment Setup

- [ ] **Production Variables Set**
  ```bash
  # In Supabase project settings
  - SUPABASE_URL: Set
  - SUPABASE_ANON_KEY: Set
  - SUPABASE_SERVICE_ROLE_KEY: Set (for admin operations)
  - DEPLOYMENT_ENV: "production"
  ```

- [ ] **Database Migrations Complete**: KV store tables exist
  ```sql
  SELECT * FROM kv_store_44a642d3 LIMIT 1;
  -- Expected: Table exists (may be empty)
  ```

### Backup Strategy

- [ ] **Database Backup**: Supabase automatic backups enabled
  - Check: Settings → Backups → "Automated backups" toggle
  - Frequency: Daily (7-day retention)

- [ ] **Function Code Backed Up**: Latest code committed to Git
  ```bash
  git status
  # Expected: Working tree clean
  ```

---

## Production Deployment

### Step 1: Deploy Edge Function

```bash
# Install dependencies
npm install

# Verify build succeeds
npm run build

# Deploy to Supabase (via provided script or manual)
npx supabase functions deploy make-server-44a642d3 --no-verify-jwt

# Expected output:
# ✓ Function deployed successfully
# ✓ Available at: https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3
```

**Note**: The `--no-verify-jwt` flag is required because Supabase gateway JWT signing is asymmetric. We verify JWTs at the application level.

### Step 2: Run Smoke Tests

```bash
# Run all smoke tests
npm run test:smoke

# Expected: 27/27 passing
# - 10 core endpoint tests
# - 10 customer service tests
# - 7 premium product tests
```

### Step 3: Verify Core Endpoints

```bash
# Health check
curl https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/health

# Test signup (creates user accounts, verify they're cleaned up after)
curl -X POST https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@test.com","password":"TestPass123!","name":"Test"}'
```

### Step 4: Verify Frontend Integration

```bash
# Build frontend
npm run build

# Start dev server (or deploy to Vercel/Netlify)
npm run dev

# Manual test in browser:
# 1. Navigate to dashboard
# 2. Sign up with test account
# 3. Submit a product
# 4. Check earnings calculation
# 5. Create support ticket
# 6. Admin: Assign premium product
# 7. Verify account freeze status
```

### Step 5: Enable Monitoring

```bash
# In Supabase project:
1. Go to Functions → Logs
2. Set log level to "DEBUG" (temporarily)
3. Set up alerts for:
   - Function execution errors
   - High latency (> 5s)
   - Failed authentication (401 count spike)
```

### Step 6: Verify Admin Access

```bash
# Generate admin test
curl -X POST https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/admin-login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"YourAdminPassword"}'

# Verify premium endpoints work
curl -X GET https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/admin/premium/list \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Monitoring & Alerts

### Key Metrics to Watch

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error Rate | > 5% | Page on-call |
| Response Time (p95) | > 2s | Investigate database |
| Failed Auth | > 10/min | Check key rotation |
| Failed Withdrawals | > 2 per hour | Alert operations |
| Premium Assignments | Track count | Monthly trend |

### Supabase Monitoring

```bash
# View function logs
# Dashboard → Functions → Logs

# Real-time monitoring
# Tail logs: 
supabase functions logs make-server-44a642d3 -n 100
```

### Alert Rules (Set in Supabase)

**Error Spike**:
- Metric: Error rate
- Threshold: 10% over 5 minutes
- Action: Notify ops-oncall@company.com

**Database Slow**:
- Metric: Query duration
- Threshold: > 1000ms for 5 queries in 1 minute
- Action: Page database team

**Auth Failures**:
- Metric: 401 responses
- Threshold: > 50 in 5 minutes
- Action: Verify JWT configuration

### Health Dashboard

Create Supabase dashboard with:
- [ ] Request volume (RPS)
- [ ] Error rate %
- [ ] Auth success rate %
- [ ] Average response time
- [ ] P95 response time
- [ ] Premium assignments total
- [ ] Withdrawal count
- [ ] Support tickets pending

---

## Common Operations

### Adding New Admin User

```javascript
// In Supabase Auth:
1. Go to Authentication → Users
2. Click "Add user"
3. Email: admin@company.com
4. Password: Strong password
5. Email confirmed: Toggle ON
```

### Viewing Recent Transactions

```sql
-- Withdrawals submitted
SELECT user_id, amount, status, created_at 
FROM kv_store_44a642d3 
WHERE key LIKE 'withdrawal:%' 
ORDER BY created_at DESC 
LIMIT 20;
```

### Checking User Balance

```sql
SELECT * FROM kv_store_44a642d3 
WHERE key = 'user:USER_UUID' 
LIMIT 1;
-- Response will show balance in JSON value
```

### Checking Premium Assignments

```sql
SELECT key, value 
FROM kv_store_44a642d3 
WHERE key LIKE 'user:%' 
AND value::text LIKE '%premiumAssignment%';
```

### Creating Database Snapshot

```bash
# Via Supabase dashboard:
1. Go to Database → Backups
2. Click "Create Manual Backup"
3. Name: "Pre-deployment-YYYY-MM-DD"
4. Confirm
```

### Resetting Test Data

```bash
# Clear test users from KV store
-- Backup first!
DELETE FROM kv_store_44a642d3 
WHERE key LIKE 'user:%test%';
-- Or specific user:
DELETE FROM kv_store_44a642d3 
WHERE key = 'user:test-uuid-123';
```

---

## Incident Response

### Scenario 1: Function Not Responding

**Symptoms**: All requests timeout or return 500

**Quick Check**:
```bash
# 1. Verify function is deployed
supabase functions list

# 2. Check function logs for errors
supabase functions logs make-server-44a642d3 -n 50

# 3. Check database connection
# In Supabase: Settings → Database → Connection pooler status
```

**Resolution**:
```bash
# 1. Redeploy function
npx supabase functions deploy make-server-44a642d3 --no-verify-jwt

# 2. If still failing, check for database issues
#    - Storage quota exceeded?
#    - Connection pool exhausted?
#    - Network issues?

# 3. Clear function cache (if backend caching enabled)
# Ask Supabase support to flush CDN cache
```

### Scenario 2: Auth Token Invalid

**Symptoms**: All requests return "Invalid token" or 401

**Quick Check**:
```bash
# Verify token structure
curl -X POST https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/profile \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"

# Check token expiration
# Token in localStorage should have exp claim
# If expired: User needs to re-login
```

**Resolution**:
1. Check if auth service is working: `/signup` endpoint
2. If signup fails, Supabase Auth is down → escalate to Supabase
3. If signup works, users just need to re-authenticate

### Scenario 3: Premium Assignment Not Working

**Symptoms**: Admin can't assign premium, returns error

**Quick Check**:
```bash
# Verify admin key is valid
curl -X GET https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/admin/premium/list \
  -H "Authorization: Bearer ${ADMIN_KEY}" \
  -H "Content-Type: application/json"

# If 401: Admin key invalid or expired
# If 500: Database issue
```

**Resolution**:
1. Verify user exists: Check against `users` table in Supabase
2. Verify admin key is Service Role key (not Anon key)
3. Check database logs for constraint violations
4. Manual fix: Insert into KV store directly (if urgent)

### Scenario 4: Withdrawal Stuck in Pending

**Symptoms**: User withdrawal not approved, still pending after 24h

**Manual Resolution**:

```sql
-- View withdrawal
SELECT * FROM kv_store_44a642d3 
WHERE key = 'withdrawal:USER_UUID:WITHDRAWAL_ID';

-- Approve manually
UPDATE kv_store_44a642d3 
SET value = jsonb_set(value, '{status}', '"approved"') 
WHERE key LIKE 'withdrawal:%';

-- Or run endpoint manually (via admin API)
curl -X POST https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/admin/approve-withdrawal \
  -H "Authorization: Bearer ${ADMIN_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"withdrawalId":"wd-uuid"}'
```

---

## Rollback Procedures

### If Deployment Breaks Production

**Step 1: Immediate Rollback (< 5 min)**

```bash
# Get previous version from Git
git log --oneline supabase/functions/server/index.tsx | head -5

# Checkout previous working version
git checkout <previous-commit-hash> -- supabase/functions/server/index.tsx

# Redeploy
npm run build
npx supabase functions deploy make-server-44a642d3 --no-verify-jwt

# Verify it works
npm run test:smoke
```

**Step 2: Notify Team**

```bash
# Send to #incidents or status page:
"INCIDENT: Production down 15m. Rolled back to commit ABC123. 
Investigating root cause. ETA update in 30m."
```

**Step 3: Post-Mortem (next day)**

- What caused the issue?
- How do we prevent it?
- Add test case if possible

### If Database Gets Corrupted

**Step 1: Restore from Backup**

```bash
# In Supabase dashboard:
1. Go to Database → Backups
2. Find most recent working backup (before issue)
3. Click "Restore"
4. Confirm in modal
5. Wait for restore (5-15 min)
```

**Step 2: Re-run Schema**

```bash
# Re-apply KV store schema if needed
supabase db push

# Or manually in SQL editor:
CREATE TABLE IF NOT EXISTS kv_store_44a642d3 (
  key TEXT PRIMARY KEY,
  value JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Step 3: Rebuild Cache (if using)**

```bash
# If premium data cache is stale:
curl -X POST https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/admin/premium/refresh-cache \
  -H "Authorization: Bearer ${ADMIN_KEY}"
```

---

## Performance Tuning

### Database Query Optimization

**Problem**: Premium analytics endpoint slow (> 2s)

**Solution**:
```sql
-- Add index to speed up getByPrefix queries
CREATE INDEX idx_kv_store_key_prefix 
  ON kv_store_44a642d3 
  USING BTREE (key);

-- Analyze query plan
EXPLAIN ANALYZE 
SELECT * FROM kv_store_44a642d3 
WHERE key LIKE 'user:%';
```

### Caching Strategy

**Implement Response Caching** (if needed):
```typescript
// In function code
const cacheKey = `cache:earnings:${userId}`;
const cached = await kv.get(cacheKey);
if (cached) return cached;

// Calculate and cache for 5 minutes
const result = calculateEarnings(userId);
await kv.set(cacheKey, result, 300);
```

### Edge Function Optimization

**Reduce Function Size**:
```bash
# Check current size
npm run build
# Check dist/index.js size

# If too large (> 10MB):
# - Move unused code to separate function
# - Use tree-shaking (check vite.config.ts)
# - Remove console.logs in production
```

**Monitor Cold Starts**:
- First request after deploy takes ~2-3s (cold start)
- Subsequent requests < 100ms (warm)
- Monitor: If cold starts frequent, app isn't getting traffic

### Load Testing

```bash
# Before major launch:
npm install -g artillery

# Artillery script (load-test.yml):
config:
  target: https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: Signup Flow
    flow:
      - post:
          url: /signup
          json:
            email: "user{{$randomNumber(1, 1000)}}@test.com"
            password: "Test123!"
            name: "User"

# Run test
artillery run load-test.yml
```

Expected results for healthy system:
- Error rate < 1%
- P95 latency < 500ms
- Throughput: 100+ RPS

---

## Contact & Escalation

| Issue | Contact | Severity |
|-------|---------|----------|
| Function deployment | DevOps Team | P1 |
| Database performance | Database Team | P2 |
| Auth issues | Security Team | P1 |
| Premium billing | Finance Team | P2 |
| Support backlog | Customer Success | P3 |

---

## Useful Links

- **Supabase Dashboard**: https://app.supabase.com
- **GitHub Repo**: https://github.com/yourorg/clone-platform
- **Documentation**: See API_REFERENCE.md
- **OpenAPI Spec**: See openapi.yaml
- **Smoke Tests**: `npm run test:smoke`
- **Logs**: Supabase Dashboard → Functions → Logs

---

**Last Deployment**: [DATE]  
**Deployed By**: [PERSON]  
**Status**: ✅ Stable  
**Incidents This Month**: 0
