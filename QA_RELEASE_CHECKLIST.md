# QA Release Checklist

**Release Date:** _______________  
**Deployed Version:** _______________  
**Tester Name:** _______________  

---

## Pre-Deployment Setup

- [ ] Run `npm run build` — must pass without errors
- [ ] Run `npm run test:smoke` — all tests must pass (core + customer-service 20/20)
- [ ] Confirm function deploy: `npx supabase functions deploy make-server-44a642d3 --project-ref tpxgfjevorhdtwkesvcb --no-verify-jwt` — success message received

---

## Supabase Dashboard Verification

- [ ] Open: https://supabase.com/dashboard/project/tpxgfjevorhdtwkesvcb/functions
- [ ] Click `make-server-44a642d3`
- [ ] **Function Settings**: Confirm JWT verification is **disabled**
- [ ] **Deployment timestamp**: Latest deploy is recent (within last 30 min)
- [ ] **Recent invocations visible**: Function logs show successful recent calls (for example `/health`, `/signup`, `/support-tickets`)

---

## Core Auth & Health

| Test | Pass | Fail | Notes |
|------|------|------|-------|
| Health endpoint returns `{"status":"ok"}` with status 200 | [ ] | [ ] | Call: `/health` |
| Signup creates user with id + invitationCode | [ ] | [ ] | Verify: user.id, user.invitationCode present |
| Signin returns session + access_token | [ ] | [ ] | Verify: session.access_token length > 100 |
| Profile endpoint returns user fields | [ ] | [ ] | Verify: name, email, vipTier, balance, invitationCode |
| Unauthorized calls return 401 | [ ] | [ ] | Test without auth header |

---

## Earnings & Referrals

| Test | Pass | Fail | Notes |
|------|------|------|-------|
| Submit product updates user balance | [ ] | [ ] | Before: 0, After: >0 |
| Earnings endpoint shows updated totalEarned | [ ] | [ ] | Must equal product value × rate |
| Signup child with parent invitationCode links them | [ ] | [ ] | Verify: child.parentUserId == parent.id (via KV check) |
| Parent referrals list shows child entry | [ ] | [ ] | Include: childId, childName, childEmail |
| Child product submission credits parent | [ ] | [ ] | Parent earnings.fromDirectChildren increases |

---

## Withdrawals & Admin

| Test | Pass | Fail | Notes |
|------|------|------|-------|
| Create withdrawal request succeeds | [ ] | [ ] | Status 200, includes withdrawal id |
| Withdrawal history lists request | [ ] | [ ] | Verify: status="pending", amount correct |
| Admin view shows pending withdrawal | [ ] | [ ] | Call: `/admin/withdrawals` |
| Approve withdrawal updates balance + status | [ ] | [ ] | Status → approved, user balance reflects deduction |
| Deny withdrawal rejects request | [ ] | [ ] | Status → denied, user balance unchanged |
| Reject flow does NOT credit user | [ ] | [ ] | Verify: balance unchanged after deny |

---

## Analytics

| Test | Pass | Fail | Notes |
|------|------|------|-------|
| Earnings analytics returns balance | [ ] | [ ] | Includes: balance, totalEarned, trend |
| Network analytics returns referral counts | [ ] | [ ] | Includes: directCount, indirectCount |
| Leaderboard returns ranked list | [ ] | [ ] | Includes: userRank, name, earnings |
| Monthly report has chronological data | [ ] | [ ] | Includes: month, earnings for multi-month users |
| Frontend Analytics modal loads all tabs | [ ] | [ ] | No console errors, data visible |

---

## Bonus Payouts

| Test | Pass | Fail | Notes |
|------|------|------|-------|
| Bonus payouts list returns bonuses | [ ] | [ ] | Status: eligible/claimed/locked |
| Claim eligible bonus succeeds | [ ] | [ ] | Status 200, balance updated |
| Bonus history shows claimed entry | [ ] | [ ] | Include: name, amount, claimedAt timestamp |
| Claim updates total earned correctly | [ ] | [ ] | totalEarned increases by bonus.amount |
| Frontend Bonus modal claim action works | [ ] | [ ] | Post-claim: button state changes, UI refreshes |

---

## Customer Service

| Test | Pass | Fail | Notes |
|------|------|------|-------|
| Support ticket create returns 200 | [ ] | [ ] | Includes: ticket id, subject, status="open" |
| List tickets shows created ticket | [ ] | [ ] | Verify: subject matches |
| Get ticket detail returns full ticket | [ ] | [ ] | Include: replies, status, timestamps |
| Reply to ticket succeeds | [ ] | [ ] | New reply appears in ticket.replies |
| Chat send message succeeds | [ ] | [ ] | Message appears in conversation |
| Get chat messages returns list ordered | [ ] | [ ] | Chronological by createdAt |
| FAQ list returns default or persisted FAQs | [ ] | [ ] | At least 8 default FAQs |
| FAQ search filters by query | [ ] | [ ] | Search "withdrawal" returns relevant results |
| Frontend Tickets/Chat/FAQ modals load | [ ] | [ ] | No console errors, data visible |

---

## Backward Compatibility

| Test | Pass | Fail | Notes |
|------|------|------|-------|
| Legacy prefixed paths still work | [ ] | [ ] | Example: `/make-server-44a642d3/health` returns 200 |
| Canonical paths work | [ ] | [ ] | Example: `/health` returns 200 |
| Both request types resolve same endpoint | [ ] | [ ] | No double-counting in logs |

---

## Regression & Final Checks

| Test | Pass | Fail | Notes |
|------|------|------|-------|
| Run `npm run test:smoke` — all pass | [ ] | [ ] | Core + customer-service 20/20 |
| No 401/403 errors in recent logs | [ ] | [ ] | Review function logs for unexpected auth failures |
| No 500 errors in recent logs | [ ] | [ ] | Review function logs for server errors |
| Frontend builds without errors | [ ] | [ ] | Run `npm run build` |
| No blocking console errors in browser | [ ] | [ ] | Open DevTools and verify console is clean |

---

## Sign-Off

| Criterion | Met | Notes |
|-----------|-----|-------|
| **All core tests pass** | [ ] | Auth, earnings, withdrawals, analytics, bonuses, customer service |
| **No regression errors** | [ ] | No new 4xx/5xx, no console errors |
| **Backward compatibility verified** | [ ] | Legacy + canonical paths both work |
| **Ready for production** | [ ] | All boxes checked |

**Tester Sign-Off:** ___________________  
**Date/Time:** ___________________  
**Issues Found:** (if any) ___________________  

---

## Notes for Future Releases

- Keep smoke tests in CI/CD (currently in `.github/workflows/supabase-deploy.yml`).
- Update checklist if new endpoints are added.
- Rerun full suite if JWT verification settings change.
