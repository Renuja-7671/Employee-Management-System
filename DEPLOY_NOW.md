# 🚀 Deploy to Vercel - Step by Step

## Current Status
✅ Prisma schema has been fixed for Vercel
⚠️ **Changes need to be committed and pushed to trigger redeployment**

## What's Fixed
The [prisma/schema.prisma](prisma/schema.prisma) file has been updated with the correct binary target for Vercel:
```prisma
binaryTargets = ["native", "rhel-openssl-3.0.x"]  // ✅ Correct for Vercel
```

## Deploy Steps

### Step 1: Check Current Git Status
```bash
git status
```
You should see `prisma/schema.prisma` as modified.

### Step 2: Commit the Fix
```bash
git add prisma/schema.prisma VERCEL_DEPLOYMENT_GUIDE.md VERCEL_FIX_APPLIED.md DEPLOY_NOW.md
git commit -m "Fix Prisma binary target for Vercel deployment

- Updated schema.prisma to use rhel-openssl-3.0.x for Vercel
- Added comprehensive deployment guide
- Fixed Prisma query engine not found error"
```

### Step 3: Push to GitHub
```bash
git push origin main
```

### Step 4: Watch Vercel Redeploy
1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Click on your project
3. Watch the deployment progress
4. Vercel will automatically:
   - Detect the new commit
   - Install dependencies
   - Run `prisma generate` (with the correct binary target now!)
   - Build the Next.js app
   - Deploy successfully ✅

### Step 5: Verify Deployment

#### 5.1 Check Build Logs
In Vercel dashboard:
1. Click on the latest deployment
2. Go to "Building" tab
3. Look for this line in the logs:
   ```
   ✔ Generated Prisma Client
   ```
4. Should NOT see any "query engine not found" errors

#### 5.2 Test Login
1. Go to your deployment URL
2. Try logging in with your credentials
3. Should work without Prisma errors! 🎉

#### 5.3 Test Email Functionality
1. Log in as admin
2. Go to Leave Management
3. Approve or decline a leave request
4. Check that emails are received by:
   - Employee
   - Cover employee (if assigned)
   - Admin

## Expected Timeline
- **Git push**: Instant
- **Vercel detection**: ~10 seconds
- **Build process**: ~2-3 minutes
- **Deployment**: ~30 seconds
- **Total**: ~3-4 minutes from push to live

## What Happens During Build

Vercel will run these commands in order:
```bash
# 1. Install dependencies
npm install

# 2. Post-install hook (automatic)
prisma generate  # ✅ Will use rhel-openssl-3.0.x now!

# 3. Build command (from vercel.json)
prisma generate && next build  # ✅ Double-check generation
```

## Troubleshooting

### If build still fails:
1. **Clear Vercel build cache**:
   - Go to Project Settings → General
   - Scroll to "Build & Development Settings"
   - Click "Clear Build Cache"
   - Trigger a new deployment

2. **Check environment variables**:
   - Ensure all variables from [.env.example](.env.example) are set in Vercel
   - Especially `DATABASE_URL` and `DIRECT_URL`

3. **Verify Prisma version**:
   - package.json shows: `@prisma/client: ^6.18.0` and `prisma: ^6.18.0`
   - These should match (they do ✅)

### If emails don't send:
1. Check Vercel function logs
2. Verify `EMAIL_USER`, `EMAIL_PASS`, and `ADMIN_EMAIL` are set
3. Ensure Gmail App Password is correct (not regular password)

## After Successful Deployment

1. ✅ Test all core features
2. ✅ Generate a secure `CRON_SECRET`:
   ```bash
   openssl rand -base64 32
   ```
   Add it to Vercel environment variables

3. ✅ Test the birthday email cron endpoint:
   ```bash
   curl -X GET "https://your-app.vercel.app/api/emails/birthday/auto" \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

4. ✅ Monitor logs for the first 24 hours

## Quick Reference: Git Commands

```bash
# See what's changed
git status

# Commit everything
git add .
git commit -m "Fix Prisma binary target for Vercel"

# Push to GitHub (triggers Vercel deployment)
git push origin main

# View recent commits
git log --oneline -5
```

---

**Ready to deploy?** Just run the commands in Step 2 and Step 3 above! 🚀
