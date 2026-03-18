# Admin Password Management - Quick Reference

## 🔐 New Endpoints

### Change Admin Password (Direct)
```bash
PUT /admin/accounts/:adminUserId/password
Authorization: Bearer SUPER_ADMIN_KEY
Content-Type: application/json

{
  "newPassword": "NewSecurePass123!"
}
```
✅ Response: 200 OK  
⚠️ Use for: Emergency resets, compliance changes  
🔒 Auth: Super admin only  

---

### Reset Admin Password (Email)
```bash
POST /admin/accounts/:adminUserId/reset-password
Authorization: Bearer SUPER_ADMIN_KEY
Content-Type: application/json
```
✅ Response: 200 OK  
⚠️ Use for: Self-service resets, admin requests  
🔒 Auth: Super admin only  

---

## 🛠️ Usage Examples

### JavaScript/Node.js

```javascript
// Change password directly
const response = await fetch('https://api.com/admin/accounts/uuid123/password', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${SUPER_ADMIN_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ newPassword: 'NewPass456!' }),
});
const result = await response.json();
// Result: { success: true, message: "Admin password updated successfully", admin: {...} }
```

### cURL

```bash
# Change password
curl -X PUT https://api.com/admin/accounts/uuid123/password \
  -H "Authorization: Bearer $SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"NewPass456!"}'

# Reset password (send email)
curl -X POST https://api.com/admin/accounts/uuid123/reset-password \
  -H "Authorization: Bearer $SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json"
```

### Python

```python
import requests

url = "https://api.com/admin/accounts/uuid123/password"
headers = {
    "Authorization": f"Bearer {SUPER_ADMIN_KEY}",
    "Content-Type": "application/json"
}
data = {"newPassword": "NewPass456!"}

response = requests.put(url, json=data, headers=headers)
result = response.json()
```

---

## ✅ Validation Rules

| Field | Rule | Example |
|-------|------|---------|
| `adminUserId` | Must exist in system | `550e8400-e29b-41d4-a716-446655440000` |
| `newPassword` | 6+ characters | `MySecurePass123!` |
| `Authorization` | Valid super admin key | `Bearer sk_live_xxx` |

---

## 📊 Response Codes

| Code | Scenario |
|------|----------|
| **200** | Success |
| **400** | Invalid input (password too short, invalid admin ID) |
| **403** | Insufficient permissions (not super admin) |
| **404** | Admin account not found |
| **500** | Server error |

---

## 🔍 Audit Trail

All password changes logged with:
- ✅ Admin user ID
- ✅ Who changed it (super admin ID)
- ✅ Timestamp
- ✅ IP address
- ✅ Tenant ID
- ✅ Change type (direct vs reset)

**Located in**: `audit:admin-password-change:*` and `audit:admin-password-reset:*`

---

## 🎯 Decision Flow

```
Admin needs password change?
├─ Admin knows email? 
│  └─ YES → POST /reset-password (email method) ✅
└─ NO (emergency/compromised)?
   └─ YES → PUT /password (direct method) ✅
``` 

---

## ⚠️ Important Notes

- Only **super admins** can manage admin passwords
- Limited admins **cannot** change other admins' passwords
- All operations **respect tenant boundaries**
- Password changes are **instantly logged** to audit trail
- Direct password change is **immediate** (no email required)
- Email reset includes **24-hour expiry** on link

---

## 🔄 Migration / Setup

**If upgrading existing system:**

1. ✅ Backup database
2. ✅ Deploy new server code
3. ✅ Test endpoints with super admin key
4. ✅ Validate audit logs are created
5. ✅ Update admin training materials
6. ✅ Monitor first week for issues

---

## 📚 Full Documentation

See: [ADMIN_PASSWORD_MANAGEMENT.md](./ADMIN_PASSWORD_MANAGEMENT.md)  
API Docs: [API_REFERENCE.md](./API_REFERENCE.md#admin-api)  

---

## 🚀 Common Tasks

### Create new admin
```bash
POST /admin/accounts
{ "username": "john", "name": "John", "password": "TempPass123!", "permissions": [...] }
```

### Change forgotten password
```bash
POST /admin/accounts/{id}/reset-password
# Admin gets email with reset link
```

### Emergency password reset
```bash
PUT /admin/accounts/{id}/password
{ "newPassword": "NewEmergencyPass456!" }
```

### Disable compromised admin account
```bash
POST /admin/accounts/{id}/revoke
# Admin loses all permissions, no longer active
```

---

## 📞 Support

For issues:
1. Check audit logs for password change events
2. Verify super admin API key is valid
3. Ensure admin account exists and is active
4. Review API_REFERENCE.md for detailed info

