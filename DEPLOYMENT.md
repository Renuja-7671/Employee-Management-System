# Deployment Guide

## Vercel Deployment Issues - Login Error Fix

### Problem
Getting `PrismaClientInitializationError: Invalid 'prisma.user.findUnique()' invocation` when trying to log in.

### Solution

#### 1. Fix Database URL Encoding (Already Done Locally)
The `@` symbol in the password needs to be URL encoded as `%40`.

#### 2. Configure Environment Variables in Vercel

You need to add the following environment variables in your Vercel project settings:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables for **Production**, **Preview**, and **Development**:

```
DATABASE_URL=postgresql://postgres.avzbvevtfmuatitdzrbu:uniqueINDUSTRIAL321%40@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

DIRECT_URL=postgresql://postgres:uniqueINDUSTRIAL321%40@db.avzbvevtfmuatitdzrbu.supabase.co:5432/postgres

NEXT_PUBLIC_SUPABASE_URL=https://avzbvevtfmuatitdzrbu.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2emJ2ZXZ0Zm11YXRpdGR6cmJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NzM2MDQsImV4cCI6MjA3NjM0OTYwNH0.eTj32DdeTO2Z32b4IRmN91V7jhBPFJr9LgznIUdGpT4

NEXT_PUBLIC_PROJECT_ID=avzbvevtfmuatitdzrbu

NEXT_PUBLIC_SETUP_PASSWORD=UIS_ADMIN_2025

NEXT_PUBLIC_APP_NAME=Unique Industrial Solutions
```

#### 3. Redeploy

After adding the environment variables:
1. Go to **Deployments** tab
2. Click on the three dots (...) next to the latest deployment
3. Click **Redeploy**
4. Check "Use existing Build Cache" if you want faster deployment
5. Click **Redeploy**

### Important Notes

- **URL Encoding**: The `@` in the password `uniqueINDUSTRIAL321@` must be encoded as `%40` in the DATABASE_URL
- **Binary Targets**: The Prisma schema includes `"rhel-openssl-1.0.x"` for Vercel compatibility
- **Environment**: Vercel automatically sets `NODE_ENV=production` in production deployments

### Verification Steps

After redeployment:
1. Open your Vercel deployment URL
2. Try to log in with a test user
3. Check the **Logs** tab in Vercel dashboard if issues persist
4. Look for Prisma connection errors in the logs

### Common Issues

1. **Connection Timeout**: If you get connection timeouts, the DATABASE_URL might be incorrect
2. **Authentication Failed**: Double-check the password encoding (`@` → `%40`)
3. **SSL Issues**: Ensure `?sslmode=require` is in the connection string if needed (not needed for Supabase pooler)

### Database Migration

If you need to run migrations on the production database:
```bash
DATABASE_URL="your-direct-url" npx prisma migrate deploy
```

Use the `DIRECT_URL` (not the pooler URL) for migrations.
