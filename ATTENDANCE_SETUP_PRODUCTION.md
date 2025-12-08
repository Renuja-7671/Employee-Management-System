# Hikvision Attendance System - Production Setup Guide

## Overview

This system uses **real-time webhooks** as the primary method for attendance tracking, with **automated backup sync** as a failsafe. This ensures instant attendance updates while providing redundancy.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ATTENDANCE FLOW                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  PRIMARY METHOD: Real-time Webhooks (Instant Updates)        │
│  ════════════════════════════════════════════════           │
│                                                               │
│  Employee scans fingerprint                                   │
│         ↓                                                     │
│  Hikvision DS-K1A8503EF-B Terminal                           │
│         ↓                                                     │
│  HTTP POST (instant) → /api/attendance/webhook               │
│         ↓                                                     │
│  Process & save to database                                   │
│         ↓                                                     │
│  ✅ Attendance recorded in <1 second                         │
│                                                               │
│                                                               │
│  BACKUP METHOD: Scheduled Sync (Safety Net)                   │
│  ════════════════════════════════════════                    │
│                                                               │
│  Vercel Cron Job                                             │
│         ↓                                                     │
│  Runs at 10:00 AM and 6:00 PM daily                         │
│         ↓                                                     │
│  HTTP GET → Hikvision device ISAPI                           │
│         ↓                                                     │
│  Fetch last 24 hours of attendance                            │
│         ↓                                                     │
│  Process & save to database                                   │
│         ↓                                                     │
│  ✅ Catches any missed webhook events                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## System Configuration

### Cron Jobs (Vercel Free Tier: 2 Maximum)

Your system uses **exactly 2 cron jobs** (within free tier limit):

1. **Birthday Emails** - `01:00 AM daily` (`1 0 * * *`)
2. **Attendance Backup Sync** - `10:00 AM & 6:00 PM daily` (`0 10,18 * * *`)

---

## Step 1: Device Network Setup

### Physical Connection

1. Connect the Hikvision DS-K1A8503EF-B to your company LAN via Ethernet
2. Power on the device (5V DC/1A)

### Configure Static IP (Recommended)

**Via Device Menu:**
1. Press `Menu` on the device
2. Go to `Communication` → `Network`
3. Set static IP (e.g., `192.168.1.200`)
4. Set subnet mask (e.g., `255.255.255.0`)
5. Set gateway (e.g., `192.168.1.1`)
6. Set DNS (e.g., `8.8.8.8`)
7. Save settings

**Via IVMS 4200:**
1. Open IVMS 4200 software
2. Device Management → Find device
3. Right-click device → Modify Network
4. Set static IP and save

### Test Device Access

```bash
# Test connectivity from your computer
ping 192.168.1.100

# Access web interface via browser
http://192.168.1.100

# Default credentials
Username: admin
Password: Uniquein@2
```

---

## Step 2: Database Configuration

### Add Device to Database

Use your admin panel to add the device, or insert directly:

```sql
INSERT INTO "BiometricDevice" (
  id,
  name,
  "deviceType",
  "ipAddress",
  port,
  username,
  password,
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'Main Entrance Fingerprint Terminal',
  'HIKVISION',
  '192.168.1.100',  -- Your device IP
  80,
  'admin',          -- Device admin username
  'your-password',  -- Device password
  true,
  NOW(),
  NOW()
);
```

---

## Step 3: Employee Fingerprint Enrollment

### Enroll Fingerprints on Device

**Method 1: Via Device Keypad**
1. Press `Menu` → `User Management` → `Add User`
2. Enter Employee No (e.g., `EMP001`)
3. Enter name
4. Press `Fingerprint` → Place finger 3 times
5. Save

**Method 2: Via IVMS 4200**
1. Open IVMS 4200 → Person Management
2. Add new person with Employee No
3. Click `Enroll Fingerprint` → Follow prompts
4. Sync to device

### Map Device Employee Numbers to System Users

```sql
-- Create biometric mapping for each employee
INSERT INTO "BiometricMapping" (
  id,
  "employeeId",              -- User ID from your User table
  "deviceEmployeeNo",        -- Employee number on device (e.g., "EMP001")
  "fingerprintEnrolled",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'uuid-of-user-from-user-table',  -- Get this from your User table
  'EMP001',                         -- Must match device employee number
  true,
  NOW(),
  NOW()
);
```

---

## Step 4: Configure Real-time Webhooks

### Network Requirements

For webhooks to work, the Hikvision device needs to reach your Vercel app:

**Option A: Cloudflare Tunnel (Recommended)**

No port forwarding needed, fully secure:

```bash
# 1. Install Cloudflare Tunnel
# Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# 2. Login to Cloudflare
cloudflared tunnel login

# 3. Create tunnel
cloudflared tunnel create ems-attendance

# 4. Create config file: ~/.cloudflared/config.yml
tunnel: <your-tunnel-id>
credentials-file: ~/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: attendance.yourdomain.com
    service: https://your-app.vercel.app
  - service: http_status:404

# 5. Run tunnel (keep running in background)
cloudflared tunnel run ems-attendance

# 6. Add DNS record in Cloudflare dashboard
# Type: CNAME
# Name: attendance
# Target: <tunnel-id>.cfargotunnel.com
```

Now your webhook URL is: `https://attendance.yourdomain.com/api/attendance/webhook`

**Option B: Direct Internet Access**

If your company network has a public IP and allows outbound HTTP:

1. Your device can directly reach: `https://your-app.vercel.app/api/attendance/webhook`
2. Ensure firewall allows outbound HTTPS (port 443)
3. Test connectivity from device network

### Configure Webhook on Device

**Method 1: Programmatic Configuration (Easiest)**

```bash
# Call your configuration endpoint
curl -X POST https://your-app.vercel.app/api/attendance/device/configure \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://attendance.yourdomain.com"}'
```

**Method 2: Via Device Web Interface**

1. Login to device: `http://192.168.1.100`
2. Go to: **Configuration** → **Event** → **Basic Event**
3. Under **Access Control Event**, enable:
   - ☑ Access Control Event
   - ☑ Enable Event Notification
4. Configure HTTP Listening:
   - **URL**: `https://attendance.yourdomain.com/api/attendance/webhook`
   - **Method**: `POST`
   - **Protocol Version**: `HTTP/1.1`
5. Save settings

### Test Webhook

```bash
# 1. Scan fingerprint on device
# 2. Check your application logs for:
[Webhook] Received attendance event: { deviceEmployeeNo: 'EMP001', ... }

# 3. Verify in database
SELECT * FROM "AttendanceLog" ORDER BY "createdAt" DESC LIMIT 5;
SELECT * FROM "Attendance" ORDER BY date DESC LIMIT 5;
```

---

## Step 5: Environment Variables

### Production Environment (Vercel)

Add these to your Vercel project settings:

```bash
# Required
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
CRON_SECRET=<generate-random-secure-secret>

# Optional (for webhook security)
HIKVISION_WEBHOOK_SECRET=<generate-random-secure-secret>

# Generate secrets with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Adding to Vercel:**
1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Add each variable
4. Redeploy for changes to take effect

---

## Step 6: Testing

### Test Real-time Webhook

1. **Scan fingerprint on device**
2. **Check immediately** - attendance should appear in database within 1 second
3. **Verify logs** in Vercel dashboard:
   ```
   [Webhook] Received attendance event
   [Webhook] Processed successfully
   ```

### Test Backup Sync

1. **Manually trigger** backup sync:
   ```bash
   curl -X POST https://your-app.vercel.app/api/cron/attendance-sync
   ```

2. **Check logs**:
   ```
   [BACKUP SYNC] Starting scheduled backup sync...
   [BACKUP SYNC] Completed: { recordsFetched: 10, recordsProcessed: 10 }
   ```

3. **Verify database**:
   ```sql
   SELECT * FROM "AttendanceLog" WHERE processed = true;
   ```

### Test Scheduled Cron

- Wait until 10:00 AM or 6:00 PM
- Check Vercel cron logs
- Verify sync ran automatically

---

## Monitoring & Troubleshooting

### Check Device Status

**API Endpoint:**
```bash
GET https://your-app.vercel.app/api/attendance/device/configure
```

**Returns:**
```json
{
  "configured": true,
  "device": {
    "name": "Main Entrance Fingerprint Terminal",
    "ipAddress": "192.168.1.100",
    "webhookUrl": "https://attendance.yourdomain.com/api/attendance/webhook",
    "lastSyncAt": "2025-12-03T10:00:00Z",
    "recentEvents": 45
  }
}
```

### Check Sync Status

**API Endpoint:**
```bash
GET https://your-app.vercel.app/api/attendance/sync
```

**Returns:**
```json
{
  "configured": true,
  "device": {
    "name": "Main Entrance Fingerprint Terminal",
    "lastSyncAt": "2025-12-03T10:00:00Z"
  },
  "stats": {
    "totalLogs": 1000,
    "processedLogs": 998,
    "failedLogs": 2,
    "pendingLogs": 0
  },
  "recentLogs": [...]
}
```

### Common Issues

#### Issue: Webhook not receiving events

**Symptoms:**
- Fingerprint scans work on device
- No logs in Vercel dashboard
- AttendanceLog table empty

**Solutions:**
1. Check device can reach webhook URL:
   ```bash
   # From a computer on same network as device
   curl https://attendance.yourdomain.com/api/attendance/webhook
   # Should return: {"message": "Hikvision Attendance Webhook Endpoint"}
   ```

2. Check device webhook configuration:
   - Login to device web interface
   - Verify URL is correct
   - Check "Enable Event Notification" is checked

3. Check Cloudflare Tunnel is running:
   ```bash
   cloudflared tunnel list
   ```

#### Issue: Backup sync failing

**Symptoms:**
- Cron job runs but no records synced
- Error logs in Vercel

**Solutions:**
1. Verify device network access from Vercel
2. Check device credentials in database
3. Manually test sync:
   ```bash
   curl -X POST https://your-app.vercel.app/api/cron/attendance-sync
   ```

#### Issue: Employee mapping not found

**Symptoms:**
- AttendanceLog created but not processed
- Error: "Employee mapping not found"

**Solutions:**
1. Check BiometricMapping table:
   ```sql
   SELECT * FROM "BiometricMapping" WHERE "deviceEmployeeNo" = 'EMP001';
   ```

2. Create missing mapping:
   ```sql
   INSERT INTO "BiometricMapping" (...) VALUES (...);
   ```

---

## Database Queries for Monitoring

### Check Recent Attendance

```sql
-- Today's attendance
SELECT
  u."firstName",
  u."lastName",
  a.date,
  a."checkIn",
  a."checkOut",
  a."workHours",
  a.status,
  a.source
FROM "Attendance" a
JOIN "User" u ON u.id = a."userId"
WHERE a.date = CURRENT_DATE
ORDER BY a."checkIn" DESC;
```

### Check Unprocessed Logs

```sql
-- Logs waiting to be processed
SELECT
  al.*,
  bm."employeeId"
FROM "AttendanceLog" al
LEFT JOIN "BiometricMapping" bm ON bm."deviceEmployeeNo" = al."deviceEmployeeNo"
WHERE al.processed = false
ORDER BY al.timestamp DESC;
```

### Check Sync Health

```sql
-- Logs processed in last 24 hours
SELECT
  COUNT(*) as total_events,
  COUNT(CASE WHEN processed = true THEN 1 END) as processed,
  COUNT(CASE WHEN processed = false THEN 1 END) as pending,
  COUNT(CASE WHEN "errorMessage" IS NOT NULL THEN 1 END) as errors
FROM "AttendanceLog"
WHERE "createdAt" >= NOW() - INTERVAL '24 hours';
```

---

## Security Best Practices

### 1. Webhook Security

Add webhook secret to environment:
```bash
HIKVISION_WEBHOOK_SECRET=your-random-secret-key
```

Device must send Authorization header:
```
Authorization: Bearer your-random-secret-key
```

### 2. Cron Security

Add cron secret to environment:
```bash
CRON_SECRET=your-random-secret-key
```

Vercel automatically adds Authorization header for cron jobs.

### 3. Device Security

- Change default admin password
- Use strong password (minimum 12 characters)
- Disable unused device features
- Keep device firmware updated
- Restrict web interface access to local network only

### 4. Database Security

- Never expose database credentials
- Use environment variables for all secrets
- Enable SSL for database connections
- Regular backups (Supabase handles this automatically)

---

## Maintenance

### Daily

- ✅ Automatic backup sync at 10:00 AM & 6:00 PM
- ✅ Birthday emails at 1:00 AM
- ✅ Supabase database activity (prevents pausing)

### Weekly

- Review error logs in Vercel dashboard
- Check unprocessed attendance logs
- Verify backup sync is catching events

### Monthly

- Review device firmware updates
- Check Cloudflare Tunnel status (if using)
- Verify all employee mappings are current
- Clean up old AttendanceLog entries (optional):
  ```sql
  DELETE FROM "AttendanceLog"
  WHERE processed = true
  AND "createdAt" < NOW() - INTERVAL '90 days';
  ```

---

## Production Checklist

Before going live, verify:

- [ ] Device has static IP configured
- [ ] Device accessible via web browser
- [ ] Device added to database with correct credentials
- [ ] All employees enrolled on device with fingerprints
- [ ] All BiometricMapping records created
- [ ] Webhook URL configured on device
- [ ] Cloudflare Tunnel running (if using)
- [ ] Test fingerprint scan creates instant AttendanceLog
- [ ] Test fingerprint scan creates Attendance record
- [ ] Backup sync cron job configured (10 AM & 6 PM)
- [ ] Environment variables set in Vercel
- [ ] Test manual sync works
- [ ] Review Vercel logs for any errors

---

## Support Resources

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/attendance/webhook` | POST | Receives real-time events from device |
| `/api/attendance/sync` | GET | View sync status and stats |
| `/api/attendance/sync` | POST | Manually trigger sync |
| `/api/cron/attendance-sync` | GET | Backup sync cron job |
| `/api/attendance/device/configure` | GET | View device configuration |
| `/api/attendance/device/configure` | POST | Configure device webhook |

### Log Files

- **Vercel Logs**: Dashboard → Your Project → Logs
- **Device Logs**: Web Interface → Maintenance → System Log

### Documentation

- Hikvision ISAPI Documentation: [Hikvision Developer Portal](https://www.hikvision.com/en/support/download/sdk/)
- Cloudflare Tunnel: [Cloudflare Docs](https://developers.cloudflare.com/cloudflare-one/)
- Vercel Cron: [Vercel Docs](https://vercel.com/docs/cron-jobs)

---

## Deployment Steps

### 1. Deploy to Vercel

```bash
# Commit all changes
git add .
git commit -m "Setup attendance system with webhooks and backup sync"
git push

# Vercel will auto-deploy
```

### 2. Set Environment Variables

Via Vercel Dashboard:
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`
- `HIKVISION_WEBHOOK_SECRET` (optional)

### 3. Run Database Migrations

```bash
# If you haven't already
npx prisma migrate deploy
```

### 4. Configure Device

```bash
curl -X POST https://your-app.vercel.app/api/attendance/device/configure
```

### 5. Test End-to-End

1. Scan fingerprint
2. Check logs
3. Verify database

---

**System Status:** ✅ Production Ready

All features implemented and tested. The system uses real-time webhooks for instant updates with automated backup sync as a safety net.
