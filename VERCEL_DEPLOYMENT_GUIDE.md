# Vercel Deployment Guide for EMS

This guide will walk you through deploying your Employee Management System to Vercel.

## Prerequisites

- A Vercel account (sign up at [vercel.com](https://vercel.com))
- Your code pushed to a GitHub repository
- Supabase database already set up (which you have)
- Gmail account with App Password for email functionality

## Step 1: Prepare Your Repository

1. Make sure all your code is committed and pushed to GitHub:
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. Verify your `vercel.json` is configured (already done ✓):
   - Build command includes Prisma generation
   - Cron job configured for birthday emails at 6 AM daily
   - Region set to Singapore (sin1)

## Step 2: Import Project to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Click "Import"

## Step 3: Configure Environment Variables

In the Vercel project settings, add the following environment variables:

### Database Configuration
```
DATABASE_URL=postgresql://postgres.avzbvevtfmuatitdzrbu:uniqueINDUSTRIAL321%40@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

DIRECT_URL=postgresql://postgres:uniqueINDUSTRIAL321%40@db.avzbvevtfmuatitdzrbu.supabase.co:5432/postgres
```

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://avzbvevtfmuatitdzrbu.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2emJ2ZXZ0Zm11YXRpdGR6cmJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NzM2MDQsImV4cCI6MjA3NjM0OTYwNH0.eTj32DdeTO2Z32b4IRmN91V7jhBPFJr9LgznIUdGpT4

NEXT_PUBLIC_PROJECT_ID=avzbvevtfmuatitdzrbu
```

### Application Configuration
```
NEXT_PUBLIC_SETUP_PASSWORD=UIS_ADMIN_2025

NEXT_PUBLIC_APP_NAME=Unique Industrial Solutions
```

### Email Configuration
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=uniqueinhrm@gmail.com
EMAIL_PASS=qomd stqz eehd sqwi
```

### Admin Configuration
```
ADMIN_EMAIL=renujajanith@gmail.com
```

### Cron Job Security
```
CRON_SECRET=your-secure-random-secret-key
```

**IMPORTANT**: Replace `your-secure-random-secret-key` with a secure random string. You can generate one using:
```bash
openssl rand -base64 32
```

## Step 4: Deploy

1. After adding all environment variables, click "Deploy"
2. Vercel will automatically:
   - Install dependencies
   - Run `prisma generate` (from vercel.json build command)
   - Build your Next.js application
   - Deploy to a production URL

## Step 5: Post-Deployment Verification

### 1. Check Database Connection
Visit your deployment URL and verify:
- Login page loads correctly
- You can log in with existing credentials
- Employee dashboard loads without errors

### 2. Test Email Functionality
- Approve or decline a leave request
- Check if emails are sent to:
  - Employee
  - Cover employee (if assigned)
  - Admin

### 3. Verify Cron Job
The birthday email cron job runs daily at 6 AM (Singapore time). To test it manually:

1. Visit: `https://your-deployment-url.vercel.app/api/emails/birthday/auto`
2. Add the Authorization header:
   ```
   Authorization: Bearer YOUR_CRON_SECRET
   ```

You can test this using curl:
```bash
curl -X GET "https://your-deployment-url.vercel.app/api/emails/birthday/auto" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Step 6: Domain Configuration (Optional)

1. Go to your Vercel project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Follow Vercel's instructions to configure DNS

## Common Issues and Troubleshooting

### Issue 1: Prisma Query Engine Not Found (CRITICAL - ALREADY FIXED!)
**Symptom**: "Prisma Client could not locate the Query Engine for runtime 'rhel-openssl-3.0.x'"

**Status**: ✅ **FIXED** - The `prisma/schema.prisma` file has been updated with the correct binary target.

**What was the problem?**:
- Vercel uses `rhel-openssl-3.0.x` runtime
- The schema was configured for `rhel-openssl-1.0.x` (older version)

**The fix applied**:
```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]  // Updated for Vercel
}
```

**What you need to do**:
1. Commit the updated `prisma/schema.prisma` file
2. Push to GitHub
3. Redeploy on Vercel (it will automatically run `prisma generate` during build)

**To commit and push**:
```bash
git add prisma/schema.prisma
git commit -m "Fix Prisma binary target for Vercel deployment"
git push origin main
```

After pushing, Vercel will automatically redeploy with the fix.

### Issue 2: Database Connection Error
**Symptom**: "Can't reach database server" or connection timeout

**Solutions**:
- Verify `DATABASE_URL` and `DIRECT_URL` are correct
- Check Supabase project is active
- Ensure Supabase allows connections from Vercel IPs (usually enabled by default)

### Issue 3: Emails Not Sending
**Symptom**: Leave approval/rejection emails not received

**Solutions**:
- Verify Gmail App Password is correct (not your regular Gmail password)
- Check Gmail account has "Less secure app access" or "2-Step Verification" with App Password enabled
- Check Vercel deployment logs for email errors
- Test email configuration by approving a test leave request

### Issue 4: Profile Pictures Not Loading
**Symptom**: Profile pictures show placeholder initials instead of uploaded images

**Solutions**:
- Verify Supabase Storage is configured correctly
- Check `NEXT_PUBLIC_SUPABASE_URL` matches your Supabase project
- Ensure Supabase Storage bucket has public access for profile pictures

### Issue 5: Cron Job Not Running
**Symptom**: Birthday emails not sent automatically

**Solutions**:
- Verify `CRON_SECRET` environment variable is set
- Check Vercel cron job logs in the deployment dashboard
- Ensure the cron expression in `vercel.json` is correct
- Test the endpoint manually with the Authorization header

### Issue 6: Build Failures
**Symptom**: Deployment fails during build

**Solutions**:
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Ensure TypeScript errors are resolved
- Check that Prisma schema is valid

## Environment Variables Checklist

Before deployment, ensure you have set ALL of these:

- [ ] `DATABASE_URL`
- [ ] `DIRECT_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_PROJECT_ID`
- [ ] `NEXT_PUBLIC_SETUP_PASSWORD`
- [ ] `NEXT_PUBLIC_APP_NAME`
- [ ] `EMAIL_HOST`
- [ ] `EMAIL_PORT`
- [ ] `EMAIL_SECURE`
- [ ] `EMAIL_USER`
- [ ] `EMAIL_PASS`
- [ ] `ADMIN_EMAIL`
- [ ] `CRON_SECRET`

## Monitoring Your Deployment

### View Logs
1. Go to your Vercel project dashboard
2. Click on "Deployments"
3. Select your deployment
4. Click "Functions" to see API route logs
5. Check for any errors or warnings

### Analytics
Vercel provides built-in analytics:
1. Navigate to "Analytics" in your project
2. Monitor page views, response times, and errors

## Security Recommendations

1. **Rotate CRON_SECRET regularly**: Generate a new secret every few months
2. **Monitor email usage**: Check Gmail account for suspicious activity
3. **Enable 2FA on Vercel**: Protect your deployment account
4. **Review access logs**: Regularly check Vercel logs for unauthorized access attempts
5. **Keep dependencies updated**: Run `npm audit` and update packages regularly

## Next Steps After Deployment

1. **Test all features thoroughly** in production
2. **Share the URL** with your team for testing
3. **Monitor error logs** for the first few days
4. **Set up custom domain** if needed
5. **Configure backup strategy** for your database
6. **Document any production-specific configurations**

## Support

If you encounter issues:
- Check Vercel deployment logs
- Review Supabase database logs
- Check this guide's troubleshooting section
- Contact Vercel support for platform-specific issues

---

**Note**: Your current configuration is already optimized for Vercel deployment. The `vercel.json` file is properly configured with Prisma generation and cron jobs.
