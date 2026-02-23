# Beta User Selection & Invitation List

## Instructions
Fill in the blanks below with your selected beta users. Mix of different user types recommended.

---

## Beta User Cohort 1 (5-10 Users)

### User 1: Product Submitter
**Role**: Tests product submission, earnings, analytics
**Name**: ________________
**Email**: ________________
**Phone**: ________________
**Timezone**: ________________
**Availability**: ☐ Daily ☐ 3x/week ☐ 2x/week
**Device**: ☐ Desktop ☐ Mobile ☐ Tablet
**Notes**: ________________

**Temporary Password**: ________________
**Sent**: ☐ Yes (Date: ____) ☐ No

---

### User 2: Referral Network Builder
**Role**: Tests invitation codes, referral system, multi-level earnings
**Name**: ________________
**Email**: ________________
**Phone**: ________________
**Timezone**: ________________
**Availability**: ☐ Daily ☐ 3x/week ☐ 2x/week
**Device**: ☐ Desktop ☐ Mobile ☐ Tablet
**Notes**: ________________

**Temporary Password**: ________________
**Sent**: ☐ Yes (Date: ____) ☐ No

---

### User 3: Mobile User
**Role**: Tests mobile responsiveness, performance on slower connection
**Name**: ________________
**Email**: ________________
**Phone**: ________________
**Timezone**: ________________
**Availability**: ☐ Daily ☐ 3x/week ☐ 2x/week
**Device**: ☐ iPhone ☐ Android ☐ iPad
**Connection**: ☐ 4G ☐ WiFi ☐ Both
**Notes**: ________________

**Temporary Password**: ________________
**Sent**: ☐ Yes (Date: ____) ☐ No

---

### User 4: Admin Assistant
**Role**: Tests admin features, user management, freezing
**Name**: ________________
**Email**: ________________
**Phone**: ________________
**Timezone**: ________________
**Availability**: ☐ Daily ☐ 3x/week ☐ 2x/week
**Device**: ☐ Desktop ☐ Mobile ☐ Both
**Admin Experience**: ☐ Experienced ☐ New
**Notes**: ________________

**Temporary Password**: ________________
**Sent**: ☐ Yes (Date: ____) ☐ No

---

### User 5: Power User
**Role**: Tests edge cases, multiple products, withdrawals, stress testing
**Name**: ________________
**Email**: ________________
**Phone**: ________________
**Timezone**: ________________
**Availability**: ☐ Daily ☐ 3x/week ☐ 2x/week
**Device**: ☐ Desktop ☐ Mobile ☐ Both
**Tech Skill**: ☐ Beginner ☐ Intermediate ☐ Advanced
**Notes**: ________________

**Temporary Password**: ________________
**Sent**: ☐ Yes (Date: ____) ☐ No

---

### User 6 (Optional)
**Role**: ________________
**Name**: ________________
**Email**: ________________
**Phone**: ________________
**Timezone**: ________________
**Availability**: ☐ Daily ☐ 3x/week ☐ 2x/week
**Device**: ☐ Desktop ☐ Mobile ☐ Tablet
**Notes**: ________________

**Temporary Password**: ________________
**Sent**: ☐ Yes (Date: ____) ☐ No

---

### User 7 (Optional)
**Role**: ________________
**Name**: ________________
**Email**: ________________
**Phone**: ________________
**Timezone**: ________________
**Availability**: ☐ Daily ☐ 3x/week ☐ 2x/week
**Device**: ☐ Desktop ☐ Mobile ☐ Tablet
**Notes**: ________________

**Temporary Password**: ________________
**Sent**: ☐ Yes (Date: ____) ☐ No

---

## Beta User Creation Instructions

### Using Frontend UI
1. Go to your deployed app: https://your-app.vercel.app
2. Click "Sign Up"
3. Enter user details:
   - Email: [from list above]
   - Password: [temporary password]
   - Name: [from list above]
   - Gender: [your choice]
4. Send them the credentials

### Using API
```bash
curl -X POST https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "TempPassword@2026",
    "name": "User Name",
    "gender": "M"
  }'
```

---

## Daily Check-In Template

**Day: _________ | User: _________________**

```
What worked great today?
☐ Signup
☐ Dashboard
☐ Product submission
☐ Earnings tracking
☐ Referral system
☐ Admin features
Other: ________________________________

What had issues?
☐ Bug found: ___________________________
☐ Slow loading: _________________________
☐ Confusing flow: ________________________
Steps to reproduce: ________________________

Usability feedback:
☐ Intuitive ☐ Confusing ☐ Missing features
Specific feedback: ________________________

Performance:
☐ Fast ☐ Acceptable ☐ Slow
Device used: ☐ Desktop ☐ Mobile ☐ Tablet
Browser: ________________________________

Tomorrow's plan:
Test area: ________________________________
Potential blockers: _________________________
```

---

## Weekly Retrospective Notes

**Week 1 (Feb 24-28)**

### Biggest Wins
- Feature 1: ________________
- Feature 2: ________________
- Feature 3: ________________

### Critical Bugs (Must Fix Before Go-Live)
1. ________________
   - Severity: ☐ Critical ☐ High
   - Status: ☐ New ☐ In Progress ☐ Fixed ☐ Verified

2. ________________
   - Severity: ☐ Critical ☐ High
   - Status: ☐ New ☐ In Progress ☐ Fixed ☐ Verified

### Medium Priority Issues
1. ________________
2. ________________

### User Satisfaction Score
Average (1-10): ________

### Launch Decision
- [ ] GO - Ready for public launch
- [ ] NO-GO - Need more fixes (timeline: ________)

---

## Communication Checklist

**Before Launch** (Feb 24)
- [ ] All beta users notified
- [ ] Credentials sent securely
- [ ] Slack channel created
- [ ] Daily standup scheduled (5 PM EST)
- [ ] Bug report form ready
- [ ] Support email monitored

**During Testing** (Feb 24-28)
- [ ] Daily check-ins with users
- [ ] Bugs triaged and prioritized
- [ ] Fixes deployed and verified
- [ ] User feedback documented
- [ ] Performance monitored
- [ ] Uptime tracked

**Before Go/No-Go** (Feb 28)
- [ ] All critical bugs fixed
- [ ] All medium bugs reviewed
- [ ] User feedback summarized
- [ ] Performance acceptable
- [ ] Admin dashboard verified
- [ ] Deployment plan finalized

---

## Tracking Sheet

Track each user's progress and feedback:

| Date | User | Action | Status | Notes |
|------|------|--------|--------|-------|
| 2/24 | User1 | Sent invite | ✓ | Confirmed received |
| 2/24 | User1 | Signup | ✓ | Account created |
| 2/24 | User1 | Dashboard review | ⏳ | In progress |
| 2/25 | User1 | Product submit | ✓ | 1 product submitted |
| 2/25 | User1 | Earnings check | ✓ | Balance correct |
| | | | | |
| 2/24 | User2 | Sent invite | ✓ | Confirmed received |
| 2/24 | User2 | Signup | ✓ | Account created |
| 2/24 | User2 | Referral test | ⏳ | In progress |

---

## Success Metrics

### By End of Week 1
- ☐ All beta users signed up
- ☐ 80%+ submitted first product
- ☐ 60%+ created referral links
- ☐ 0 critical bugs unfixed
- ☐ Average satisfaction > 7/10
- ☐ No data loss incidents

### Blockers
Currently blocking launch:
- Item 1: ________________ (Priority: ☐ Critical ☐ High ☐ Medium)
- Item 2: ________________ (Priority: ☐ Critical ☐ High ☐ Medium)

---

**Ready to send invitations? Fill in the form above and start reaching out to your beta users!**
