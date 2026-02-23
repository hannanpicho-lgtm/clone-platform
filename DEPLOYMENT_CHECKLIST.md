# Deployment Checklist & API Testing Guide

## Pre-Deployment Verification

- [ ] Backend code changes reviewed and tested locally
- [ ] Frontend builds successfully: `npm run build`
- [ ] No TypeScript errors in IDE
- [ ] New API endpoints documented
- [ ] KV store schema defined
- [ ] Profit share percentages configured (80/20)
- [ ] Invitation code generation tested
- [ ] Parent-child linking logic verified

## Deployment Steps

### Step 1: Prepare Environment
```powershell
# Navigate to project directory
cd "c:\Users\Administrator\Documents\Clone platform with backend_4"

# Verify Supabase CLI is installed
npx supabase --version
# Should output: 2.76.12 or higher
```

### Step 2: Authenticate
```powershell
# Method A: Use Supabase login
npx supabase login
# This will open browser for authentication

# Method B: Set environment variable (if you have access token)
$env:SUPABASE_ACCESS_TOKEN = "your-token-here"
```

### Step 3: Deploy Function
```powershell
# Deploy the Edge Function
npx supabase functions deploy make-server-44a642d3 --no-verify-jwt

# Expected output:
# ✓ Deployed "make-server-44a642d3" at 
# https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3
```

### Step 4: Verify Deployment
```powershell
# Test health endpoint
$response = Invoke-WebRequest -Uri `
  "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/health"
$response.StatusCode  # Should be 200
```

### Step 5: Run Smoke Tests
```powershell
# Execute test script
node test-new-endpoints.js
```

## API Testing Guide

### Test Environment Setup

**Base URL:**
```
https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3
```

**Authentication:**
```
Authorization: Bearer {accessToken}
```
(Get `accessToken` from `/signin` response)

### Test Scenarios

#### Scenario 1: Complete Signup & Login Flow

**1a. Sign up as Parent User**
```bash
curl -X POST "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@tank.local",
    "password": "ParentPass123",
    "name": "Parent User",
    "withdrawalPassword": "WithdrawPass123",
    "gender": "male"
  }'

# Response:
# {
#   "success": true,
#   "user": {
#     "id": "user-id-1",
#     "email": "parent@tank.local",
#     "name": "Parent User",
#     "invitationCode": "ABC12345",  <-- Save this
#     "vipTier": "Normal"
#   }
# }
```

**1b. Sign in as Parent**
```bash
curl -X POST "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@tank.local",
    "password": "ParentPass123"
  }'

# Response:
# {
#   "success": true,
#   "session": {
#     "access_token": "eyJ0eXAiOiJKV1QiLC...",  <-- Save this
#     "token_type": "bearer",
#     ...
#   }
# }
```

**1c. Get Parent Profile**
```bash
curl -X GET "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/profile" \
  -H "Authorization: Bearer {accessToken from 1b}"

# Response includes: username, gender, withdrawalPassword, invitationCode, etc.
```

#### Scenario 2: Referral Signup

**2a. Sign up as Child User (using Parent's Invitation Code)**
```bash
curl -X POST "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "child@tank.local",
    "password": "ChildPass123",
    "name": "Child User",
    "withdrawalPassword": "ChildWithdraw123",
    "gender": "female",
    "invitationCode": "ABC12345"  <-- Parent's code from 1a
  }'

# Response:
# {
#   "success": true,
#   "user": {
#     "id": "user-id-2",
#     "email": "child@tank.local",
#     "name": "Child User",
#     "invitationCode": "XYZ67890",  <-- Child's own code
#     "parentUserId": "user-id-1"    <-- Parent linked (NEW)
#   }
# }
```

**2b. Sign in as Child**
```bash
curl -X POST "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "child@tank.local",
    "password": "ChildPass123"
  }'

# Save access_token for child
```

#### Scenario 3: Product Submission & Commission

**3a. Child Submits Product (Worth 1000)**
```bash
curl -X POST "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/submit-product" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {child accessToken from 2b}" \
  -d '{
    "productName": "Premium Service",
    "productValue": 1000
  }'

# Response:
# {
#   "success": true,
#   "product": {
#     "name": "Premium Service",
#     "value": 1000,
#     "userEarned": 800,      <-- 80% to child
#     "parentShare": 200      <-- 20% to parent
#   },
#   "newBalance": 800
# }
```

**3b. Check Child's Earnings**
```bash
curl -X GET "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/earnings" \
  -H "Authorization: Bearer {child accessToken from 2b}"

# Response:
# {
#   "success": true,
#   "earnings": {
#     "balance": 800,
#     "totalEarned": 800,
#     "fromDirectChildren": 0,
#     "fromIndirectReferrals": 0,
#     "childCount": 0,
#     "totalFromChildren": 0,
#     "parentUserId": "user-id-1"
#   }
# }
```

**3c. Check Parent's Earnings (Should Include Commission)**
```bash
curl -X GET "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/earnings" \
  -H "Authorization: Bearer {parent accessToken from 1b}"

# Response:
# {
#   "success": true,
#   "earnings": {
#     "balance": 200,                <-- Commission from child
#     "totalEarned": 200,
#     "fromDirectChildren": 200,     <-- 20% from child's product
#     "fromIndirectReferrals": 0,
#     "childCount": 1,               <-- Child added (NEW)
#     "totalFromChildren": 200,      <-- Total commission from all children
#     "parentUserId": null           <-- Parent has no parent
#   }
# }
```

#### Scenario 4: View Referrals

**4a. Parent Views Referrals**
```bash
curl -X GET "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/referrals" \
  -H "Authorization: Bearer {parent accessToken from 1b}"

# Response:
# {
#   "success": true,
#   "referrals": [
#     {
#       "childId": "user-id-2",
#       "childName": "Child User",
#       "childEmail": "child@tank.local",
#       "totalSharedProfit": 200,    <-- Commission earned from this child
#       "lastProductAt": "2026-02-22T22:30:00.000Z",
#       "createdAt": "2026-02-22T22:25:00.000Z"
#     }
#   ],
#   "totalChildren": 1
# }
```

**4b. Child Views Referrals (Should Be Empty)**
```bash
curl -X GET "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/referrals" \
  -H "Authorization: Bearer {child accessToken from 2b}"

# Response:
# {
#   "success": true,
#   "referrals": [],
#   "totalChildren": 0
# }
```

#### Scenario 5: Multi-Level Referral (Future)

**5a. Grandchild Signs Up**
```bash
curl -X POST "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "grandchild@tank.local",
    "password": "GrandchildPass123",
    "name": "Grandchild User",
    "withdrawalPassword": "GrandchildWith123",
    "gender": "male",
    "invitationCode": "XYZ67890"  <-- Child's code from 2a
  }'

# Response contains parentUserId: "user-id-2" (child is parent)
```

**5b. Grandchild Submits Product**
```bash
curl -X POST "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/submit-product" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {grandchild accessToken}" \
  -d '{
    "productName": "Service",
    "productValue": 500
  }'

# Currently:
# - Grandchild gets 400 (80%)
# - Child gets 100 (20% as direct parent)
# - Parent gets 0 (multi-level not implemented yet)

# Future: Parent should also get % from grandchild's commission
```

## Expected Behavior

### Before Deployment
```
❌ Endpoints not available
❌ Invitation codes not generated
❌ Parent-child linking not working
❌ Commission not distributed
```

### After Deployment
```
✅ All endpoints working
✅ Every user gets unique invitation code
✅ Users can signup with parent's code
✅ Child balance reduced, parent balance increased by commission
✅ Referral relationships tracked
✅ Earnings show commission breakdowns
```

## Rollback Plan

If deployment causes issues:

```powershell
# Revert to previous version (if available)
npx supabase functions deploy make-server-44a642d3 \
  --import-map "./import_map.json" \
  [path-to-previous-version]

# Or redeploy skeleton version
npx supabase functions deploy make-server-44a642d3 --no-verify-jwt
```

## Performance Considerations

- Each signup creates 3-4 KV writes (user profile, metrics, profits, invite code)
- Product submission creates multiple KV reads/writes (user, parent, referral update)
- Referral lookup uses `getByPrefix` which can be slow with many children
- Consider caching for high-traffic scenarios

## Monitoring

Monitor KV store growth:
```
- user:* keys (one per user)
- invitecode:* keys (one per user)
- profits:* keys (one per user)
- product:* keys (many per user over time)
- referral:* keys (one per parent/child relationship)
```

Estimate: ~5 KV entries per active user

---

**Version:** 1.0
**Last Updated:** 2026-02-22
**Prepared By:** Backend Development Team
