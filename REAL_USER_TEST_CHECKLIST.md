# Real User Test Checklist (Production)

**Date:** February 26, 2026  
**Environment:** Production

## Live Links
- **App:** https://iridescent-basbousa-b72341.netlify.app
- **Admin:** https://iridescent-basbousa-b72341.netlify.app/admin
- **API Base:** https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3
- **API Health:** https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/health

## Tester Instructions (10–15 minutes)
- Use a private/incognito browser window.
- Do not reuse old test accounts.
- Record each step as Pass or Fail.
- If a step fails, capture screenshot + exact time + short note.

## Test Flow

### 1) Signup and Login
- [ ] Open app URL.
- [ ] Create a new account with fresh email/username.
- [ ] Confirm login completes and dashboard loads.

**Pass if:** New user can access dashboard without blocking error.

### 2) Dashboard and Product Action
- [ ] Verify main dashboard widgets load.
- [ ] Open product/task section.
- [ ] Complete one product/task submission.

**Pass if:** Submission succeeds and balance/task state updates.

### 3) Referral/Invite
- [ ] Open referral/invitation area.
- [ ] Generate/copy referral code or link.
- [ ] Share link/code to verify format is usable.

**Pass if:** Referral data is visible and copy/share works.

### 4) Withdrawal Request
- [ ] Open withdrawal page.
- [ ] Submit a valid test withdrawal amount.
- [ ] Confirm request appears in user history/status.

**Pass if:** Request is accepted and status is visible.

### 5) Admin Check
- [ ] Open admin URL and sign in.
- [ ] Confirm Overview is visible.
- [ ] Confirm key tabs load (Users, Withdrawals, Products, Settings).

**Pass if:** Admin can access and review all critical tabs.

### 6) Basic Backend Health
- [ ] Open API health endpoint.
- [ ] Confirm response includes `{"status":"ok"}`.

**Pass if:** Endpoint returns HTTP 200 and healthy status.

## Quick Result Log
| Tester | Signup/Login | Product Action | Referral | Withdrawal | Admin | Overall | Notes |
|---|---|---|---|---|---|---|---|
| Tester 1 |  |  |  |  |  |  |  |
| Tester 2 |  |  |  |  |  |  |  |
| Tester 3 |  |  |  |  |  |  |  |

## Escalation Rule
- Any blocker in Signup/Login, Product Action, or Withdrawal = stop rollout and report immediately.
- Minor UI issue without functional impact = log and continue testing.
