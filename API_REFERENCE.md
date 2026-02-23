# Clone Platform - Complete API Reference

**API Base URL**: `https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3`

**Last Updated**: February 23, 2026  
**API Version**: 1.0.0  
**Status**: Production Ready ✅

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Core API](#core-api)
4. [Customer Service API](#customer-service-api)
5. [Financial API](#financial-api)
6. [Admin API](#admin-api)
7. [Error Handling](#error-handling)
8. [Code Examples](#code-examples)

---

## Quick Start

### 1. Signup a New User

```bash
curl -X POST https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe",
    "gender": "male",
    "withdrawalPassword": "WithdrawPass456!"
  }'
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid-1234",
    "email": "user@example.com",
    "name": "John Doe",
    "invitationCode": "ABC123XY",
    "vipTier": "Normal"
  },
  "session": {
    "access_token": "eyJhbGciOiJFUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 3600
  }
}
```

### 2. Use Token for API Requests

```bash
curl -X GET https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/profile \
  -H "Authorization: Bearer eyJhbGciOiJFUzI1NiIs..."
```

---

## Authentication

### Bearer Token (User Authentication)

All user-facing endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

**Token obtained from**:
- `/signup` - Automatic on signup
- `/signin` - Get token on login

**Token validity**: 1 hour (3600 seconds)

### Admin API Key (Admin Authentication)

Admin-only endpoints require admin API key:

```
Authorization: Bearer <SUPABASE_ADMIN_API_KEY>
```

**Get admin key**:
1. Go to Supabase Dashboard
2. Project Settings → API
3. Copy "service_role" key (keep secret!)

---

## Core API

### Health Check

Check if API is online.

**Endpoint**: `GET /health`  
**Auth**: None  
**Status Code**: 200

**Example**:
```bash
curl https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/health
```

**Response**:
```json
{
  "status": "ok"
}
```

---

### Signup

Create new user account with optional referral code.

**Endpoint**: `POST /signup`  
**Auth**: None  
**Status Code**: 200

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "gender": "male",
  "withdrawalPassword": "WithdrawPass123!",
  "invitationCode": "ABC123XY"  // Optional: parent's invitation code
}
```

**Requirements**:
- Email: Valid email, must be unique
- Password: Min 8 chars, 1 uppercase, 1 number, 1 special char
- Name: Any string
- Gender: male | female | other
- Withdrawal Password: For withdrawal confirmations (same rules as password)
- Invitation Code: Optional, links user to parent (network), must be valid

**Response** (200):
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "invitationCode": "4RJEQAY7",
    "vipTier": "Normal"
  },
  "session": {
    "access_token": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 3600
  }
}
```

**Errors**:
- 400: Email already exists / Invalid password format
- 409: Duplicate registration detected

---

### Signin

Authenticate user and get session token.

**Endpoint**: `POST /signin`  
**Auth**: None  
**Status Code**: 200

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response** (200):
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "vipTier": "Gold"
  },
  "session": {
    "access_token": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 3600
  }
}
```

**Errors**:
- 401: Invalid email or password

---

### Get Profile

Get authenticated user's profile and account info.

**Endpoint**: `GET /profile`  
**Auth**: ✅ Required  
**Status Code**: 200

**Example**:
```bash
curl -X GET https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/profile \
  -H "Authorization: Bearer eyJhbGciOiJFUzI1NiIs..." \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "gender": "male",
  "balance": 1500.50,
  "totalEarned": 3200.00,
  "vipTier": "Gold",
  "invitationCode": "4RJEQAY7",
  "createdAt": "2026-02-20T10:00:00Z",
  "freezeAmount": 0,
  "accountFrozen": false,
  "childCount": 2,
  "parentUserId": null
}
```

---

### Get Earnings

Get user's earnings breakdown by source (direct products, referrals).

**Endpoint**: `GET /earnings`  
**Auth**: ✅ Required  
**Status Code**: 200

**Response**:
```json
{
  "balance": 1500.50,
  "totalEarned": 3200.00,
  "fromDirectChildren": 500.00,
  "fromIndirectReferrals": 200.00,
  "childCount": 2,
  "totalFromChildren": 700.00,
  "parentUserId": null
}
```

**Fields**:
- `balance`: Current account balance
- `totalEarned`: Lifetime earnings
- `fromDirectChildren`: Commissions from direct referrals
- `fromIndirectReferrals`: Commissions from referrals' referrals
- `childCount`: Number of direct referrals
- `totalFromChildren`: Total earnings from all levels

---

### Get Referrals

Get child users (network referrals) of current user.

**Endpoint**: `GET /referrals`  
**Auth**: ✅ Required  
**Query Parameters**:
- `limit`: Max results (default: 50, max: 500)
- `offset`: Pagination offset (default: 0)

**Example**:
```bash
curl -X GET "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/referrals?limit=20&offset=0" \
  -H "Authorization: Bearer eyJhbGciOiJFUzI1NiIs..."
```

**Response**:
```json
{
  "success": true,
  "referrals": [
    {
      "childId": "550e8400-e29b-41d4-a716-446655440001",
      "childName": "Jane Doe",
      "childEmail": "jane@example.com",
      "totalSharedProfit": 500.00,
      "lastProductAt": "2026-02-22T15:30:00Z",
      "createdAt": "2026-02-15T10:00:00Z"
    }
  ],
  "totalChildren": 1,
  "totalSharedProfit": 500.00
}
```

---

### Submit Product

Submit a product for approval to earn commission.

**Endpoint**: `POST /submit-product`  
**Auth**: ✅ Required  
**Status Code**: 200

**Request Body**:
```json
{
  "productName": "Amazing Marketing Automation Software",
  "productValue": 1000
}
```

**Commission Breakdown**:
- User: 80% of value ($800)
- Parent: 10% of value ($100)
- Grandparent: 5% of value ($50)
- Great-grandparent: 5% of value ($50)

**Response**:
```json
{
  "success": true,
  "product": {
    "name": "Amazing Marketing Automation Software",
    "value": 1000,
    "userEarned": 800,
    "commissionsCascade": [
      {
        "level": 1,
        "userId": "parent-uuid",
        "userName": "Parent Name",
        "amount": 100
      },
      {
        "level": 2,
        "userId": "grandparent-uuid",
        "userName": "Grandparent Name",
        "amount": 50
      }
    ]
  },
  "newBalance": 2300.50
}
```

**Errors**:
- 400: Invalid product value (must be > 0)
- 401: Unauthorized - token invalid

---

## Customer Service API

### Create Support Ticket

Create a new support/help request.

**Endpoint**: `POST /support-tickets`  
**Auth**: ✅ Required  
**Status Code**: 201

**Request Body**:
```json
{
  "subject": "Withdrawal not received",
  "description": "I submitted a withdrawal 3 days ago (WD-12345) and haven't received it yet. Please check the status."
}
```

**Response**:
```json
{
  "success": true,
  "ticket": {
    "id": "ticket-550e8400",
    "userId": "user-1234",
    "subject": "Withdrawal not received",
    "status": "open",
    "createdAt": "2026-02-23T10:30:00Z"
  }
}
```

---

### List Support Tickets

Get user's support tickets.

**Endpoint**: `GET /support-tickets`  
**Auth**: ✅ Required  
**Query Parameters**:
- `status`: Filter by "open" or "closed" (optional)
- `limit`: Results per page (default: 20)

**Response**:
```json
{
  "success": true,
  "tickets": [
    {
      "id": "ticket-550e8400",
      "subject": "Withdrawal not received",
      "status": "open",
      "createdAt": "2026-02-23T10:30:00Z",
      "replyCount": 2
    }
  ],
  "total": 1
}
```

---

### Get Ticket Detail

Get full ticket with all replies.

**Endpoint**: `GET /support-tickets/{ticketId}`  
**Auth**: ✅ Required  
**Status Code**: 200

**Example**:
```bash
curl -X GET "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/support-tickets/ticket-550e8400" \
  -H "Authorization: Bearer eyJhbGciOiJFUzI1NiIs..."
```

**Response**:
```json
{
  "success": true,
  "ticket": {
    "id": "ticket-550e8400",
    "subject": "Withdrawal not received",
    "description": "I submitted a withdrawal 3 days ago...",
    "status": "open",
    "createdAt": "2026-02-23T10:30:00Z",
    "replies": [
      {
        "id": "reply-uuid",
        "message": "We're looking into this. Thank you for your patience.",
        "author": "support-admin",
        "createdAt": "2026-02-23T10:35:00Z"
      },
      {
        "id": "reply-uuid-2",
        "message": "Thank you for checking! I appreciate it.",
        "author": "user",
        "createdAt": "2026-02-23T10:40:00Z"
      }
    ]
  }
}
```

---

### Reply to Ticket

Add a reply to a support ticket.

**Endpoint**: `POST /support-tickets/{ticketId}/reply`  
**Auth**: ✅ Required  
**Status Code**: 200

**Request Body**:
```json
{
  "message": "Thank you for your reply. I'll wait for the transfer."
}
```

**Response**:
```json
{
  "success": true,
  "reply": {
    "id": "reply-new-uuid",
    "message": "Thank you for your reply...",
    "createdAt": "2026-02-23T11:00:00Z"
  }
}
```

---

### Send Chat Message

Send a message in live chat support.

**Endpoint**: `POST /chat/messages`  
**Auth**: ✅ Required  
**Status Code**: 200

**Request Body**:
```json
{
  "message": "Are there any special offers for Diamond tier members?"
}
```

**Response**:
```json
{
  "success": true,
  "message": {
    "id": "msg-uuid",
    "message": "Are there any special offers for Diamond tier members?",
    "sentAt": "2026-02-23T10:45:00Z"
  }
}
```

---

### Get Chat History

Get live chat message history.

**Endpoint**: `GET /chat/messages`  
**Auth**: ✅ Required  
**Query Parameters**:
- `limit`: Messages per page (default: 50)
- `offset`: Pagination offset (default: 0)

**Response**:
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg-uuid",
      "message": "Are there any special offers?",
      "author": "user",
      "sentAt": "2026-02-23T10:45:00Z"
    },
    {
      "id": "msg-uuid-2",
      "message": "Yes! Diamond members get 2% bonus on all commissions.",
      "author": "support",
      "sentAt": "2026-02-23T10:46:00Z"
    }
  ],
  "total": 2
}
```

---

### Get FAQ

Get frequently asked questions.

**Endpoint**: `GET /faq`  
**Auth**: None  
**Query Parameters**:
- `search`: Filter by keyword (optional)
- `limit`: Results (default: 50)

**Response**:
```json
{
  "success": true,
  "faqs": [
    {
      "id": "faq-uuid",
      "question": "How do I withdraw my earnings?",
      "answer": "Go to Withdrawals section, enter amount and your withdrawal password. Requests are processed within 24 hours.",
      "category": "withdrawals",
      "order": 1
    }
  ],
  "total": 12
}
```

---

### Search FAQ

Search FAQs by keyword.

**Endpoint**: `GET /faq/search`  
**Auth**: None  
**Query Parameters**:
- `q`: Search query (required)
- `limit`: Results (default: 20)

**Example**:
```bash
curl -X GET "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/faq/search?q=withdrawal&limit=10"
```

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "id": "faq-uuid",
      "question": "How do I withdraw my earnings?",
      "answer": "Go to Withdrawals...",
      "category": "withdrawals"
    },
    {
      "id": "faq-uuid-2",
      "question": "How long does withdrawal take?",
      "answer": "Withdrawals are processed within 24 hours...",
      "category": "withdrawals"
    }
  ],
  "total": 3
}
```

---

## Financial API

### Create Withdrawal

Request to withdraw earnings.

**Endpoint**: `POST /withdrawals`  
**Auth**: ✅ Required  
**Status Code**: 200

**Request Body**:
```json
{
  "amount": 500.00,
  "withdrawalPassword": "WithdrawPass123!"
}
```

**Validation**:
- Amount must be > 0
- Amount must not exceed balance
- Withdrawal password must match user's withdrawal password

**Response**:
```json
{
  "success": true,
  "withdrawal": {
    "id": "wd-uuid",
    "amount": 500.00,
    "status": "pending",
    "requestedAt": "2026-02-23T10:50:00Z"
  }
}
```

**Errors**:
- 400: Insufficient balance
- 401: Invalid withdrawal password

---

### Get Withdrawal History

Get user's withdrawal requests.

**Endpoint**: `GET /withdrawals`  
**Auth**: ✅ Required  
**Query Parameters**:
- `status`: Filter by "pending" | "approved" | "denied"
- `limit`: Results (default: 50)

**Response**:
```json
{
  "success": true,
  "withdrawals": [
    {
      "id": "wd-uuid",
      "amount": 500.00,
      "status": "approved",
      "requestedAt": "2026-02-23T10:50:00Z",
      "approvedAt": "2026-02-23T11:20:00Z"
    }
  ],
  "total": 5
}
```

---

### Get Bonus Payouts

Get available bonus payouts.

**Endpoint**: `GET /bonus-payouts`  
**Auth**: ✅ Required  
**Status Code**: 200

**Response**:
```json
{
  "success": true,
  "payouts": [
    {
      "id": "bonus-uuid",
      "name": "February Performance Bonus",
      "amount": 250.00,
      "status": "eligible",
      "eligibleAt": "2026-02-28T00:00:00Z"
    },
    {
      "id": "bonus-uuid-2",
      "name": "Referral Milestone (10 Children)",
      "amount": 500.00,
      "status": "locked",
      "eligibleAt": "2026-03-15T00:00:00Z"
    }
  ],
  "total": 2
}
```

---

### Claim Bonus

Claim an eligible bonus payout.

**Endpoint**: `POST /bonus-payouts/{bonusId}/claim`  
**Auth**: ✅ Required  
**Status Code**: 200

**Response**:
```json
{
  "success": true,
  "message": "Bonus claimed successfully",
  "newBalance": 1750.50
}
```

**Errors**:
- 400: Bonus not eligible yet
- 404: Bonus not found

---

## Admin API

> **⚠️ All admin endpoints require admin API key in `Authorization` header**

### [Admin] List Premium Assignments

Get all active premium product assignments.

**Endpoint**: `GET /admin/premium/list`  
**Auth**: ✅ Admin only  
**Status Code**: 200

**Example**:
```bash
curl -X GET "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/admin/premium/list" \
  -H "Authorization: Bearer $SUPABASE_ADMIN_API_KEY"
```

**Response**:
```json
{
  "success": true,
  "total": 5,
  "assignments": [
    {
      "userId": "user-uuid",
      "userEmail": "user@example.com",
      "userName": "John Doe",
      "assignment": {
        "amount": 5000,
        "position": 1,
        "assignedAt": "2026-02-22T15:30:00Z"
      },
      "currentBalance": 1500.00,
      "accountFrozen": true,
      "freezeAmount": 3500.00
    }
  ]
}
```

---

### [Admin] Assign Premium Product

Assign a premium product to a user.

**Endpoint**: `POST /admin/premium`  
**Auth**: ✅ Admin only  
**Status Code**: 200

**Request Body**:
```json
{
  "userId": "user-uuid",
  "amount": 10000,
  "position": 1
}
```

**Logic**:
- If `amount > currentBalance`, account auto-freezes
- User receives 10x commission boost
- Freeze amount must be paid to unfreeze

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "name": "John Doe",
    "balance": -8500,
    "accountFrozen": true,
    "freezeAmount": 10000,
    "premiumAssignment": {
      "amount": 10000,
      "position": 1,
      "assignedAt": "2026-02-23T11:00:00Z"
    }
  },
  "result": {
    "boostedCommission": 10000,
    "frozen": true
  }
}
```

---

### [Admin] Revoke Premium

Remove a premium assignment from a user.

**Endpoint**: `POST /admin/premium/revoke`  
**Auth**: ✅ Admin only  
**Status Code**: 200

**Request Body**:
```json
{
  "userId": "user-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Premium assignment revoked for user abc123",
  "user": {
    "id": "user-uuid",
    "premiumAssignment": null,
    "accountFrozen": false,
    "freezeAmount": 0
  }
}
```

---

### [Admin] Premium Analytics

Get premium product metrics and analytics.

**Endpoint**: `GET /admin/premium/analytics`  
**Auth**: ✅ Admin only  
**Status Code**: 200

**Response**:
```json
{
  "success": true,
  "analytics": {
    "totalAssignments": 5,
    "totalPremiumValue": 45000,
    "averageValue": 9000,
    "frozenAccounts": 3,
    "unfrozenAccounts": 2,
    "assignments": [
      {
        "userId": "uuid",
        "amount": 10000,
        "position": 1,
        "assignedAt": "2026-02-23T11:00:00Z",
        "isFrozen": true
      }
    ]
  }
}
```

---

### [Admin] Unfreeze Account

Unfreeze a frozen user account.

**Endpoint**: `POST /admin/unfreeze`  
**Auth**: ✅ Admin only  
**Status Code**: 200

**Request Body**:
```json
{
  "userId": "user-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "accountFrozen": false,
    "freezeAmount": 0,
    "balance": 1500.00,
    "unfrozenAt": "2026-02-23T11:30:00Z"
  }
}
```

---

### [Admin] List All Users

Get all users (paginated).

**Endpoint**: `GET /admin/users`  
**Auth**: ✅ Admin only  
**Query Parameters**:
- `limit`: Results (default: 50, max: 500)
- `offset`: Pagination (default: 0)

**Response**:
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "balance": 1500.50,
      "vipTier": "Gold",
      "createdAt": "2026-02-20T10:00:00Z"
    }
  ],
  "total": 125
}
```

---

### [Admin] List Withdrawals

Get all withdrawal requests for admin review.

**Endpoint**: `GET /admin/withdrawals`  
**Auth**: ✅ Admin only  
**Query Parameters**:
- `status`: Filter by "pending" | "approved" | "denied"

**Response**:
```json
{
  "success": true,
  "withdrawals": [
    {
      "id": "wd-uuid",
      "userId": "user-uuid",
      "userName": "John Doe",
      "amount": 500.00,
      "status": "pending",
      "requestedAt": "2026-02-23T10:50:00Z"
    }
  ],
  "total": 3
}
```

---

### [Admin] Approve Withdrawal

Approve a pending withdrawal request.

**Endpoint**: `POST /admin/approve-withdrawal`  
**Auth**: ✅ Admin only  
**Status Code**: 200

**Request Body**:
```json
{
  "withdrawalId": "wd-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "withdrawal": {
    "id": "wd-uuid",
    "status": "approved",
    "approvedAt": "2026-02-23T11:45:00Z"
  }
}
```

---

### [Admin] Deny Withdrawal

Deny a withdrawal request (refunds balance).

**Endpoint**: `POST /admin/deny-withdrawal`  
**Auth**: ✅ Admin only  
**Status Code**: 200

**Request Body**:
```json
{
  "withdrawalId": "wd-uuid",
  "reason": "Suspicious activity detected"
}
```

**Response**:
```json
{
  "success": true,
  "withdrawal": {
    "id": "wd-uuid",
    "status": "denied",
    "reason": "Suspicious activity detected"
  }
}
```

---

### [Admin] Get Metrics

Get platform-wide metrics.

**Endpoint**: `GET /admin/metrics`  
**Auth**: ✅ Admin only  
**Status Code**: 200

**Response**:
```json
{
  "success": true,
  "metrics": {
    "totalUsers": 342,
    "activeUsers": 128,
    "totalRevenue": 125430.50,
    "totalPayouts": 45230.25,
    "pendingWithdrawals": 8500.00
  }
}
```

---

## Error Handling

### Standard HTTP Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| **200** | OK | Successful request |
| **201** | Created | Resource created (tickets, etc.) |
| **400** | Bad Request | Invalid input, missing fields |
| **401** | Unauthorized | Missing/invalid token |
| **403** | Forbidden | Admin-only endpoint accessed by user |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Email exists, duplicate request |
| **500** | Server Error | Unexpected backend error |

### Error Response Format

All errors return JSON with `error` field:

```json
{
  "error": "Insufficient balance"
}
```

### Common Errors

| Scenario | Status | Error Message |
|----------|--------|---------------|
| Missing auth token | 401 | "Unauthorized - Missing authorization header" |
| Invalid token | 401 | "Unauthorized - Invalid token" |
| Admin endpoint as user | 403 | "Forbidden - Invalid admin key" |
| Email already registered | 409 | "Email already exists" |
| User not found | 404 | "User not found" |
| Insufficient balance | 400 | "Insufficient balance" |
| Invalid password | 400 | "Invalid email or password" |

---

## Code Examples

### JavaScript / Node.js

#### Signup
```javascript
const response = await fetch('https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    name: 'John Doe',
    gender: 'male',
    withdrawalPassword: 'WithdrawPass456!',
  }),
});

const data = await response.json();
const token = data.session.access_token;
```

#### Authenticated Request
```javascript
const response = await fetch('https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

const profile = await response.json();
console.log(profile);
```

#### Submit Product
```javascript
const response = await fetch('https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/submit-product', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    productName: 'Amazing Tool',
    productValue: 1000,
  }),
});

const result = await response.json();
console.log(`Earned: $${result.product.userEarned}`);
```

---

### Python

```python
import requests
import json

BASE_URL = 'https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3'

# Signup
signup_data = {
    'email': 'user@example.com',
    'password': 'SecurePass123!',
    'name': 'John Doe',
    'gender': 'male',
    'withdrawalPassword': 'WithdrawPass456!',
}

response = requests.post(f'{BASE_URL}/signup', json=signup_data)
token = response.json()['session']['access_token']

# Get profile
headers = {'Authorization': f'Bearer {token}'}
response = requests.get(f'{BASE_URL}/profile', headers=headers)
profile = response.json()
print(f"Balance: ${profile['balance']}")
```

---

### cURL

```bash
# Signup
curl -X POST https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe",
    "gender": "male",
    "withdrawalPassword": "WithdrawPass456!"
  }' \
  | jq -r '.session.access_token' > token.txt

# Get profile
curl -H "Authorization: Bearer $(cat token.txt)" \
  https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/profile \
  | jq .

# Submit product
curl -X POST https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/submit-product \
  -H "Authorization: Bearer $(cat token.txt)" \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Amazing Tool",
    "productValue": 1000
  }' \
  | jq .
```

---

## Rate Limits & Best Practices

### Recommended Rate Limits
- **User endpoints**: 100 requests/minute per user
- **Admin endpoints**: 50 requests/minute per admin
- **Public endpoints** (FAQ): 1000 requests/minute

### Best Practices

1. **Cache FAQ results** client-side (updates infrequently)
2. **Use pagination** for large lists (limit, offset)
3. **Implement exponential backoff** for retries
4. **Store tokens securely** (never in localStorage for sensitive apps)
5. **Validate inputs** before sending (password strength, email format)
6. **Monitor error rates** for anomalies
7. **Use HTTPS only** (enforce in production)

---

## Webhooks (Planned)

Future webhook support for:
- `withdrawal.approved`
- `premium.assigned`
- `ticket.created`
- `user.registered`

Coming soon!

---

## Support

**API Issues**: Create a support ticket via `/support-tickets`  
**Bug Reports**: Chat support via `/chat`  
**Questions**: Check FAQ via `/faq/search`

---

**Last Updated**: February 23, 2026  
**API Version**: 1.0.0  
**Status**: ✅ Production Ready
