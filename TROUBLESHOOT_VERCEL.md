# Troubleshooting Vercel Deployment - Database Connection

## Current Issue
Build completed but still getting Prisma query engine error. This could be:
1. Environment variables not set in Vercel
2. Vercel build cache issue
3. Prisma generation failed silently during build

## Step 1: Test Database Connection

I've created a test endpoint. After deploying, visit:
```
https://your-vercel-url.vercel.app/api/test-db
```

This will show:
- ✅ If database connection works
- ✅ User count from database
- ✅ Which environment variables are set
- ❌ Detailed error if connection fails

## Step 2: Check Vercel Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

**CRITICAL: Verify ALL these are set:**

```
DATABASE_URL
DIRECT_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_PROJECT_ID
NEXT_PUBLIC_SETUP_PASSWORD
NEXT_PUBLIC_APP_NAME
EMAIL_HOST
EMAIL_PORT
EMAIL_SECURE
EMAIL_USER
EMAIL_PASS
ADMIN_EMAIL
CRON_SECRET
```

### How to check:
1. Go to https://vercel.com/dashboard
2. Click your project
3. Go to Settings → Environment Variables
4. **COUNT them** - you should have **14 variables**
5. Make sure they're set for "Production" environment

## Step 3: Check Build Logs

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Click "Building" tab
4. Search for these keywords:

### ✅ What you SHOULD see:
```
✔ Generated Prisma Client
```

### ❌ What you should NOT see:
```
Error: Prisma Client could not locate the Query Engine
```

### 📋 Copy the entire build log section that mentions "prisma" or "Prisma"

## Step 4: Clear Vercel Build Cache

If environment variables are set but still failing:

1. Go to Project Settings → General
2. Scroll down to "Build & Development Settings"
3. Click "Clear Build Cache" button
4. Go to Deployments tab
5. Click the three dots (...) on the latest deployment
6. Click "Redeploy"

## Step 5: Check Prisma Binary in Build Output

Look for this in build logs:
```
✔ Prisma Client generated
  Binary targets: native, rhel-openssl-3.0.x
```

If you see `rhel-openssl-1.0.x` instead, the updated schema wasn't deployed.

## Step 6: Verify Schema on GitHub

Visit: https://github.com/Renuja-7671/Employee-Management-System/blob/main/prisma/schema.prisma

Line 3 should show:
```prisma
binaryTargets = ["native", "rhel-openssl-3.0.x"]
```

If it shows `rhel-openssl-1.0.x`, your git push didn't work.

## Step 7: Common Environment Variable Issues

### Issue: DATABASE_URL format
**Correct format:**
```
postgresql://postgres.avzbvevtfmuatitdzrbu:uniqueINDUSTRIAL321%40@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Note the `%40`** - this is URL-encoded `@` symbol. If you entered the password with `@`, it won't work!

### Issue: DIRECT_URL format
**Correct format:**
```
postgresql://postgres:uniqueINDUSTRIAL321%40@db.avzbvevtfmuatitdzrbu.supabase.co:5432/postgres
```

### Issue: Quotes in environment variables
**DON'T include quotes in Vercel UI:**
- ❌ Wrong: `"postgresql://..."`
- ✅ Correct: `postgresql://...`

## Step 8: Manual Redeploy

If nothing else works:

```bash
# Make a small change to trigger rebuild
git commit --allow-empty -m "Trigger Vercel rebuild"
git push origin main
```

## Quick Diagnostic Commands

### Check your local git status:
```bash
git log --oneline -3
git show HEAD:prisma/schema.prisma | grep binaryTargets
```

This should show: `binaryTargets = ["native", "rhel-openssl-3.0.x"]`

### Check what's on GitHub:
```bash
curl -s https://raw.githubusercontent.com/Renuja-7671/Employee-Management-System/main/prisma/schema.prisma | grep binaryTargets
```

## What to Send Me

If still not working, please share:

1. **Screenshot of Vercel Environment Variables page** (with values hidden if needed)
2. **Build log** - the section mentioning Prisma
3. **Result from `/api/test-db` endpoint**
4. **Output of this command:**
   ```bash
   git log --oneline -3
   ```

## Expected Success

When everything works:

1. `/api/test-db` returns:
   ```json
   {
     "success": true,
     "message": "Database connection successful!",
     "data": {
       "userCount": 5,
       "environment": "production",
       "databaseUrl": "Set ✓",
       "directUrl": "Set ✓"
     }
   }
   ```

2. Login page works without errors
3. Function logs show no Prisma errors

---

**Start with Step 1 and Step 2!** Most deployment issues are missing environment variables.
