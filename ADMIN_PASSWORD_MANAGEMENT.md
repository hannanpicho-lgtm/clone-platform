# Admin Password Management Guide

## Overview

Admin password management provides super administrators with secure tools to:
- Create admin accounts with initial passwords
- Change admin passwords directly (emergency situations)
- Trigger password reset emails for admins
- Track password changes via audit logs

---

## API Endpoints

### 1. Create Admin Account (with Initial Password)

**Endpoint**: `POST /admin/accounts`

Creates a new limited admin account with an initial password set by the super admin.

**Request:**
```bash
curl -X POST "https://your-api.com/admin/accounts" \
  -H "Authorization: Bearer $SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_admin",
    "name": "John Smith",
    "password": "InitialPass123!",
    "permissions": ["manage_users", "manage_withdrawals"]
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "admin": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_admin",
    "displayName": "John Smith",
    "authEmail": "admin.john_admin@platform.com",
    "tenantId": "tenant-123",
    "active": true,
    "permissions": ["manage_users", "manage_withdrawals"],
    "createdAt": "2026-02-23T10:30:00Z"
  }
}
```

**Validation Rules:**
- Username: 3+ alphanumeric characters
- Password: 6+ characters
- Permissions: At least one valid admin permission required

---

### 2. Change Admin Password (Direct Method)

**Endpoint**: `PUT /admin/accounts/:adminUserId/password`

Directly set a new password for an admin account. Use this for emergency password resets or when the admin cannot access their email.

**Request:**
```bash
curl -X PUT "https://your-api.com/admin/accounts/550e8400-e29b-41d4-a716-446655440000/password" \
  -H "Authorization: Bearer $SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "NewPassword456!"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Admin password updated successfully",
  "admin": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_admin",
    "displayName": "John Smith"
  }
}
```

**Audit Log Entry:**
```json
{
  "type": "admin_password_changed",
  "adminUserId": "550e8400-e29b-41d4-a716-446655440000",
  "changedBy": "super-admin-uuid",
  "changedAt": "2026-02-23T10:35:00Z",
  "changedIp": "192.168.1.100",
  "targetTenantId": "tenant-123"
}
```

**Use Cases:**
- Emergency password reset
- Suspected account compromise
- Policy-mandated password changes
- Admin manually requests super admin to change password

**Validation Rules:**
- New password must be 6+ characters
- Admin account must exist and be accessible

---

### 3. Reset Admin Password (Email Method)

**Endpoint**: `POST /admin/accounts/:adminUserId/reset-password`

Send a password reset email to the admin. The admin can then set their own new password securely.

**Request:**
```bash
curl -X POST "https://your-api.com/admin/accounts/550e8400-e29b-41d4-a716-446655440000/reset-password" \
  -H "Authorization: Bearer $SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset email sent to admin account",
  "admin": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_admin",
    "displayName": "John Smith",
    "authEmail": "admin.john_admin@platform.com"
  }
}
```

**Audit Log Entry:**
```json
{
  "type": "admin_password_reset_triggered",
  "adminUserId": "550e8400-e29b-41d4-a716-446655440000",
  "triggeredBy": "super-admin-uuid",
  "triggeredAt": "2026-02-23T10:40:00Z",
  "triggeredIp": "192.168.1.100",
  "targetTenantId": "tenant-123"
}
```

**Admin's Email Content:**
```
Subject: Password Reset Request

Hello John Smith,

A password reset has been requested for your admin account. 
Click the link below to set a new password:

https://your-platform.com/admin/auth/reset-password?token=xxx

This link expires in 24 hours.

If you didn't request this, please contact your super administrator.
```

**Use Cases:**
- Admin forgot their password
- Regular password reset request
- Admin prefers self-service password change
- Policy-mandated password expiration

**Process:**
1. Super admin triggers reset
2. Admin receives email with reset link
3. Admin clicks link and sets new password
4. Admin can immediately log in with new password

---

## Admin Password Security Checklist

### For Super Admins

- ✅ **Never share** password reset links outside secure channels
- ✅ **Always audit** password changes from the audit logs
- ✅ **Verify identity** before processing password requests
- ✅ **Use strong passwords** when setting initial passwords
- ✅ **Monitor** failed password reset attempts
- ✅ **Enforce** periodic password changes via policy
- ✅ **Log all** password management activities

### For Admins

- ✅ **Change** initial password immediately after account creation
- ✅ **Use strong** passwords (12+ chars, mixed case, numbers, symbols)
- ✅ **Never share** your password with anyone
- ✅ **Enable** 2FA if available
- ✅ **Click** password reset links only from known devices
- ✅ **Report** suspected compromises immediately
- ✅ **Keep** email secure (used for password recovery)

---

## Common Scenarios & Solutions

### Scenario 1: Admin Forgot Password

**Solution**: Use email password reset

```bash
curl -X POST "https://your-api.com/admin/accounts/admin-uuid/reset-password" \
  -H "Authorization: Bearer $SUPER_ADMIN_KEY"
```

**Process:**
1. Admin receives reset email
2. Admin clicks reset link
3. Admin sets new password
4. Admin logs in with new password

---

### Scenario 2: Suspected Account Compromise

**Solution**: Change password immediately with direct method

```bash
curl -X PUT "https://your-api.com/admin/accounts/admin-uuid/password" \
  -H "Authorization: Bearer $SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"newPassword": "EmergencyPass789!"}'
```

**Actions:**
1. Change password immediately
2. Review audit logs for suspicious activity
3. Review login history
4. Consider revoking if compromise is severe
5. Notify admin of the change

---

### Scenario 3: New Admin Onboarding

**Solution**: Create account with password, admin changes on first login

```bash
# Step 1: Create admin account
curl -X POST "https://your-api.com/admin/accounts" \
  -H "Authorization: Bearer $SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "sarah_admin",
    "name": "Sarah Johnson",
    "password": "TempPass123!",
    "permissions": ["manage_users"]
  }'

# Step 2: Send onboarding email with credentials
# Step 3: Admin logs in with temporary password
# Step 4: Admin changes password on first login
```

---

### Scenario 4: Regular Password Rotation (Policy)

**Solution**: Send batch reset emails to all admins

```bash
# For each admin:
curl -X POST "https://your-api.com/admin/accounts/:adminUserId/reset-password" \
  -H "Authorization: Bearer $SUPER_ADMIN_KEY"
```

**Schedule:** Monthly or quarterly as per policy

---

## Audit & Compliance

### Audit Log Queries

View all password change events:
```bash
# Stored in: audit:admin-password-change:*
# Contains: admin user ID, who changed it, when, IP address, tenant
```

View all password reset requests:
```bash
# Stored in: audit:admin-password-reset:*
# Contains: admin user ID, who triggered it, when, IP address, tenant
```

### Compliance Records

Keep audit logs for:
- 🔐 **Security audits** (1+ year)
- 📋 **Regulatory compliance** (as required)
- 🔍 **Incident investigations** (permanent)

---

## Error Handling

### Common Errors

| Error | Status | Cause | Solution |
|-------|--------|-------|----------|
| `Admin account not found` | 404 | Admin ID doesn't exist | Verify correct admin UUID |
| `newPassword must be at least 6 characters` | 400 | Password too short | Use 6+ character password |
| `Forbidden - Cross-tenant operation requires explicit super-admin all-tenant context` | 403 | Super admin accessing wrong tenant admin | Use correct super admin key |
| `Failed to update admin password` | 400 | Supabase error | Check Supabase auth status |
| `Failed to send password reset email` | 400 | Email delivery failed | Check email configuration |

---

## Best Practices

### 1. **Initial Password Policy**
- Generate random temporary passwords
- Force change on first login
- Use secure password generator (12+ chars)

### 2. **Password Reset Policy**
- Prefer email-based resets for admins
- Use direct change only for emergencies
- Always verify admin identity first

### 3. **Monitoring & Alerting**
- Alert on multiple failed password attempts
- Alert on abnormal login times/locations
- Review weekly password change logs

### 4. **Access Control**
- Only super admins can manage passwords
- Limited admins cannot change other admins' passwords
- Tenant isolation respected for all operations

### 5. **Documentation**
- Document all password changes/resets
- Maintain change log for audits
- Include reason and who authorized it

---

## Integration Example

```javascript
// Admin password management service
class AdminPasswordManager {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async createAdminWithPassword(username, name, password, permissions) {
    return fetch(`${this.baseUrl}/admin/accounts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, name, password, permissions }),
    }).then(r => r.json());
  }

  async changeAdminPassword(adminUserId, newPassword) {
    return fetch(`${this.baseUrl}/admin/accounts/${adminUserId}/password`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newPassword }),
    }).then(r => r.json());
  }

  async triggerPasswordReset(adminUserId) {
    return fetch(`${this.baseUrl}/admin/accounts/${adminUserId}/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    }).then(r => r.json());
  }
}

// Usage
const manager = new AdminPasswordManager(process.env.SUPER_ADMIN_KEY, 'https://api.com');
await manager.createAdminWithPassword('john', 'John Admin', 'TempPass123!', ['manage_users']);
```

---

## Related Documentation

- [Admin API Reference](./API_REFERENCE.md#admin-api)
- [Admin Account Management](./ADMIN_README.md)
- [Security Best Practices](./API_SECURITY_CHECKLIST.md)
- [Audit & Compliance](./PRODUCTION_AUDIT_REPORT.md)

