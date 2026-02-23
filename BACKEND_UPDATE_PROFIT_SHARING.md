# Backend Update: Invitation Codes & Profit Sharing System

## Changes Summary

This update implements a complete invitation code system with multi-level profit sharing for the TANK platform. Users can now generate invitation codes, invite others to join, and earn 20% of profits from their direct referrals.

## New Features

### 1. Invitation Code Generation
- Every new user receives a unique 8-character alphanumeric invitation code
- Code is automatically generated during signup and stored in the user profile
- Code can be shared with others to earn referral commission

### 2. Parent-Child User Linking
- Users can sign up using another user's invitation code
- This creates a parent-child relationship for commission tracking
- Child counts are tracked on parent profile
- Referral relationships are logged for commission distribution

### 3. Profit Sharing (20% to Parent)
- When a child user submits a product worth X amount:
  - Child receives 80% of the value: `0.8 × X`
  - Parent receives 20% of the value: `0.2 × X`
- Commission is automatically transferred to parent's balance
- Tracking data is maintained in referral relationship records

### 4. Training Accounts (Planned)
- Framework in place to support `accountType: 'training' | 'regular'`
- Currently defaults to 'regular' for all users
- Can be extended to implement different commission rates or restrictions

## Updated API Endpoints

### Extended Fields in User Profile

**Profile Structure (stored in KV):**
```typescript
{
  id: string;
  email: string;
  name: string;
  username?: string;
  vipTier: string;
  gender: 'male' | 'female';
  withdrawalPassword: string;
  invitationCode: string;          // Generated unique code
  parentUserId?: string;            // Parent user ID if referred
  childCount: number;               // Number of direct children
  totalProfitFromChildren: number;  // Total commission received
  balance: number;                  // User's balance
  createdAt: string;
}
```

### New User Profile Fields (from signup form)
- `username` - Username from registration form
- `withdrawalPassword` - Password for withdrawal operations
- `gender` - Male/Female selection from form
- `invitationCode` - Auto-generated unique code for referrals

### New Endpoints

#### 1. POST `/make-server-44a642d3/submit-product`
**Purpose:** User submits a product and receives profit distribution

**Request:**
```json
{
  "productName": "string",
  "productValue": number
}
```

**Headers:** `Authorization: Bearer {accessToken}`

**Response:**
```json
{
  "success": true,
  "product": {
    "name": "string",
    "value": number,
    "userEarned": number,
    "parentShare": number
  },
  "newBalance": number
}
```

**Behavior:**
- Calculates 80% for user, 20% for parent (if parent exists)
- Updates both user and parent balances
- Logs transaction in KV store
- Updates referral relationship with total profit shared

#### 2. GET `/make-server-44a642d3/earnings`
**Purpose:** Get user's earnings, balance, and referral income

**Headers:** `Authorization: Bearer {accessToken}`

**Response:**
```json
{
  "success": true,
  "earnings": {
    "balance": number,
    "totalEarned": number,
    "fromDirectChildren": number,
    "fromIndirectReferrals": number,
    "childCount": number,
    "totalFromChildren": number,
    "parentUserId": string | null
  }
}
```

#### 3. GET `/make-server-44a642d3/referrals`
**Purpose:** Get list of referred users and their commission info

**Headers:** `Authorization: Bearer {accessToken}`

**Response:**
```json
{
  "success": true,
  "referrals": [
    {
      "childId": string,
      "childName": string,
      "childEmail": string,
      "totalSharedProfit": number,
      "lastProductAt": string | null,
      "createdAt": string
    }
  ],
  "totalChildren": number
}
```

### Updated Endpoints

#### POST `/make-server-44a642d3/signup` (Extended)

**New Request Fields:**
```json
{
  "email": "string",
  "password": "string",
  "name": "string",
  "withdrawalPassword": "string",      // NEW
  "gender": "male" | "female",         // NEW
  "invitationCode": "string"           // NEW (optional)
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "invitationCode": "string",        // NEW
    "vipTier": "string"
  }
}
```

**New Behavior:**
1. Accepts new fields from frontend (withdrawalPassword, gender, invitationCode)
2. Generates unique invitationCode for new user
3. If invitationCode provided, validates it and links to parent
4. Initializes profit tracking structure
5. Updates parent's child count and referral relationship

## KV Store Schema Changes

### New/Updated Keys

**User Profile:**
```
user:{userId} = {
  id, email, name, username, gender, withdrawalPassword, 
  invitationCode, vipTier, parentUserId, childCount, 
  totalProfitFromChildren, balance, createdAt
}
```

**Invitation Code Lookup:**
```
invitecode:{code} = {
  userId, email, name, createdAt
}
```

**Profit Tracking:**
```
profits:{userId} = {
  totalEarned: number,
  fromDirectChildren: number,
  fromIndirectReferrals: number,
  lastUpdated: string
}
```

**Referral Relationship:**
```
referral:{parentId}:{childId} = {
  parentId, childId, childEmail, childName,
  createdAt, totalSharedProfit, lastProductAt
}
```

**Product Submission Log:**
```
product:{userId}:{timestamp} = {
  userId, productName, productValue,
  userEarned, parentEarned, submittedAt
}
```

## Deployment Instructions

### Prerequisites
- Supabase CLI v2.76.12+
- Valid Supabase access token
- Project ref: `tpxgfjevorhdtwkesvcb`

### Steps

1. **Authenticate with Supabase:**
```powershell
npx supabase login
# Follow interactive prompt to authenticate
```

2. **Deploy the function:**
```powershell
$env:SUPABASE_PROJECT_REF = "tpxgfjevorhdtwkesvcb"
npx supabase functions deploy make-server-44a642d3 --no-verify-jwt
```

3. **Verify deployment:**
```powershell
# Test health endpoint
curl -X GET "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/health"
# Expected response: {"status": "ok"}
```

### Using PowerShell Deploy Script
```powershell
$env:SUPABASE_PROJECT_REF = "tpxgfjevorhdtwkesvcb"
$env:SUPABASE_ACCESS_TOKEN = "your-token"
.\scripts\deploy_supabase.ps1
```

## Frontend Integration

The AuthPage component has been updated to:

1. **Send new signup fields:**
   - `withdrawalPassword`
   - `gender` (from radio button)
   - `invitationCode` (from input field)

2. **Handle new user properties:**
   - Receives `invitationCode` in signup response
   - Stores invitation code for user reference

3. **Form reset:**
   - Clears all fields after successful signup
   - Ready for next user registration

## Testing the System

### Test 1: User Registration with Invitation Code
```javascript
// User 1 signs up first
POST /signup {
  email: "user1@tank.local",
  password: "Pass123",
  name: "User One",
  withdrawalPassword: "WithdrawPass1",
  gender: "male"
}
// Response contains: invitationCode (e.g., "ABC12345")

// User 2 signs up with User 1's code
POST /signup {
  email: "user2@tank.local",
  password: "Pass123",
  name: "User Two",
  withdrawalPassword: "WithdrawPass2",
  gender: "female",
  invitationCode: "ABC12345"
}
// User 2 is now linked to User 1 as parent
```

### Test 2: Profit Sharing
```javascript
// User 2 (child) submits product worth 1000
POST /submit-product {
  productName: "Test Product",
  productValue: 1000
}
// User 2 balance increases by 800 (80%)
// User 1 balance increases by 200 (20%)
```

### Test 3: View Earnings
```javascript
// User 1 checks earnings
GET /earnings
// Response shows:
// - balance includes commission from User 2
// - fromDirectChildren: 200
// - childCount: 1
// - totalFromChildren: 200

// User 1 views referrals
GET /referrals
// Response shows User 2 with totalSharedProfit: 200
```

## Known Limitations & Future Enhancements

### Current Limitations
- Only 1-level referral commission (parent gets 20%)
- Multi-level commission not implemented yet
- Training account types not fully implemented
- No withdrawal system yet

### Planned Enhancements
1. **Multi-level Commission:** Parent's parent also gets % of child's earnings
2. **Training Accounts:** Special account type with different commission rates
3. **Withdrawal System:** Users can withdraw earned balance (admin approval)
4. **Commission Reports:** Detailed breakdown by product, date, referral tier
5. **Admin Commission Tracking:** Dashboard showing all commissions and payments
6. **Referral Limits:** Option to limit max children per parent

## Configuration

### Profit Share Percentage
To change the commission rate from 20% to a different value, edit in Index:
```typescript
const profitAmount = productValue * 0.8;      // Change 0.8 to adjust user percentage
const parentShare = productValue * 0.2;       // Change 0.2 to adjust parent percentage
```

### Invitation Code Length
To change code length from 8 characters:
```typescript
const generateInvitationCode = async (): Promise<string> => {
  // Change loop limit from 8 to desired length
  for (let i = 0; i < 8; i++) {  // <- Modify this number
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
```

## Troubleshooting

### Issue: Invitation code not found
- **Cause:** Code may have expired or be invalid
- **Solution:** Verify code matches prefix `invitecode:` in KV store

### Issue: Commission not transferred to parent
- **Cause:** Parent user record may not exist or be corrupted
- **Solution:** Check parent profile exists with correct userId

### Issue: Child count not updating
- **Cause:** Profile update failed mid-operation
- **Solution:** Manually update parent profile childCount

## File Changes

### Backend (`supabase/functions/server/index.tsx`)
- Added `generateInvitationCode()` function
- Updated POST `/signup` endpoint with new fields and parent linking
- Added POST `/submit-product` endpoint with commission distribution
- Added GET `/earnings` endpoint for user balance info
- Added GET `/referrals` endpoint for referral list
- Extended user profile schema to include new fields

### Frontend (`src/app/components/AuthPage.tsx`)
- Updated signup form submission to include new fields
- Added form reset after successful signup
- All frontend fields already present in UI

## Support & Questions

For issues or questions about the new features:
1. Check the test script: `test-new-endpoints.js`
2. Review KV store keys for debugging
3. Check function logs in Supabase dashboard
4. Test endpoints individually via API testing tool (Postman, curl, etc.)

---

**Last Updated:** 2026-02-22
**Backend Version:** 1.1.0 (Profit Sharing Edition)
**Compatible Frontend Version:** Latest with AuthPage updates
