# Setting Up Cron Jobs on Hostinger

This guide explains how to configure automated cron jobs for your EMS application when deployed on Hostinger.

## Overview

Hostinger provides cron job functionality through their control panel (hPanel). Unlike Vercel's automatic configuration, you need to manually set up each cron job.

---

## 📋 **Required Cron Jobs**

Your EMS application needs the following cron jobs:

### 1. **Cleanup Expired Cover Requests** ⏰
- **Purpose**: Delete expired leave requests (not responded within 12 hours)
- **Frequency**: Every hour
- **Endpoint**: `/api/cron/cleanup-expired-covers`
- **Command**: `0 * * * *`

### 2. **Birthday Email Automation** 🎂
- **Purpose**: Send birthday wishes to employees
- **Frequency**: Daily at 5:00 AM
- **Endpoint**: `/api/emails/birthday/auto`
- **Command**: `0 5 * * *`

### 3. **Sync Public Holidays** 📅
- **Purpose**: Update holiday calendar from Calendarific API
- **Frequency**: Monthly (1st day at midnight)
- **Endpoint**: `/api/cron/sync-holidays`
- **Command**: `0 0 1 * *`

---

## 🛠️ **Setup Instructions**

### Step 1: Access Hostinger Control Panel

1. Log in to your Hostinger account
2. Navigate to **hPanel** (Hostinger Control Panel)
3. Select your hosting plan/domain
4. Look for **"Advanced"** section
5. Click on **"Cron Jobs"**

### Step 2: Add Each Cron Job

For each cron job listed above, follow these steps:

#### A. Create Cron Job #1 - Expired Cover Requests

1. **Click** "Create Cron Job" or "Add New Cron Job"
2. **Select Interval**: Choose "Custom" or "Every Hour"
3. **Set Schedule**: 
   ```
   Minute: 0
   Hour: * (every hour)
   Day: * (every day)
   Month: * (every month)
   Weekday: * (every day of week)
   ```
   
4. **Command**:
   ```bash
   curl -X GET "https://your-domain.com/api/cron/cleanup-expired-covers" \
        -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
   
   **OR** if curl doesn't work, use wget:
   ```bash
   wget -q -O /dev/null --header="Authorization: Bearer YOUR_CRON_SECRET" \
        "https://your-domain.com/api/cron/cleanup-expired-covers"
   ```

5. **Click** "Create" or "Save"

#### B. Create Cron Job #2 - Birthday Emails

1. **Click** "Create Cron Job"
2. **Set Schedule**: Daily at 5:00 AM
   ```
   Minute: 0
   Hour: 5
   Day: * (every day)
   Month: * (every month)
   Weekday: * (every day of week)
   ```

3. **Command**:
   ```bash
   curl -X GET "https://your-domain.com/api/emails/birthday/auto" \
        -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

4. **Click** "Create"

#### C. Create Cron Job #3 - Sync Holidays

1. **Click** "Create Cron Job"
2. **Set Schedule**: Monthly on 1st at midnight
   ```
   Minute: 0
   Hour: 0
   Day: 1 (first day)
   Month: * (every month)
   Weekday: * (any weekday)
   ```

3. **Command**:
   ```bash
   curl -X GET "https://your-domain.com/api/cron/sync-holidays" \
        -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

4. **Click** "Create"

---

## 🔐 **Security Setup**

### Generate CRON_SECRET

1. Generate a secure random token:
   ```bash
   # On your local machine
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Copy the generated token (e.g., `a7f3e9d2c4b8...`)

3. **Add to Environment Variables** in Hostinger:
   - Go to hPanel → **Advanced** → **Environment Variables** (or .env file)
   - Add: `CRON_SECRET=your_generated_token_here`

4. **Use in Cron Commands**:
   Replace `YOUR_CRON_SECRET` in all cron commands with your actual token

---

## 📝 **Alternative Method: Using Node.js Script**

If your Hostinger plan supports Node.js execution directly, you can create wrapper scripts:

### Create: `cron-wrapper.js`

```javascript
#!/usr/bin/env node

const https = require('https');

const DOMAIN = process.env.DOMAIN || 'your-domain.com';
const CRON_SECRET = process.env.CRON_SECRET;
const endpoint = process.argv[2]; // e.g., /api/cron/cleanup-expired-covers

if (!endpoint) {
  console.error('Usage: node cron-wrapper.js <endpoint>');
  process.exit(1);
}

const options = {
  hostname: DOMAIN,
  port: 443,
  path: endpoint,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${CRON_SECRET}`
  }
};

const req = https.request(options, (res) => {
  console.log(`[${new Date().toISOString()}] Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error(`[${new Date().toISOString()}] Error:`, error);
});

req.end();
```

### Then Use in Cron:

```bash
# Cron Job #1
0 * * * * cd /home/your-username/public_html && node cron-wrapper.js /api/cron/cleanup-expired-covers

# Cron Job #2
0 5 * * * cd /home/your-username/public_html && node cron-wrapper.js /api/emails/birthday/auto

# Cron Job #3
0 0 1 * * cd /home/your-username/public_html && node cron-wrapper.js /api/cron/sync-holidays
```

---

## 🧪 **Testing Cron Jobs**

### Method 1: Manual Test via SSH

If you have SSH access:

```bash
# SSH into your Hostinger server
ssh your-username@your-domain.com

# Test the cron command manually
curl -X GET "https://your-domain.com/api/cron/cleanup-expired-covers" \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Method 2: Test via Browser/Postman

1. Use Postman or similar tool
2. Make GET request to: `https://your-domain.com/api/cron/cleanup-expired-covers`
3. Add header: `Authorization: Bearer YOUR_CRON_SECRET`
4. Check response for success

### Method 3: Check Cron Execution Logs

In hPanel → Cron Jobs:
- Each cron job has an **email notification** option
- Enable it to receive execution reports
- Or check **"Last Run"** timestamp in the cron job list

---

## 📊 **Monitoring & Logs**

### Enable Email Notifications

1. In hPanel → Cron Jobs
2. For each cron job, set **"Email output to"**
3. Enter your email (e.g., `admin@your-domain.com`)
4. You'll receive emails with execution results

### Check Application Logs

View your Next.js application logs:
```bash
# Via SSH
tail -f /path/to/your/app/logs/application.log

# Or check Hostinger's error logs
tail -f ~/public_html/logs/error.log
```

### Expected Log Output

```bash
[CLEANUP-EXPIRED-COVERS] Starting cleanup...
[CLEANUP-EXPIRED-COVERS] Found 2 expired cover requests
[CLEANUP-EXPIRED-COVERS] Successfully cleaned up Leave ID: abc123
[CLEANUP-EXPIRED-COVERS] Cleanup completed: { totalExpired: 2 }
```

---

## ⚠️ **Common Issues & Solutions**

### Issue 1: Cron Job Not Running

**Symptoms**: No execution logs, last run shows "Never"

**Solutions**:
- Check if cron service is enabled in your hosting plan
- Verify the command syntax (no line breaks in curl command)
- Test the command manually via SSH
- Check if the path to curl/wget is correct (use `which curl`)

### Issue 2: 401 Unauthorized Error

**Symptoms**: Cron runs but returns 401 error

**Solutions**:
- Verify `CRON_SECRET` is set in environment variables
- Ensure the secret in cron command matches the environment variable
- Check if Authorization header is properly formatted
- Remove any quotes or spaces around the secret

### Issue 3: Timeout Errors

**Symptoms**: Cron job times out before completion

**Solutions**:
- Increase timeout in Hostinger settings (if available)
- Optimize the cron job endpoint (reduce database queries)
- Use `--max-time 60` flag with curl:
  ```bash
  curl --max-time 60 -X GET "https://your-domain.com/api/cron/..."
  ```

### Issue 4: Domain Not Resolving

**Symptoms**: "Could not resolve host" error

**Solutions**:
- Use IP address instead of domain:
  ```bash
  curl -X GET "http://YOUR_SERVER_IP/api/cron/cleanup-expired-covers" \
       -H "Host: your-domain.com" \
       -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```
- Check DNS propagation
- Verify SSL certificate is properly installed

---

## 🔄 **Cron Schedule Reference**

```
┌─────────────── Minute (0-59)
│ ┌───────────── Hour (0-23)
│ │ ┌─────────── Day of Month (1-31)
│ │ │ ┌───────── Month (1-12)
│ │ │ │ ┌─────── Day of Week (0-7, 0 and 7 = Sunday)
│ │ │ │ │
* * * * *
```

### Common Patterns:

```bash
# Every hour at minute 0
0 * * * *

# Every day at 5:00 AM
0 5 * * *

# Every Monday at 9:00 AM
0 9 * * 1

# First day of every month at midnight
0 0 1 * *

# Every 15 minutes
*/15 * * * *

# Every 6 hours
0 */6 * * *

# Weekdays only at 8:00 AM
0 8 * * 1-5

# Multiple times: 8 AM and 6 PM
0 8,18 * * *
```

---

## 📋 **Complete Setup Checklist**

- [ ] Generate `CRON_SECRET` token
- [ ] Add `CRON_SECRET` to Hostinger environment variables
- [ ] Access hPanel → Cron Jobs
- [ ] Create cron job for expired cover requests (every hour)
- [ ] Create cron job for birthday emails (daily 5 AM)
- [ ] Create cron job for holiday sync (monthly)
- [ ] Enable email notifications for cron jobs
- [ ] Test each cron job manually
- [ ] Wait for next scheduled run to verify
- [ ] Check application logs for execution
- [ ] Monitor for first few days
- [ ] Document any custom configurations

---

## 🔗 **Additional Resources**

- [Hostinger Cron Job Tutorial](https://www.hostinger.com/tutorials/cron-job)
- [Crontab Guru](https://crontab.guru/) - Cron schedule expression editor
- [EMS Cron Documentation](./EXPIRED-COVER-CLEANUP.md)

---

## 📞 **Support**

If you encounter issues:
1. Check Hostinger's [support documentation](https://support.hostinger.com)
2. Contact Hostinger live chat support
3. Check your application logs
4. Review the troubleshooting section above

---

**Last Updated**: January 29, 2026  
**Hostinger Compatibility**: Tested on Business/Premium plans  
**Node.js Version**: 20.x recommended
