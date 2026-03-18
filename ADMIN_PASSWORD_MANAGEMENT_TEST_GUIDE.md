# Admin Password Management - Testing Guide

## 🧪 Test Scenarios

This guide walks through testing the admin password management endpoints.

---

## Prerequisites

- ✅ Super admin API key
- ✅ Access to test environment
- ✅ Existing admin account ID (or create one first)
- ✅ Valid email for testing password reset
- ✅ cURL or Postman (for API testing)

---

## Setup: Create Test Admin Account

First, create a test admin account:

```bash
curl -X POST https://testapi.example.com/admin/accounts \
  -H "Authorization: Bearer sk_test_SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testadmin",
    "name": "Test Admin",
    "password": "TempPass123!",
    "permissions": ["manage_users", "manage_support_tickets"]
  }'
```

**Expected Response (201)**:
```json
{
  "success": true,
  "admin": {
    "userId": "test-admin-uuid-12345",
    "username": "testadmin",
    "displayName": "Test Admin",
    "authEmail": "admin.testadmin@platform.com",
    "tenantId": "test-tenant",
    "active": true,
    "permissions": ["manage_users", "manage_support_tickets"],
    "createdAt": "2026-02-23T10:00:00Z"
  }
}
```

✅ **Save the `userId`** - You'll need it for the tests below.

---

## Test 1: Change Admin Password (Direct Method)

### Objective
Verify that a super admin can directly change an admin's password.

### Test Steps

```bash
# 1. Change password
curl -X PUT https://testapi.example.com/admin/accounts/test-admin-uuid-12345/password \
  -H "Authorization: Bearer sk_test_SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "NewTestPass456!"
  }'
```

### Expected Response (200)
```json
{
  "success": true,
  "message": "Admin password updated successfully",
  "admin": {
    "userId": "test-admin-uuid-12345",
    "username": "testadmin",
    "displayName": "Test Admin"
  }
}
```

### Verification Steps

1. **Password Change Successful?**
   - ✅ Check response is 200 OK
   - ✅ Response has `"success": true`
   - ✅ Admin info is returned

2. **Try Logging In with New Password**
   ```bash
   curl -X POST https://testapi.example.com/admin/signin \
     -H "Content-Type: application/json" \
     -d '{
       "username": "testadmin",
       "password": "NewTestPass456!"
     }'
   ```
   - ✅ Should return 200 OK with session token
   - ❌ If fails, new password not applied correctly

3. **Old Password Should Not Work**
   ```bash
   curl -X POST https://testapi.example.com/admin/signin \
     -H "Content-Type: application/json" \
     -d '{
       "username": "testadmin",
       "password": "TempPass123!"
     }'
   ```
   - ✅ Should return 403 Unauthorized
   - ❌ If works, old password still valid (error!)

### Audit Log Verification

Check audit logs contain password change entry:
```json
{
  "type": "admin_password_changed",
  "adminUserId": "test-admin-uuid-12345",
  "changedBy": "super-admin-id",
  "changedAt": "2026-02-23T10:05:00Z",
  "changedIp": "192.168.1.100",
  "targetTenantId": "test-tenant"
}
```

---

## Test 2: Validate Password Requirements

### Objective
Verify password validation works correctly.

### Test 2A: Password Too Short

```bash
curl -X PUT https://testapi.example.com/admin/accounts/test-admin-uuid-12345/password \
  -H "Authorization: Bearer sk_test_SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "short"
  }'
```

**Expected Response (400)**:
```json
{
  "error": "newPassword must be at least 6 characters"
}
```

✅ **Pass**: Returns 400 with error message

### Test 2B: Missing Password Field

```bash
curl -X PUT https://testapi.example.com/admin/accounts/test-admin-uuid-12345/password \
  -H "Authorization: Bearer sk_test_SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response (400)**:
```json
{
  "error": "newPassword must be at least 6 characters"
}
```

✅ **Pass**: Returns 400 with validation error

### Test 2C: Valid Strong Password

```bash
curl -X PUT https://testapi.example.com/admin/accounts/test-admin-uuid-12345/password \
  -H "Authorization: Bearer sk_test_SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "Super$ecur3P@ssw0rd2024!"
  }'
```

**Expected Response (200)**:
```json
{
  "success": true,
  "message": "Admin password updated successfully",
  ...
}
```

✅ **Pass**: Accepts strong password

---

## Test 3: Error Handling - Invalid Admin ID

### Objective
Verify proper error when admin doesn't exist.

```bash
curl -X PUT https://testapi.example.com/admin/accounts/invalid-uuid-999/password \
  -H "Authorization: Bearer sk_test_SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "ValidPass123!"
  }'
```

**Expected Response (404)**:
```json
{
  "error": "Admin account not found"
}
```

✅ **Pass**: Returns 404 with clear error message

---

## Test 4: Error Handling - Authorization

### Objective
Verify non-super-admins cannot change passwords.

```bash
# Using a limited admin key (not super admin)
curl -X PUT https://testapi.example.com/admin/accounts/test-admin-uuid-12345/password \
  -H "Authorization: Bearer sk_test_LIMITED_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "NewPass789!"
  }'
```

**Expected Response (403)**:
```json
{
  "error": "Forbidden - Super admin permission required"
}
```

✅ **Pass**: Rejects non-super-admin requests

---

## Test 5: Reset Password via Email

### Objective
Verify password reset email is sent correctly.

```bash
curl -X POST https://testapi.example.com/admin/accounts/test-admin-uuid-12345/reset-password \
  -H "Authorization: Bearer sk_test_SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json"
```

**Expected Response (200)**:
```json
{
  "success": true,
  "message": "Password reset email sent to admin account",
  "admin": {
    "userId": "test-admin-uuid-12345",
    "username": "testadmin",
    "displayName": "Test Admin",
    "authEmail": "admin.testadmin@platform.com"
  }
}
```

### Verification Steps

1. **Check Admin's Email**
   - ✅ Look for email from noreply@platform.com
   - ✅ Subject: "Password Reset Request"
   - ✅ Contains password reset link
   - ✅ Link points to correct frontend URL
   - ✅ Token is included in link

2. **Click Reset Link**
   - ✅ Link is valid (not expired)
   - ✅ Takes you to password reset form
   - ✅ Form accepts new password (6+ chars)

3. **Set New Password**
   - Enter new password: `ResetPass123!`
   - Confirm password
   - Submit form

4. **Login with New Password**
   ```bash
   curl -X POST https://testapi.example.com/admin/signin \
     -H "Content-Type: application/json" \
     -d '{
       "username": "testadmin",
       "password": "ResetPass123!"
     }'
   ```
   - ✅ Should return 200 OK with session token

### Audit Log Verification

Check audit logs contain reset request:
```json
{
  "type": "admin_password_reset_triggered",
  "adminUserId": "test-admin-uuid-12345",
  "triggeredBy": "super-admin-id",
  "triggeredAt": "2026-02-23T10:15:00Z",
  "triggeredIp": "192.168.1.100",
  "targetTenantId": "test-tenant"
}
```

---

## Test 6: Cross-Tenant Security

### Objective
Verify a super admin cannot manage admins from different tenants.

```bash
# Super admin for TENANT_A tries to manage TENANT_B's admin
curl -X PUT https://testapi.example.com/admin/accounts/tenant-b-admin-uuid/password \
  -H "Authorization: Bearer sk_test_TENANT_A_SUPER_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "NewPass456!"
  }'
```

**Expected Response (403)**:
```json
{
  "error": "Forbidden - Cross-tenant operation requires explicit super-admin all-tenant context"
}
```

✅ **Pass**: Maintains tenant isolation

---

## Test 7: Missing Authorization Header

### Objective
Verify endpoints reject unauthenticated requests.

```bash
# No Authorization header
curl -X PUT https://testapi.example.com/admin/accounts/test-admin-uuid-12345/password \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "NewPass456!"
  }'
```

**Expected Response (401)**:
```json
{
  "error": "Unauthorized - Missing authorization header"
}
```

✅ **Pass**: Rejects unauthenticated access

---

## Test 8: Invalid JSON

### Objective
Verify proper error handling for malformed requests.

```bash
curl -X PUT https://testapi.example.com/admin/accounts/test-admin-uuid-12345/password \
  -H "Authorization: Bearer sk_test_SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d 'invalid json{'
```

**Expected Response (400)**:
```json
{
  "error": "Invalid JSON in request body"
}
```

✅ **Pass**: Handles malformed JSON gracefully

---

## Test 9: Concurrent Password Changes

### Objective
Verify system handles multiple simultaneous password changes.

```bash
# Change 1 (should succeed)
curl -X PUT https://testapi.example.com/admin/accounts/test-admin-uuid-12345/password \
  -H "Authorization: Bearer sk_test_SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"Pass001!"}'

# Change 2 (should also succeed with new password)
curl -X PUT https://testapi.example.com/admin/accounts/test-admin-uuid-12345/password \
  -H "Authorization: Bearer sk_test_SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"Pass002!"}'

# Verify latest password works
curl -X POST https://testapi.example.com/admin/signin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testadmin",
    "password": "Pass002!"
  }'
```

✅ **Pass**: Latest password is the active one

---

## Test 10: Performance & Load

### Objective
Verify endpoints handle reasonable load.

```bash
# Simulate 10 concurrent password changes
for i in {1..10}; do
  curl -X PUT https://testapi.example.com/admin/accounts/test-admin-uuid-12345/password \
    -H "Authorization: Bearer sk_test_SUPER_ADMIN_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"newPassword\":\"Pass$i!\"}" &
done
wait
```

**Expected**: All requests complete within 5 seconds

✅ **Pass**: System handles concurrent requests

---

## Integration Test Script

Here's a complete test script in JavaScript:

```javascript
const BASE_URL = 'https://testapi.example.com';
const SUPER_ADMIN_KEY = 'sk_test_SUPER_ADMIN_KEY';
let testAdminId = '';

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`);
  }
}

async function request(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${SUPER_ADMIN_KEY}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, options);
  return res.json();
}

(async () => {
  // Create test admin
  const created = await request('POST', '/admin/accounts', {
    username: 'testadmin',
    name: 'Test Admin',
    password: 'TempPass123!',
    permissions: ['manage_users'],
  });
  testAdminId = created.admin.userId;
  console.log(`Test admin created: ${testAdminId}`);

  // Run tests
  await test('Change password - valid', async () => {
    const res = await request('PUT', `/admin/accounts/${testAdminId}/password`, {
      newPassword: 'NewPass456!',
    });
    if (!res.success) throw new Error(res.error);
  });

  await test('Change password - too short', async () => {
    const res = await request('PUT', `/admin/accounts/${testAdminId}/password`, {
      newPassword: 'short',
    });
    if (res.success) throw new Error('Should have failed');
    if (!res.error.includes('at least 6 characters')) throw new Error('Wrong error');
  });

  await test('Change password - invalid admin', async () => {
    const res = await request('PUT', `/admin/accounts/invalid-uuid/password`, {
      newPassword: 'ValidPass123!',
    });
    if (res.success) throw new Error('Should have failed');
    if (res.error !== 'Admin account not found') throw new Error('Wrong error');
  });

  await test('Reset password email', async () => {
    const res = await request('POST', `/admin/accounts/${testAdminId}/reset-password`);
    if (!res.success) throw new Error(res.error);
    if (!res.admin.authEmail) throw new Error('No email in response');
  });

  console.log('✅ All tests passed!');
})();
```

---

## Postman Collection

Import this collection into Postman to test the endpoints:

```json
{
  "info": {
    "name": "Admin Password Management",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Change Admin Password",
      "request": {
        "method": "PUT",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer sk_test_SUPER_ADMIN_KEY"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"newPassword\":\"NewPass456!\"}"
        },
        "url": {
          "raw": "{{base_url}}/admin/accounts/{{admin_id}}/password",
          "host": ["{{base_url}}"],
          "path": ["admin", "accounts", "{{admin_id}}", "password"]
        }
      }
    },
    {
      "name": "Reset Admin Password",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer sk_test_SUPER_ADMIN_KEY"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "url": {
          "raw": "{{base_url}}/admin/accounts/{{admin_id}}/reset-password",
          "host": ["{{base_url}}"],
          "path": ["admin", "accounts", "{{admin_id}}", "reset-password"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "https://testapi.example.com"
    },
    {
      "key": "admin_id",
      "value": "test-admin-uuid-12345"
    }
  ]
}
```

---

## Checklist: Ready for Production?

- ✅ All 10 test scenarios pass
- ✅ Password validation works
- ✅ Audit logs are created
- ✅ Email reset link works
- ✅ Tenant isolation maintained
- ✅ Authorization checks pass
- ✅ Error messages are clear
- ✅ No performance issues
- ✅ Security verified
- ✅ Documentation complete

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Password change returns 400 | Check password is 6+ chars, admin exists |
| Email not received | Check email config, check spam folder |
| Reset link expired | Request new reset, link good for 24hrs |
| 403 Forbidden error | Verify using super admin key, not limited admin |
| Audit logs missing | Ensure KV store is configured and accessible |

