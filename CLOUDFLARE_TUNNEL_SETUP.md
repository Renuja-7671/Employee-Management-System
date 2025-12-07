# Cloudflare Tunnel Setup Guide for uniquein.lk

## Real-time Attendance Webhooks using Your Company Domain

This guide shows you how to set up **real-time attendance webhooks** using your existing company domain `uniquein.lk` with Cloudflare Tunnel - **completely free**.

---

## What You'll Get

✅ **Real-time attendance updates** - Instant sync when fingerprint scanned
✅ **Professional webhook URL** - `https://ems.uniquein.lk/api/attendance/webhook`
✅ **Free forever** - No monthly costs, no bandwidth limits
✅ **Automatic SSL** - HTTPS included
✅ **24/7 operation** - Runs continuously in background
✅ **Company subdomain** - Uses `ems.uniquein.lk` for EMS application
✅ **No service disruption** - Main website `www.uniquein.lk` continues running

---

## Prerequisites

- ✅ Company domain: `uniquein.lk` (already owned)
- ✅ Computer on same network as Hikvision device
- ✅ Access to domain registrar (where `uniquein.lk` was purchased)
- ✅ 30 minutes for setup + 24-48 hours for DNS propagation

---

## Part 1: Add Domain to Cloudflare (One-time Setup)

### Step 1: Create Cloudflare Account

1. Go to https://dash.cloudflare.com/sign-up
2. Sign up with your company email
3. Verify email
4. Login to Cloudflare Dashboard

### Step 2: Add Your Domain

1. Click **"Add a Site"**
2. Enter: `uniquein.lk`
3. Click **"Add site"**

### Step 3: Select Free Plan

1. Cloudflare will show plan options
2. Select **"Free"** plan ($0/month)
3. Click **"Continue"**

### Step 4: Import DNS Records

1. Cloudflare will scan and import your existing DNS records
2. Review the records shown
3. Click **"Continue"**

### Step 5: Update Nameservers

Cloudflare will provide 2 nameservers like:
```
alice.ns.cloudflare.com
bob.ns.cloudflare.com
```

**Copy these nameservers** - you'll need them in the next step.

### Step 6: Change Nameservers at Your Registrar

Go to your domain registrar (where you bought `uniquein.lk` - likely LK Domain Registry, GoDaddy, Namecheap, etc.):

1. Login to your domain registrar account
2. Find domain management for `uniquein.lk`
3. Look for **"Nameservers"** or **"DNS Settings"**
4. Change from current nameservers to Cloudflare's nameservers:
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
5. Save changes

**Common Registrars:**
- **LK Domain**: https://www.nic.lk
- **GoDaddy**: Domains → uniquein.lk → Manage DNS → Nameservers
- **Namecheap**: Domain List → Manage → Nameservers

### Step 7: Wait for DNS Propagation

1. Go back to Cloudflare Dashboard
2. Click **"Done, check nameservers"**
3. Wait for Cloudflare to verify (24-48 hours, usually much faster)
4. You'll receive an email when it's active

**Check status:** https://dash.cloudflare.com → uniquein.lk → Overview

---

## Part 2: Install Cloudflare Tunnel (On Company Computer)

**Important:** Install on the computer that has access to your Hikvision device (same network where device is connected).

### For macOS:

```bash
# Install using Homebrew
brew install cloudflare/cloudflare/cloudflared
```

### For Windows:

1. Download from: https://github.com/cloudflare/cloudflared/releases/latest
2. Download file: `cloudflared-windows-amd64.exe`
3. Rename to: `cloudflared.exe`
4. Move to: `C:\Program Files\Cloudflared\cloudflared.exe`
5. Add to PATH or run from that directory

### For Linux:

```bash
# Debian/Ubuntu
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Or install via package manager
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

### Verify Installation:

```bash
cloudflared --version
```

Should show version like: `cloudflared version 2024.x.x`

---

## Part 3: Configure Cloudflare Tunnel

### Step 1: Login to Cloudflare

Open terminal/command prompt and run:

```bash
cloudflared tunnel login
```

**What happens:**
- Opens browser window automatically
- Shows Cloudflare login page
- Login with your Cloudflare account
- Select domain: `uniquein.lk`
- Click **"Authorize"**

**Result:**
```
You have successfully logged in.
If you wish to copy your credentials to a server, they have been saved to:
/Users/yourname/.cloudflared/cert.pem
```

### Step 2: Create Tunnel

```bash
cloudflared tunnel create ems-attendance
```

**Output will show:**
```
Tunnel credentials written to /Users/yourname/.cloudflared/abc123-def456-ghi789.json
Created tunnel ems-attendance with id abc123-def456-ghi789
```

**Important:** Save this tunnel ID! You'll need it in the next steps.

For this guide, let's say your tunnel ID is: `abc123-def456-ghi789`

### Step 3: Create Configuration File

Create a configuration file for the tunnel:

**macOS/Linux:**
```bash
nano ~/.cloudflared/config.yml
```

**Windows:**
```powershell
notepad C:\Users\YourName\.cloudflared\config.yml
```

**Paste this content** (replace with your actual values):

```yaml
tunnel: abc123-def456-ghi789
credentials-file: /Users/yourname/.cloudflared/abc123-def456-ghi789.json

ingress:
  - hostname: ems.uniquein.lk
    service: https://your-vercel-app.vercel.app
  - service: http_status:404
```

**Replace:**
- `abc123-def456-ghi789` → Your actual tunnel ID from Step 2
- `/Users/yourname/.cloudflared/abc123-def456-ghi789.json` → Actual path from Step 2
- `your-vercel-app.vercel.app` → Your actual Vercel deployment URL

**For Windows**, change the path to:
```yaml
credentials-file: C:\Users\YourName\.cloudflared\abc123-def456-ghi789.json
```

Save and close the file.

### Step 4: Route DNS to Tunnel

```bash
cloudflared tunnel route dns ems-attendance ems.uniquein.lk
```

**Output:**
```
Successfully created DNS route for ems.uniquein.lk
```

**This creates a CNAME record in Cloudflare:**
```
ems.uniquein.lk → abc123-def456-ghi789.cfargotunnel.com
```

You can verify this in:
- Cloudflare Dashboard → uniquein.lk → DNS → Records

### Step 5: Test the Tunnel

Start the tunnel manually to test:

```bash
cloudflared tunnel run ems-attendance
```

**Expected output:**
```
INFO Connection registered
INFO Tunnel running
```

**Test from any computer with internet:**
```bash
curl https://ems.uniquein.lk/api/attendance/webhook
```

**Expected response:**
```json
{
  "message": "Hikvision Attendance Webhook Endpoint",
  "status": "active"
}
```

**If it works:** ✅ Tunnel is configured correctly!

**If it doesn't work:** Check:
- DNS has propagated (wait 24-48 hours from Part 1)
- Tunnel is running
- Vercel app is deployed
- Configuration file paths are correct

---

## Part 4: Install Tunnel as Service (Runs Forever)

Stop the test tunnel (Ctrl+C), then install as a service:

### macOS/Linux:

```bash
# Install service
sudo cloudflared service install

# Start service
sudo launchctl start com.cloudflare.cloudflared

# Enable on startup
sudo launchctl load /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
```

### Windows (Run Command Prompt as Administrator):

```powershell
# Install service
cloudflared service install

# Start service
sc start cloudflared
```

### Verify Service is Running:

**macOS:**
```bash
sudo launchctl list | grep cloudflared
```

**Windows:**
```powershell
sc query cloudflared
```

**Linux:**
```bash
sudo systemctl status cloudflared
```

**Result:** Service should show as "running" or "active"

---

## Part 5: Configure Hikvision Device

Now that your tunnel is running, configure the Hikvision device to send webhooks.

### Option A: Automatic Configuration (Recommended)

After deploying your app to Vercel, run:

```bash
curl -X POST https://your-vercel-app.vercel.app/api/attendance/device/configure \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://ems.uniquein.lk"}'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Device webhook configured successfully",
  "webhookUrl": "https://ems.uniquein.lk/api/attendance/webhook",
  "deviceInfo": {
    "name": "Main Entrance Fingerprint Terminal",
    "ipAddress": "192.168.1.100"
  }
}
```

### Option B: Manual Configuration

1. **Access device web interface:**
   - Open browser
   - Go to: `http://192.168.1.100` (your device IP)
   - Login with admin credentials

2. **Navigate to event settings:**
   - Configuration → Event → Basic Event

3. **Enable Access Control Event:**
   - ☑ Check "Access Control Event"
   - ☑ Check "Enable Event Notification"

4. **Configure HTTP Listening:**
   - Protocol Type: `HTTPS`
   - URL: `https://ems.uniquein.lk/api/attendance/webhook`
   - Method: `POST`
   - Authentication: `none`

5. **Save settings**

---

## Part 6: Test End-to-End

### Step 1: Scan Fingerprint

Have an employee (with enrolled fingerprint) scan their finger on the device.

### Step 2: Check Vercel Logs

1. Go to Vercel Dashboard
2. Your Project → Logs
3. Look for:
   ```
   [Webhook] Received attendance event: { deviceEmployeeNo: 'EMP001', ... }
   [Webhook] Processed successfully
   ```

### Step 3: Verify Database

```sql
-- Check attendance logs
SELECT * FROM "AttendanceLog"
ORDER BY "createdAt" DESC
LIMIT 5;

-- Check attendance records
SELECT
  u."firstName",
  u."lastName",
  a."checkIn",
  a."checkOut",
  a.source
FROM "Attendance" a
JOIN "User" u ON u.id = a."userId"
WHERE a.date = CURRENT_DATE
ORDER BY a."checkIn" DESC;
```

**Expected:**
- New record in `AttendanceLog` table
- New/updated record in `Attendance` table
- `source` should be `'BIOMETRIC'`

---

## Complete Setup Summary

| Step | Status | Time |
|------|--------|------|
| Add domain to Cloudflare | ⏳ Waiting | 24-48 hours |
| Install cloudflared | ✅ Complete | 5 minutes |
| Create tunnel | ✅ Complete | 2 minutes |
| Configure tunnel | ✅ Complete | 5 minutes |
| Route DNS | ✅ Complete | 1 minute |
| Install as service | ✅ Complete | 2 minutes |
| Configure device | ✅ Complete | 5 minutes |
| Test | ✅ Complete | 5 minutes |

**Total active time:** ~25 minutes
**Total waiting time:** 24-48 hours (DNS propagation)

---

## Your Webhook URL

After setup is complete:

```
https://ems.uniquein.lk/api/attendance/webhook
```

This URL:
- ✅ Forwards to your Vercel app
- ✅ Receives real-time events from Hikvision device
- ✅ Works 24/7 automatically
- ✅ Free forever
- ✅ Uses company subdomain for EMS

---

## Monitoring & Troubleshooting

### Check Tunnel Status

```bash
# View tunnel info
cloudflared tunnel info ems-attendance

# View running tunnels
cloudflared tunnel list
```

### Check Tunnel Logs

**macOS:**
```bash
sudo tail -f /var/log/cloudflared.log
```

**Windows:**
```powershell
# Event Viewer → Windows Logs → Application
# Look for "cloudflared" source
```

**Linux:**
```bash
sudo journalctl -u cloudflared -f
```

### Common Issues

#### Issue: "Invalid or expired reset link" when testing webhook

**Solution:** Wait for DNS propagation (24-48 hours). Check if DNS is ready:
```bash
nslookup ems.uniquein.lk
```

Should return Cloudflare IP addresses.

#### Issue: Tunnel not starting

**Check:**
1. Configuration file syntax (YAML is space-sensitive)
2. Tunnel ID is correct
3. Credentials file path is correct

**Fix:**
```bash
# Validate config
cloudflared tunnel ingress validate
```

#### Issue: Device can't reach webhook

**Check:**
1. Tunnel is running (check service status)
2. DNS has propagated
3. Device has internet access
4. Webhook URL is correct in device settings

**Test:**
```bash
# From device network, test connectivity
curl https://ems.uniquein.lk/api/attendance/webhook
```

#### Issue: Events not appearing in database

**Check:**
1. Vercel logs for webhook calls
2. Employee mapping exists in `BiometricMapping` table
3. Device employee number matches mapping

**Debug:**
```sql
-- Check if employee mapping exists
SELECT * FROM "BiometricMapping" WHERE "deviceEmployeeNo" = 'EMP001';

-- Check raw logs
SELECT * FROM "AttendanceLog" WHERE processed = false;
```

---

## Backup & Fallback

Even with webhooks enabled, you still have the **backup cron job** running:

- **Schedule:** 6:30 PM daily (Sri Lanka Time)
- **Purpose:** Catch any missed webhook events
- **Automatic:** No manual intervention needed

This ensures:
- ✅ If tunnel goes down temporarily, cron job catches up
- ✅ If device loses internet, cron syncs when back online
- ✅ Redundancy for critical attendance data

---

## Cost Breakdown

| Service | Monthly Cost | Annual Cost |
|---------|--------------|-------------|
| Cloudflare Free Plan | $0 | $0 |
| Cloudflare Tunnel | $0 | $0 |
| DNS Hosting | $0 | $0 |
| SSL Certificate | $0 | $0 |
| Bandwidth | $0 (unlimited) | $0 |
| **TOTAL** | **$0** | **$0** |

**Domain cost:** Already paid for `uniquein.lk` - no additional cost!

---

## Next Steps After Setup

1. **Deploy to Production:**
   ```bash
   git add .
   git commit -m "Configure Cloudflare Tunnel for real-time attendance"
   git push
   ```

2. **Add Environment Variable in Vercel:**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add: `NEXT_PUBLIC_APP_URL` = `https://your-app.vercel.app`
   - Redeploy

3. **Add Device to Database:**
   ```sql
   INSERT INTO "BiometricDevice" (...) VALUES (...);
   ```

4. **Create Employee Mappings:**
   ```sql
   INSERT INTO "BiometricMapping" (...) VALUES (...);
   ```

5. **Test Real-time Attendance:**
   - Scan fingerprint
   - Check Vercel logs (should see webhook call)
   - Verify database updated

---

## Support & Resources

**Cloudflare Tunnel Documentation:**
- https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/

**Your Setup Files:**
- [ATTENDANCE_QUICK_START.md](./ATTENDANCE_QUICK_START.md) - Quick setup guide
- [ATTENDANCE_SETUP_PRODUCTION.md](./ATTENDANCE_SETUP_PRODUCTION.md) - Full production guide

**API Endpoints:**
- Webhook: `https://ems.uniquein.lk/api/attendance/webhook`
- Sync Status: `https://your-app.vercel.app/api/attendance/sync`
- Device Config: `https://your-app.vercel.app/api/attendance/device/configure`

**Company Domains:**
- Main Website: `https://www.uniquein.lk`
- EMS Application: `https://ems.uniquein.lk`
- Attendance Webhook: `https://ems.uniquein.lk/api/attendance/webhook`

---

## Summary

✅ **Real-time attendance** using your company domain
✅ **100% free** - no recurring costs
✅ **Professional setup** - company branded
✅ **Reliable** - Cloudflare infrastructure
✅ **Secure** - HTTPS included
✅ **Automatic** - runs in background

Your attendance system will now receive **instant updates** when employees scan their fingerprints, using your professional company domain `uniquein.lk`!
