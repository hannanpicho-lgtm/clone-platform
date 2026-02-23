# Developer Quick Reference: Profit Sharing & Invitation System

## URLs & Tokens

**Base URL:** `https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3`

**Auth Header:** `Authorization: Bearer {accessToken}`  
(Get token from `/signin` response)

## Quick API Reference

### 1. User Registration

```bash
# Sign up NEW user
curl -X POST "{BASE_URL}/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@tank.local",
    "password": "Pass123",
    "name": "User Name",
    "withdrawalPassword": "WithdrawPass",
    "gender": "male"
  }'

# Response includes invitationCode to share with others
```

### 2. Sign Up With Referral

```bash
# Sign up CHILD user (referred by parent)
curl -X POST "{BASE_URL}/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "child@tank.local",
    "password": "Pass123",
    "name": "Child User",
    "withdrawalPassword": "WithdrawPass",
    "gender": "female",
    "invitationCode": "ABC12345"  # Parent's invitation code
  }'

# Response includes parentUserId confirmation
```

### 3. Sign In

```bash
# Sign in to get access token
curl -X POST "{BASE_URL}/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@tank.local",
    "password": "Pass123"
  }'

# Response includes session with access_token
```

### 4. Submit Product (Earn Money)

```bash
# User submits product → gets 80% of value
# Parent gets 20% of value (if child)
curl -X POST "{BASE_URL}/submit-product" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{
    "productName": "Product Title",
    "productValue": 1000
  }'

# Response:
# {
#   "success": true,
#   "product": {
#     "name": "Product Title",
#     "value": 1000,
#     "userEarned": 800,      ← User gets 80%
#     "parentShare": 200      ← Parent gets 20%
#   },
#   "newBalance": 800
# }
```

### 5. Check Earnings

```bash
# View balance and commission info
curl -X GET "{BASE_URL}/earnings" \
  -H "Authorization: Bearer {accessToken}"

# Response:
# {
#   "earnings": {
#     "balance": 1200,               # Total balance
#     "totalEarned": 2000,           # From all products
#     "fromDirectChildren": 200,     # Commission from children
#     "childCount": 2,              # Number of referrals
#     "totalFromChildren": 400       # Total commission from all
#   }
# }
```

### 6. View Referrals

```bash
# Parent views all referrals and commission
curl -X GET "{BASE_URL}/referrals" \
  -H "Authorization: Bearer {accessToken}"

# Response:
# {
#   "referrals": [
#     {
#       "childId": "user-123",
#       "childName": "Child User",
#       "childEmail": "child@tank.local",
#       "totalSharedProfit": 400,    # Total commission from this child
#       "lastProductAt": "2026-02-22T22:30:00Z"
#     }
#   ],
#   "totalChildren": 1
# }
```

## Common Workflows

### Workflow 1: New User Registration

```
1. User fills signup form:
   - email
   - password
   - name (username)
   - withdrawalPassword
   - gender (male/female)
   - invitationCode (optional)

2. App calls POST /signup with all fields

3. Backend:
   ✓ Creates auth user
   ✓ Generates unique invitation code
   ✓ Links to parent if code valid
   ✓ Initializes KV profile

4. App receives invitationCode to show user

5. User can share code with others
```

### Workflow 2: Referral Registration

```
1. User gets parent's invitation code (ABC12345)

2. User signs up with invitation code:
   POST /signup {
     ...email, password, name...,
     invitationCode: "ABC12345"
   }

3. Backend:
   ✓ Validates ABC12345 exists
   ✓ Gets parent user ID
   ✓ Links child → parent
   ✓ Updates parent's child count

4. Parent now can earn commission from child
```

### Workflow 3: Earning & Commission

```
1. Child submits product (value: 1000)
   POST /submit-product {
     productName: "Service",
     productValue: 1000
   }

2. Profit split:
   Child receives: 1000 * 0.8 = 800
   Parent receives: 1000 * 0.2 = 200

3. Balances updated:
   - child.balance += 800
   - parent.balance += 200

4. Referral tracked:
   - referral:${parentId}:${childId}.totalSharedProfit += 200

5. Both can check earnings via GET /earnings
```

## Profile Structure

### User Profile (in KV as `user:{userId}`)
```javascript
{
  id: "uuid",
  email: "user@tank.local",
  name: "User Name",
  username: "username",              // NEW
  gender: "male" | "female",        // NEW
  withdrawalPassword: "password",    // NEW
  invitationCode: "ABC12345",        // NEW - generated
  parentUserId: "uuid" | null,       // NEW - if referred
  vipTier: "Normal" | "Silver" | ...,
  childCount: 0,                     // NEW - referral count
  totalProfitFromChildren: 0,        // NEW - total commission
  balance: 0,
  createdAt: "2026-02-22T..."
}
```

## Key-Value Store Keys

```
user:{userId}              → User profile
invitecode:{code}          → Code lookup (code → userId)
metrics:{userId}           → User metrics
profits:{userId}           → Profit tracking
referral:{parentId}:{childId} → Referral relationship
product:{userId}:{timestamp}  → Product log
```

## Testing with JavaScript

```javascript
// Simple fetch test
const ENDPOINT = "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3";

// Sign up
const signupRes = await fetch(`${ENDPOINT}/signup`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "test@tank.local",
    password: "Pass123",
    name: "Test User",
    withdrawalPassword: "WithdrawPass",
    gender: "male"
  })
});

const userData = await signupRes.json();
console.log("Invitation code:", userData.user.invitationCode);

// Sign in
const signinRes = await fetch(`${ENDPOINT}/signin`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "test@tank.local",
    password: "Pass123"
  })
});

const sessionData = await signinRes.json();
const token = sessionData.session.access_token;

// Submit product
const productRes = await fetch(`${ENDPOINT}/submit-product`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({
    productName: "My Product",
    productValue: 1000
  })
});

const result = await productRes.json();
console.log("Earned:", result.product.userEarned);
```

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Bad request | Check request format and required fields |
| 401 | Unauthorized | Include Authorization header with valid token |
| 404 | Not found | User/invitation code doesn't exist |
| 500 | Server error | Check backend logs, may be temporary |

## Profit Share Formula

```
// When child submits product worth X:
Child Balance += X * 0.8          // 80%
Parent Balance += X * 0.2         // 20%

// Example: Child submits 1000
Child gets: 1000 * 0.8 = 800
Parent gets: 1000 * 0.2 = 200
Total: 800 + 200 = 1000 ✓
```

## Debugging Tips

1. **Check user exists:**
   ```
   GET /profile with user's token
   → Shows invitationCode and parentUserId
   ```

2. **Verify parent link:**
   ```
   GET /profile on child account
   → Check parentUserId field is set
   ```

3. **Check commission:**
   ```
   GET /earnings as parent
   → Verify fromDirectChildren and childCount
   ```

4. **List children:**
   ```
   GET /referrals as parent
   → Shows all children and commission per child
   ```

5. **Debug product submission:**
   ```
   Submit product with small value (e.g., 100)
   Check both user and parent balances
   Verify referral relationship updated
   ```

## Common Issues

**Problem:** "User already exists"
- **Cause:** Email was already registered
- **Solution:** Use different email or sign in existing account

**Problem:** "Invalid invitation code"
- **Cause:** Code doesn't exist or is misspelled
- **Solution:** Verify code from parent's signup response

**Problem:** "No commission showing"
- **Cause:** Product value not submitted or parent not linked
- **Solution:** Verify parentUserId in child profile

**Problem:** "Authorization error"
- **Cause:** Missing or invalid access token
- **Solution:** Get token from signin response, include in Authorization header

## Next Steps for Frontend

1. **Show invitation code:**
   - Display in profile/settings
   - Copy-to-clipboard button
   
2. **Accept invitation code:**
   - Input field in signup form ✅ (already done)
   
3. **Show earnings dashboard:**
   - Call GET /earnings periodically
   - Display balance, totalEarned, childCount
   
4. **Show referrals:**
   - Call GET /referrals
   - List children with profit shared
   
5. **Product submission form:**
   - Create form for productName and productValue
   - Call POST /submit-product
   - Show success with earned amount

## Database Schema Version

- **Current:** 1.1
- **Includes:** New profit sharing fields
- **Migration:** Automatic on first signup

---

**Quick Tip:** Save this document locally, reference the API calls, modify the email/values for testing!
