# Email Fix Checklist for Vercel Deployment

## Current Status
✅ Database connected successfully
❌ Emails not sending in production

## Most Common Causes

### 1. Missing Email Environment Variables in Vercel
Go to Vercel Dashboard → Settings → Environment Variables

**Check these are ALL set:**
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=uniqueinhrm@gmail.com
EMAIL_PASS=qomd stqz eehd sqwi
ADMIN_EMAIL=renujajanith@gmail.com
```

### 2. EMAIL_PASS Must Be Gmail App Password
**CRITICAL:** `EMAIL_PASS` should be a Gmail App Password, NOT your regular Gmail password.

Your `.env.example` shows: `qomd stqz eehd sqwi` (with spaces)

**In Vercel, enter it WITHOUT spaces:**
```
qomdstqzeehdsqwi
```

## Quick Diagnosis

### Step 1: Deploy Test Endpoint
I created a test endpoint. Commit and push:

```bash
git add src/app/api/test-email/route.ts EMAIL_FIX_CHECKLIST.md
git commit -m "Add email configuration test endpoint"
git push origin main
```

### Step 2: Test Email Configuration
After deployment, visit:
```
https://your-app.vercel.app/api/test-email
```

**Possible Results:**

#### ✅ Success Response:
```json
{
  "success": true,
  "message": "Email configuration verified and test email sent!",
  "sentTo": "renujajanith@gmail.com"
}
```
**Action:** Check inbox - you should receive a test email!

#### ❌ Missing Variables:
```json
{
  "success": false,
  "error": "Missing email configuration",
  "missingVariables": ["EMAIL_HOST", "EMAIL_PORT", "EMAIL_USER", "EMAIL_PASS"]
}
```
**Action:** Add missing environment variables in Vercel

#### ❌ Authentication Failed:
```json
{
  "success": false,
  "error": "Invalid login: 535-5.7.8 Username and Password not accepted",
  "code": "EAUTH",
  "hint": "Authentication failed. Make sure EMAIL_PASS is a Gmail App Password"
}
```
**Action:** Verify Gmail App Password is correct

## How to Add/Update Vercel Environment Variables

1. Go to https://vercel.com/dashboard
2. Click your project
3. Go to **Settings** → **Environment Variables**
4. For each missing variable, click **"Add New"**:
   - **Name:** EMAIL_HOST
   - **Value:** smtp.gmail.com
   - **Environments:** Production, Preview, Development (check all)
   - Click **Save**

5. Repeat for all email variables:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=uniqueinhrm@gmail.com
   EMAIL_PASS=qomdstqzeehdsqwi
   ADMIN_EMAIL=renujajanith@gmail.com
   ```

## Gmail App Password Setup

If you don't have a Gmail App Password yet:

### Step 1: Enable 2-Step Verification
1. Go to https://myaccount.google.com/security
2. Click "2-Step Verification"
3. Follow the steps to enable it

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Enter: "Employee Management System"
4. Click "Generate"
5. **Copy the 16-character password** (without spaces)
6. Use THIS in Vercel as `EMAIL_PASS`

## Common Issues

### Issue 1: Spaces in App Password
**Problem:** App password has spaces like `qomd stqz eehd sqwi`
**Solution:** Remove all spaces: `qomdstqzeehdsqwi`

### Issue 2: Using Regular Gmail Password
**Problem:** Using your Gmail login password instead of App Password
**Solution:** Generate and use a Gmail App Password (see above)

### Issue 3: Environment Variables Not Applied
**Problem:** Added variables but they're not working
**Solution:**
1. Verify variables are set for "Production" environment
2. Trigger a new deployment after adding variables:
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

### Issue 4: Gmail Blocks Less Secure Apps
**Problem:** Gmail blocking SMTP connections
**Solution:** Use App Password (this bypasses less secure app blocking)

## Verify Email Works

After fixing environment variables:

### Test 1: Test Endpoint
Visit: `https://your-app.vercel.app/api/test-email`
Should send a test email to `ADMIN_EMAIL`

### Test 2: Leave Approval Email
1. Log in as admin
2. Go to Leave Management
3. Approve a leave request
4. Check these emails:
   - Employee should receive approval email
   - Cover employee should receive assignment email
   - Admin should receive confirmation email

### Test 3: Leave Rejection Email
1. Decline a leave request
2. Check all parties receive rejection emails

## Environment Variables Summary

**Total email-related variables needed: 6**

| Variable | Value | Purpose |
|----------|-------|---------|
| EMAIL_HOST | smtp.gmail.com | Gmail SMTP server |
| EMAIL_PORT | 587 | SMTP port (TLS) |
| EMAIL_SECURE | false | Use STARTTLS (not SSL) |
| EMAIL_USER | uniqueinhrm@gmail.com | Gmail account |
| EMAIL_PASS | qomdstqzeehdsqwi | Gmail App Password (no spaces!) |
| ADMIN_EMAIL | renujajanith@gmail.com | Admin notification email |

## After Adding Variables

1. **Redeploy** (variables don't apply to existing deployments)
2. **Test** the `/api/test-email` endpoint
3. **Check inbox** for test email
4. **Test leave approval/rejection** in the app

## If Still Not Working

### Check Function Logs
1. Vercel Dashboard → Your Project → Logs
2. Filter by "Error"
3. Look for email-related errors
4. Common errors:
   - "EAUTH" = Wrong password
   - "ECONNECTION" = Network issue
   - "Missing credentials" = Variables not set

### Check Email Sending Code
The email sending happens in these files:
- `src/lib/leave-emails.ts` - Email templates
- `src/lib/nodemailer.ts` - Email configuration
- `src/app/api/leaves/[id]/approve/route.ts` - Approval emails
- `src/app/api/leaves/[id]/decline/route.ts` - Rejection emails

### Debug Output
Check Vercel function logs for these messages:
```
✅ "Leave approval emails sent: { employee: { success: true }, ... }"
❌ "Error sending leave approval emails: ..."
```

## Success Checklist

- [ ] All 6 email environment variables added in Vercel
- [ ] Variables set for "Production" environment
- [ ] EMAIL_PASS is Gmail App Password (16 chars, no spaces)
- [ ] Redeployed after adding variables
- [ ] `/api/test-email` returns success
- [ ] Received test email in inbox
- [ ] Leave approval sends emails to all parties
- [ ] Leave rejection sends emails to all parties

---

**Next Step:** Add the email environment variables in Vercel, then test with `/api/test-email`
