# Frontend Deployment Guide

## Current Status
- ✅ Frontend built and ready in `dist/` folder
- ✅ Backend deployed to production
- ✅ Admin user created and verified
- ✅ All 27 tests passing

## Deployment Options

### Option 1: Vercel (Recommended - 2 minutes)
**Best for**: Automatic deployments, easiest setup

1. **Create Vercel Account**
   - Go to https://vercel.com/signup
   - Sign in with GitHub (recommended)

2. **Import Project**
   - Click "Add New Project"
   - Select your GitHub repo
   - Framework: **Vite**
   - Root directory: **.**
   - Build command: `npm run build`
   - Install command: `npm install`

3. **Environment Variables**
   - Add in Vercel Dashboard → Settings → Environment Variables:
   ```
   VITE_SUPABASE_URL=https://tpxgfjevorhdtwkesvcb.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRweGdmamV2b3JoZHR3a2VzdmNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNDE3MjIsImV4cCI6MjA4NjgxNzcyMn0.K50o48WDbgmWvASexy3SCX2XfWiP_WQtCAkou49aFO8
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait 1-2 minutes
   - Get production URL (e.g., https://clone-platform.vercel.app)

---

### Option 2: Netlify (2 minutes)
**Best for**: Simpler UI, great free tier

1. **Go to Netlify**
   - https://netlify.com
   - Sign in with GitHub

2. **Connect Repository**
   - Click "Import an existing project"
   - Select your GitHub repo
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Environment Variables**
   - Before deployment, add:
   ```
   VITE_SUPABASE_URL=https://tpxgfjevorhdtwkesvcb.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRweGdmamV2b3JoZHR3a2VzdmNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNDE3MjIsImV4cCI6MjA4NjgxNzcyMn0.K50o48WDbgmWvASexy3SCX2XfWiP_WQtCAkou49aFO8
   ```

4. **Deploy**
   - Click "Deploy site"
   - Wait 1-2 minutes
   - Get production URL

---

### Option 3: Supabase Hosting (0 minutes)
**Best for**: Keeping everything in one place

1. **Upload to Supabase**
   ```bash
   npm run build
   npx supabase projects list  # Verify auth
   ```

2. **Manual Upload**
   - Files are in `dist/` folder
   - Upload to your web host
   - Set custom domain in Supabase

---

### Option 4: GitHub Pages (Free)
**Best for**: No backend required use cases

1. **Update vite.config.ts**
   ```typescript
   export default {
     base: '/clone-platform/',  // your repo name
   }
   ```

2. **Deploy**
   ```bash
   npm run build
   npm install gh-pages --save-dev
   npx gh-pages -d dist
   ```

3. **Go live**
   - Settings → Pages → Deploy from branch
   - Select `gh-pages` branch
   - Custom domain (optional)

---

## Quick Setup (Vercel)

```bash
# 1. Ensure dist/ is built
npm run build

# 2. Push to GitHub
git add .
git commit -m "Ready for production"
git push origin main

# 3. Connect to Vercel
# - Go to https://vercel.com/import
# - Select your repo
# - Add VITE_* env vars from above
# - Deploy

# 4. Get production URL
# - Vercel dashboard shows your live URL
```

---

## Custom Domain Setup

### For Vercel:
1. Vercel Dashboard → Settings → Domains
2. Add your domain (e.g., app.cloneplatform.com)
3. Follow DNS setup instructions
4. Wait 5-10 minutes for DNS propagation

### For Netlify:
1. Netlify Dashboard → Domain management
2. Add custom domain
3. Update DNS records
4. Netlify shows current records

---

## Post-Deployment Checklist

- [ ] Frontend loads without errors
- [ ] Can sign up as new user
- [ ] Can sign in as admin
- [ ] Admin dashboard accessible
- [ ] Can submit products
- [ ] Can view earnings
- [ ] Referral links work
- [ ] All pages load properly
- [ ] No console errors
- [ ] Performance is acceptable

---

## Testing Production Frontend

```bash
# Test the deployed site
curl https://your-app.vercel.app/
# Should return HTML, not error

# Check health endpoint
curl https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/make-server-44a642d3/health
# Should return {"status":"ok"}
```

---

## Rollback Plan

If deployment has issues:

1. **Vercel**: Click "Deployments" → Previous version → "Redeploy"
2. **Netlify**: Click "Deploys" → Previous deploy → "Restore"
3. **GitHub Pages**: Revert last commit and push

---

## Next Steps After Deployment

1. ✅ Test all user flows in production
2. ✅ Verify backend connectivity
3. ✅ Setup uptime monitoring (optional)
4. ✅ Create beta user access list
5. ✅ Send invitations to first users
6. ✅ Monitor error logs

---

**Estimated Time**: 2-5 minutes depending on option chosen
**Recommendation**: Use **Vercel** - it's fastest and most reliable
