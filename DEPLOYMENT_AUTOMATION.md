# Deployment Automation Guide

**For**: DevOps, Release Engineers, Production Teams  
**Updated**: February 23, 2026  
**Status**: ✅ Production Ready

---

## 🚀 QUICK START

One-command production deployment:

### Windows (PowerShell)
```powershell
cd c:\path\to\clone-platform
.\deploy.ps1
```

### macOS/Linux (Bash)
```bash
cd /path/to/clone-platform
chmod +x deploy.sh
./deploy.sh
```

**That's it!** The script handles:
1. ✅ Pre-deployment validation
2. ✅ Building frontend & backend
3. ✅ Deploying to Supabase
4. ✅ Running smoke tests
5. ✅ Health checks
6. ✅ Post-deployment verification

---

## 📋 Pre-Deployment Validation

**Before deploying**, run the validation checklist:

### Windows
```powershell
.\validate-deployment.ps1
```

### macOS/Linux
```bash
chmod +x validate-deployment.sh
./validate-deployment.sh
```

**This checks**:
- ✅ TypeScript compilation
- ✅ All tests passing (27/27)
- ✅ No hardcoded secrets
- ✅ Build size acceptable
- ✅ Documentation complete
- ✅ Git status clean
- ✅ Environment configured

**Fix any ❌ failures before deploying.**

---

## 🎯 Deployment Options

### Standard Production Deployment
```bash
./deploy.ps1                    # Windows
./deploy.sh                     # macOS/Linux
```

### Dry Run (Test without deploying)
```bash
./deploy.ps1 -DryRun           # Windows
./deploy.sh --dry-run          # macOS/Linux
```

Shows what would happen without making changes.

### Skip Tests (Emergency only)
```bash
./deploy.ps1 -SkipTests       # Windows
./deploy.sh --skip-tests      # macOS/Linux
```

⚠️ **Only use in emergencies** - tests validate the system works.

### Deploy to Staging
```bash
./deploy.ps1 -Environment staging    # Windows
./deploy.sh --environment staging    # macOS/Linux
```

---

## npm Scripts

You can also use npm commands:

```bash
npm run deploy              # Full deployment
npm run deploy:dry-run      # Test without changes
npm run deploy:skip-tests   # Skip smoke tests
npm run validate            # Pre-deployment checks
npm run rollback            # Emergency rollback
```

---

## 🔄 What the Deployment Script Does

### Phase 1: Pre-Deployment Validation
```
✓ Check prerequisites (Node.js, npm, Git)
✓ Verify Git status (warn if uncommitted changes)
✓ Check environment file exists
✓ Validate configuration
```

### Phase 2: Testing
```
✓ Run 27 smoke tests
✓ Verify all endpoints work
✓ Check customer service system
✓ Verify premium products
✓ Abort if any test fails
```

### Phase 3: Building
```
✓ Compile TypeScript
✓ Build frontend (Vite)
✓ Create dist/ artifacts
✓ Abort if build fails
```

### Phase 4: Deployment
```
✓ Deploy Supabase Edge Function
✓ Apply schema (if needed)
✓ Automatic rollback on failure
✓ Deployment ID recorded
```

### Phase 5: Post-Deployment Verification
```
✓ Health check (GET /health → 200)
✓ Run smoke tests on production
✓ Verify all endpoints work
✓ Performance checks
✓ Security validation
```

### Phase 6: Summary
```
✓ Deployment record created
✓ Summary report generated
✓ Team notified (Slack optional)
✓ Logs saved
```

---

## 🚨 Emergency Rollback

If deployment fails or causes issues, **immediately rollback**:

### Automatic Rollback (during deployment)
The script automatically rolls back if:
- Function deployment fails
- Health check fails
- Tests fail post-deployment

Manual rollback available during deployment if needed.

### Manual Rollback
```powershell
# Rollback 1 commit
.\rollback.ps1

# Rollback 3 commits
.\rollback.ps1 -Commits 3

# Rollback to specific tag
.\rollback.ps1 -Tag v1.0.0

# Dry run (see what would happen)
.\rollback.ps1 -DryRun

# Force rollback (no confirmation)
.\rollback.ps1 -Force
```

**Rollback does**:
1. Revert code to previous version
2. Rebuild project
3. Redeploy to production
4. Run health check
5. Run smoke tests
6. Create rollback record

---

## 📊 Deployment Records

Each deployment creates a record:

```json
{
  "deploymentId": "20260223-143022",
  "timestamp": "2026-02-23T14:30:22Z",
  "environment": "production",
  "duration": "2.5 minutes",
  "status": "SUCCESS",
  "version": "abc1234",
  "functionUrl": "https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3"
}
```

Location: `deployment-records/`

View recent deployments:
```bash
ls -la deployment-records/
# Or on Windows:
dir deployment-records
```

---

## 🔐 Environment Configuration

### Required Variables

Create `.env.local` or `.env.production.local`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://tpxgfjevorhdtwkesvcb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...   # Public key (safe to expose)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Admin key (keep SECRET)

# Deployment Options
FUNCTION_URL=https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3
DEPLOYMENT_ENV=production
```

### For GitHub Actions Deployment

Set these **Secrets** in GitHub repository settings:

| Secret | Value |
|--------|-------|
| `SUPABASE_ACCESS_TOKEN` | From `supabase login` |
| `SUPABASE_PROJECT_ID` | From Supabase settings |
| `SUPABASE_ANON_KEY` | From Supabase API |
| `FUNCTION_URL` | Deployed function URL |
| `SLACK_WEBHOOK` | (Optional) Slack notifications |

---

## 🔔 GitHub Actions CI/CD

### Automatic Deployment on Push

Push to `main` or `production` branch triggers:

1. **Test Jobs** (~2 min)
   - Install dependencies
   - Run linting
   - Run all 27 smoke tests
   - Fail if any test fails

2. **Build Job** (~1 min)
   - Compile TypeScript
   - Build frontend
   - Create dist artifacts

3. **Deploy Job** (~2 min)
   - Deploy to Supabase
   - Run health check
   - Run smoke tests on production
   - Auto-rollback on failure

4. **Notification** (~30 sec)
   - Slack notification (if configured)
   - GitHub deployment record
   - Email to team (if configured)

### View Workflow Status

```
GitHub → Actions → Deploy to Production
```

---

## 📈 Monitoring Post-Deployment

### Function Logs
```bash
supabase functions logs make-server-44a642d3 -n 50
```

### Real-time Logs
```bash
supabase functions logs make-server-44a642d3 --follow
```

### View Errors
```bash
supabase functions logs make-server-44a642d3 | grep ERROR
```

### Function Performance
- Check Supabase Dashboard → Functions page
- View execution time, errors, invocations

### Health Check
```bash
curl https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/health
# Expected: { "status": "ok" }
```

---

## ✅ Deployment Checklist

**Before clicking deploy**:

- [ ] Run `npm run validate` - all checks pass
- [ ] Run `npm run test:smoke` - all 27 tests pass
- [ ] Review changes in last commit
- [ ] Update CHANGELOG.md
- [ ] Tag release in Git (optional)
- [ ] Notify team in Slack
- [ ] Have rollback plan ready
- [ ] Check Supabase status page (no incidents)
- [ ] Confirm environment variables set correctly
- [ ] Recent backup exists

**After deployment**:

- [ ] Monitor logs for 5 minutes
- [ ] Run health check: `curl /health`
- [ ] Test critical flows manually:
  - [ ] Signup/signin
  - [ ] Product submission
  - [ ] Withdrawal request
  - [ ] Support ticket
  - [ ] Premium assignment
- [ ] Check metrics (errors, response times)
- [ ] Get team confirmation it's working
- [ ] Create deployment record

---

## 🐛 Troubleshooting

### "Tests failed - deployment aborted"

```bash
# Run tests locally to see errors
npm run test:smoke

# Or individual test suites
npm run test:endpoints
npm run test:customer-service
npm run test:premium

# Check function logs
supabase functions logs make-server-44a642d3 -n 100

# Fix the issue, then deploy again
```

### "Build failed"

```bash
# Check for TypeScript errors
npx tsc --noEmit

# Rebuild from scratch
rm -rf node_modules package-lock.json dist
npm install
npm run build

# If still failing, check dependencies
npm audit
npm install
```

### "Health check failed"

```bash
# Test endpoint directly
curl -v https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/health

# View function logs
supabase functions logs make-server-44a642d3

# Function may be starting up - wait 30 seconds and retry
sleep 30
curl https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/health
```

### "Permission denied on deploy.ps1"

```powershell
# Allow script execution (Windows)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or bypass for one command
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

### "supabase CLI not found"

```bash
# Install Supabase CLI
npm install -g supabase

# Or use npx
npx supabase --version
```

---

## 📊 Deployment Metrics

Track deployment health:

| Metric | Target | Action |
|--------|--------|--------|
| **Deploy Time** | < 5 min | Great! |
| **Health Check** | 200 OK | Essential |
| **Test Pass Rate** | 27/27 (100%) | Must pass |
| **Post-Deploy Errors** | 0 | Investigate |
| **Cold Start** | < 3s | First request |
| **Warm Start** | < 100ms | Subsequent |

---

## 🔗 Integration with CI/CD

### GitHub Actions (Included)

The `.github/workflows/deploy.yml` file handles:
- Test on every pull request
- Deploy on push to `main`
- Automatic rollback on failure
- Slack notifications

### Other CI/CD Systems

**GitLab CI**:
- Adapt deploy.sh to GitLab Runner
- Use same npm commands

**Jenkins**:
```groovy
pipeline {
  post {
    success {
      sh 'npm run deploy'
    }
  }
}
```

**Azure DevOps**:
```yaml
- task: PowerShell@2
  inputs:
    targetType: 'filePath'
    filePath: './deploy.ps1'
```

---

## 🎓 Deployment Best Practices

### 1. Always Test First
```bash
npm run validate    # Pre-flight checks
npm run test:smoke  # Full test suite
```

### 2. Dry Run for Critical Deployments
```bash
./deploy.ps1 -DryRun
# Review what will change before proceeding
```

### 3. Deploy During Business Hours
- Have team available to monitor
- Support on standby for issues
- Don't deploy on Fridays before holidays

### 4. Tag Releases in Git
```bash
git tag -a v1.0.0 -m "Production release"
git push origin v1.0.0
```

### 5. Keep Deployment Records
```bash
# Review recent deployments
ls -la deployment-records/
cat deployment-records/20260223-143022.json
```

### 6. Monitor for 30 Minutes Post-Deploy
```bash
# Watch logs
supabase functions logs make-server-44a642d3 --follow

# Monitor key metrics
curl https://.../health  # Every 5 min
```

### 7. Have Rollback Plan Ready
```bash
# Know how to rollback before deploying
./rollback.ps1 -DryRun  # See what rollback would do
```

### 8. Communicate with Team
- Pre-deployment: Slack message
- During: Status updates
- Post: Confirmation it worked
- Issue: Escalation plan

---

## 📚 Related Documentation

- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Command reference
- [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md) - Detailed ops procedures
- [PRODUCTION_LAUNCH_SUMMARY.md](PRODUCTION_LAUNCH_SUMMARY.md) - Deployment sign-off
- [TEAM_ONBOARDING.md](TEAM_ONBOARDING.md) - New member setup
- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) - API integration

---

## 🆘 Emergency Support

**If deployment fails in production**:

1. **Don't panic** - we have rollback capability
2. **Keep it running** - rollback takes <5 min
3. **Check logs** - `supabase functions logs ...`
4. **Rollback** - `./rollback.ps1`
5. **Post-mortem** - Fix root cause
6. **Redeploy** - Try again

**Escalation**:
- P1 issue: Page on-call engineer
- Production down: Execute rollback immediately
- Data corrupted: Restore from backup (prep in advance!)

---

## ✨ You're Ready to Deploy!

Your system is fully automated and production-ready.

Next deployment:
```bash
npm run validate && npm run deploy
```

Good luck! 🚀
