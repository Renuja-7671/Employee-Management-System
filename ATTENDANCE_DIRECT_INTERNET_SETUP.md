# Hikvision Attendance System - Direct Internet Setup Guide

## Your Network Setup

Your Hikvision fingerprint terminal is connected to a LAN network with:
- ✅ SLT Fiber internet router providing internet access
- ✅ Multiple desktop computers on the same network
- ✅ Hikvision DS-K1A8503EF-B terminal on the network

This setup allows **direct webhook communication** without needing Cloudflare Tunnel or any computer running 24/7!

---

## How It Works

```
Fingerprint Scanned
        ↓
Hikvision Device (192.168.1.x)
        ↓
Company LAN
        ↓
SLT Fiber Router
        ↓
Internet
        ↓
Vercel Application
        ↓
Database Updated (Real-time!)
```

**Result:** Instant attendance updates when employees scan their fingerprints!

---

## Setup Steps

### Step 1: Deploy to Vercel

```bash
git add .
git commit -m "Configure attendance system with direct webhooks"
git push
```

Vercel will automatically deploy. Note your deployment URL (e.g., `https://employee-management-system-mu-beryl.vercel.app`)

### Step 2: Add Environment Variables in Vercel

Go to **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

Add:
```bash
NEXT_PUBLIC_APP_URL=https://employee-management-system-mu-beryl.vercel.app
```

Replace `your-app.vercel.app` with your actual Vercel URL.

**Redeploy** after adding the variable.

### Step 3: Configure Device in Database

Add your Hikvision device via SQL:

```sql
INSERT INTO "BiometricDevice" (
  id, name, "deviceType", "ipAddress", port,
  username, password, "isActive", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'Main Entrance Fingerprint Terminal',
  'HIKVISION',
  '192.168.1.64',  -- Your device IP from .env
  80,
  'admin',
  'Uniquein@2',    -- Your device password from .env
  true,
  NOW(),
  NOW()
);
```

### Step 4: Test Network Connectivity

From any computer on your company network:

```bash
# Test if your network can reach Vercel
curl https://employee-management-system-mu-beryl.vercel.app/api/attendance/webhook
```

**Expected response:**
```json
{
  "message": "Hikvision Attendance Webhook Endpoint",
  "status": "active"
}
```

If you get this response, **your network can reach the webhook!** ✅

### Step 5: Configure Webhook on Device

**Method 1: Automatic (Recommended)**

From any computer on your network:

```bash
curl -X POST https://your-app.vercel.app/api/attendance/device/configure \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Device webhook configured successfully",
  "webhookUrl": "https://your-app.vercel.app/api/attendance/webhook",
  "deviceInfo": {
    "name": "Main Entrance Fingerprint Terminal",
    "ipAddress": "192.168.1.64"
  }
}
```

**Method 2: Manual via Device Web Interface**

1. Open browser and go to: `http://192.168.1.200`
2. Login with:
   - Username: `admin`
   - Password: `Uniquein@2`
3. Navigate to: **Configuration** → **Event** → **Basic Event**
4. Under **Access Control Event**, enable:
   - ☑ **Access Control Event**
   - ☑ **Enable Event Notification**
5. Configure **HTTP Listening**:
   - **Protocol Type**: `HTTPS`
   - **URL**: `https://employee-management-system-mu-beryl.vercel.app/api/attendance/webhook`
   - **Method**: `POST`
   - **Authentication**: `none`
6. Click **Save**

### Step 6: Create Employee Mappings

For each employee who will use the fingerprint system:

```sql
-- First, get user IDs
SELECT id, "firstName", "lastName", email FROM "User";

-- Create mapping for each employee
INSERT INTO "BiometricMapping" (
  id, "employeeId", "deviceEmployeeNo",
  "fingerprintEnrolled", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'user-id-from-query',  -- Replace with actual user ID
  'EMP001',              -- Must match device employee number
  true,
  NOW(),
  NOW()
);
```

### Step 7: Enroll Fingerprints

**Using IVMS 4200 Software:**
1. Open IVMS 4200
2. Go to **Person Management**
3. Add person with Employee No (e.g., `EMP001`)
4. Click **Enroll Fingerprint**
5. Scan finger 3 times
6. Sync to device

**Using Device Keypad:**
1. Press **Menu** → **User Management** → **Add User**
2. Enter Employee No: `EMP001`
3. Enter name
4. Select **Fingerprint** → Place finger 3 times
5. Save

---

## Testing Real-time Webhooks

### Test 1: Scan Fingerprint

1. Have an enrolled employee scan their finger
2. Check Vercel logs immediately (Dashboard → Logs)

**Expected log output:**
```
[Webhook] Received attendance event: { deviceEmployeeNo: 'EMP001', ... }
[Webhook] Processed successfully
```

### Test 2: Check Database

```sql
-- Check today's attendance
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

**Expected:** New record with `source = 'BIOMETRIC'`

---

## System Architecture

### Primary Method: Real-time Webhooks ⚡
- **When:** Instant (when fingerprint is scanned)
- **How:** Device → Internet → Vercel → Database
- **Delay:** < 1 second
- **Status:** Active after Step 5

### Backup Method: Cron Job Sync 🔄
- **When:** Daily at 6:30 PM (Sri Lanka Time)
- **How:** Vercel → Internet → Device → Database
- **Purpose:** Safety net for any missed webhook events
- **Status:** Already configured in `vercel.json`

---

## Troubleshooting

### Issue: Webhook test fails (Step 4)

**Symptoms:**
```bash
curl: (6) Could not resolve host
# OR
curl: (7) Failed to connect
```

**Solutions:**
1. Check internet connection on company network
2. Verify Vercel deployment is live
3. Check if firewall blocks outbound HTTPS (port 443)
4. Contact IT to allow HTTPS traffic to Vercel

### Issue: Device can't send webhooks

**Check:**
1. Device has internet access:
   ```bash
   # From device web interface
   Configuration → Network → Test
   ```
2. Webhook URL is correct in device settings
3. Device firmware is up to date
4. Firewall allows device outbound HTTPS

**Debug:**
```bash
# Check device event logs
# Login to http://192.168.1.64
# Go to: Maintenance → System Log → Event
```

### Issue: Events not appearing in database

**Check:**
1. **Vercel logs** for webhook calls:
   - Dashboard → Logs → Filter by `[Webhook]`
2. **Employee mapping exists**:
   ```sql
   SELECT * FROM "BiometricMapping" WHERE "deviceEmployeeNo" = 'EMP001';
   ```
3. **Device employee number matches**:
   - Check device: Menu → User Management → User Info

**Common causes:**
- Employee mapping not created
- Device employee number mismatch
- Webhook not configured on device

---

## Network Requirements

✅ **What you need (you already have these):**
- Internet connection via router
- Device connected to LAN
- Outbound HTTPS allowed (port 443)

❌ **What you DON'T need:**
- Public static IP
- Port forwarding
- Computer running 24/7
- VPN or tunnel service
- Complex firewall rules

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/attendance/webhook` | POST | Receives real-time device events |
| `/api/attendance/webhook` | GET | Test webhook endpoint |
| `/api/attendance/sync` | GET | View sync status |
| `/api/cron/attendance-sync` | GET | Backup sync (runs daily) |
| `/api/attendance/device/configure` | GET | View device config |
| `/api/attendance/device/configure` | POST | Auto-configure device webhook |

---

## Monitoring

### Check Recent Events

```sql
-- Last 10 attendance logs
SELECT
  al."deviceEmployeeNo",
  al.timestamp,
  al.processed,
  al."errorMessage"
FROM "AttendanceLog" al
ORDER BY al.timestamp DESC
LIMIT 10;
```

### Check Today's Attendance

```sql
SELECT
  u."firstName",
  u."lastName",
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

### Vercel Logs

1. Go to **Vercel Dashboard** → **Your Project** → **Logs**
2. Filter by:
   - `[Webhook]` - Real-time webhook events
   - `[BACKUP SYNC]` - Daily backup sync

---

## Security Considerations

### Optional: Secure Webhook Endpoint

If you want to add authentication to the webhook:

1. Generate a secret key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Add to Vercel environment variables:
   ```
   HIKVISION_WEBHOOK_SECRET=your-generated-secret
   ```

3. Update device configuration to send secret in headers

---

## Advantages of Your Setup

✅ **Simple** - No tunnel or complex network configuration
✅ **Free** - No additional services needed
✅ **Fast** - Direct connection, minimal latency
✅ **Reliable** - SLT fiber provides stable connection
✅ **Scalable** - Can add more devices easily
✅ **Maintainable** - No services to monitor or restart

---

## Next Steps

1. ✅ Deploy to Vercel (Step 1)
2. ✅ Add environment variables (Step 2)
3. ✅ Add device to database (Step 3)
4. ✅ Test network connectivity (Step 4)
5. ✅ Configure webhook on device (Step 5)
6. ✅ Create employee mappings (Step 6)
7. ✅ Enroll fingerprints (Step 7)
8. ✅ Test with real fingerprint scan

---

## Support

**Quick Test Commands:**

```bash
# Test webhook endpoint
curl https://your-app.vercel.app/api/attendance/webhook

# Test sync status
curl https://your-app.vercel.app/api/attendance/sync

# Configure device webhook
curl -X POST https://your-app.vercel.app/api/attendance/device/configure \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Other Documentation:**
- [ATTENDANCE_QUICK_START.md](./ATTENDANCE_QUICK_START.md) - Quick overview
- [ATTENDANCE_SETUP_PRODUCTION.md](./ATTENDANCE_SETUP_PRODUCTION.md) - Full production guide
- [CLOUDFLARE_TUNNEL_SETUP.md](./CLOUDFLARE_TUNNEL_SETUP.md) - Alternative tunnel method

---

## Summary

Your setup is **ideal for direct webhook integration**:

✅ **Real-time attendance** - Instant updates when fingerprint scanned
✅ **Simple setup** - No tunnel or complex configuration
✅ **Reliable** - SLT fiber provides stable connection
✅ **Free** - No additional costs
✅ **Backup sync** - Daily cron job as safety net

The Hikvision device will send webhooks directly to your Vercel app through your existing internet connection!
