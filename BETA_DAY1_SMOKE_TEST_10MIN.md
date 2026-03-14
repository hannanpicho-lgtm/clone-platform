# Day 1 Beta Smoke Test (10 Minutes)

**Date:** February 23, 2026  
**Environment:** Production (Cloudflare Pages)  
**App URL:** https://tanknewmedia.work  
**Admin URL:** https://tanknewmedia.work/admin

---

## Goal
Run a fast pass/fail validation of critical user and admin flows before/while beta invites are active.

---

## 0) Setup (1 minute)

- [ ] Open app in browser (use incognito/private window)
- [ ] Open admin page in second tab
- [ ] Keep notes open for pass/fail

---

## 1) User Signup + Access (2 minutes)

- [ ] Go to app URL
- [ ] Create a new user account
- [ ] Confirm user lands on dashboard after signup/login

**Pass if:** User can create account and access dashboard without blocking errors.

---

## 2) Core Dashboard + Product Flow (2 minutes)

- [ ] Verify dashboard renders key sections
- [ ] Open Products area
- [ ] Start one product action (or equivalent first-step action)

**Pass if:** Products workflow opens and user action completes/starts normally.

---

## 3) Referral Flow (2 minutes)

- [ ] Open referral/invitation area
- [ ] Generate or copy invite/referral code
- [ ] Validate code/link looks usable

**Pass if:** Referral code/link is generated and can be copied/shared.

---

## 4) Withdrawal Request Flow (2 minutes)

- [ ] Open withdrawal/request withdrawal section
- [ ] Submit a test withdrawal request (valid test amount)
- [ ] Confirm request appears in user-side history/status

**Pass if:** Withdrawal request submits successfully and status is visible.

---

## 5) Admin Validation (1 minute)

- [ ] Login to `/admin` with admin password
- [ ] Confirm **Overview** tab is visible and selected by default
- [ ] Confirm admin panel loads tabs (Users, Withdrawals, Products, Settings)

**Pass if:** Admin can access panel and see Overview + all tabs.

---

## Result Log (Fill Now)

| Test Area | Status (Pass/Fail) | Notes |
|---|---|---|
| Signup + Access |  |  |
| Dashboard + Products |  |  |
| Referral Flow |  |  |
| Withdrawal Request |  |  |
| Admin Overview + Tabs |  |  |

**Overall Smoke Result:** [ ] PASS  [ ] FAIL

### Quick Entry Examples

- `Signup + Access - PASS - User created and dashboard loaded in <1 min`
- `Withdrawal Request - FAIL - Submit button inactive on mobile Safari (iPhone 13)`
- `High - Referral Flow - Invite copy button not working - Owner: Frontend`

---

## If Any Test Fails (Quick Response)

1. Capture screenshot
2. Note exact step + timestamp
3. Record browser/device
4. Add issue to `BETA_LAUNCH_CHECKLIST.md` under Bug & Issue Tracking
5. Mark severity: Critical / High / Medium / Low
