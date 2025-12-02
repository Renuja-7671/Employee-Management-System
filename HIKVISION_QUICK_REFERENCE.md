# Hikvision Integration - Quick Reference

## Common Operations

### Device Management

```bash
# List all devices
GET /api/biometric/devices

# Add new device
POST /api/biometric/devices
{
  "name": "Main Office",
  "ipAddress": "192.168.1.64",
  "port": 80,
  "username": "admin",
  "password": "password"
}

# Update device
PUT /api/biometric/devices
{
  "id": "device-uuid",
  "isActive": true
}

# Delete device
DELETE /api/biometric/devices?id=device-uuid
```

### Employee Mapping

```bash
# Auto-sync all employees
POST /api/biometric/sync-employees

# Get all mappings
GET /api/biometric/mappings

# Get mapping for specific employee
GET /api/biometric/mappings?employeeId=user-uuid

# Create manual mapping
POST /api/biometric/mappings
{
  "employeeId": "user-uuid",
  "deviceEmployeeNo": "EMP001",
  "fingerprintEnrolled": true
}

# Update mapping
PUT /api/biometric/mappings
{
  "id": "mapping-uuid",
  "fingerprintEnrolled": true
}

# Delete mapping
DELETE /api/biometric/mappings?id=mapping-uuid
```

### Attendance Sync

```bash
# Manual sync (all new records)
POST /api/attendance/sync

# Sync specific date range
POST /api/attendance/sync
{
  "startDate": "2025-12-01T00:00:00Z",
  "endDate": "2025-12-01T23:59:59Z"
}

# Get sync status
GET /api/attendance/sync

# Webhook endpoint (for device)
POST /api/attendance/webhook
# (Device sends data automatically)
```

### Cron Jobs

```bash
# Manual cron trigger
GET /api/cron/attendance-sync
Authorization: Bearer your-cron-secret

# Automatic schedule (in vercel.json)
# Runs every 15 minutes: */15 * * * *
```

## Device Configuration

### Network Settings (On Device)

1. Access: `http://192.168.1.64`
2. Login: `admin` / `password`
3. Go to: **Configuration > Network > TCP/IP**
4. Set static IP: `192.168.1.64`
5. Save

### Webhook Setup (On Device)

1. Go to: **Event > Smart Event > Access Control**
2. Enable: **Event Notification**
3. Set Method: **HTTP**
4. URL: `https://your-domain.com/api/attendance/webhook`
5. Save

## Employee Enrollment

### On Device (IVMS-4200 or Web Interface)

1. **Add User:**
   - Go to: User > User Management > Add
   - Enter Employee No: `EMP001`
   - Enter Name: `John Doe`

2. **Enroll Fingerprint:**
   - Select user
   - Click "Add" under Fingerprint
   - Scan finger 3 times

3. **Sync to System:**
   ```bash
   POST /api/biometric/sync-employees
   ```

### Via API (Create Mapping Only)

```bash
POST /api/biometric/mappings
{
  "employeeId": "user-uuid-from-your-system",
  "deviceEmployeeNo": "EMP001"
}
```

## Troubleshooting Commands

### Test Device Connection

```bash
# Ping device
ping 192.168.1.64

# Test HTTP
curl http://192.168.1.64

# Test API with auth
curl http://192.168.1.64/ISAPI/System/deviceInfo \
  -u admin:password
```

### Check System Status

```bash
# Check sync logs
GET /api/attendance/sync

# Response shows:
{
  "stats": {
    "totalLogs": 100,
    "processedLogs": 95,
    "failedLogs": 5
  },
  "recentLogs": [...]
}
```

### Debug Failed Records

```bash
# Query database directly
npx prisma studio

# Check AttendanceLog table
# Look for records with processed=false

# Check error messages
SELECT * FROM "AttendanceLog"
WHERE processed = false
AND "errorMessage" IS NOT NULL;
```

### Re-process Failed Logs

Failed logs are NOT automatically retried. Options:

1. **Fix mapping and re-sync:**
   ```bash
   # Create missing mapping
   POST /api/biometric/mappings

   # Re-sync from device
   POST /api/attendance/sync
   {
     "startDate": "2025-12-01T00:00:00Z"
   }
   ```

2. **Manual database update:**
   ```sql
   -- After creating mapping, mark as unprocessed
   UPDATE "AttendanceLog"
   SET processed = false, "errorMessage" = NULL
   WHERE id = 'log-id';

   -- Then trigger sync
   ```

## Common Issues & Fixes

### Issue: "Employee mapping not found"

```bash
# Check if employee exists
GET /api/biometric/mappings?employeeId=user-uuid

# If not found, create mapping
POST /api/biometric/mappings
{
  "employeeId": "user-uuid",
  "deviceEmployeeNo": "EMP001"
}
```

### Issue: "Device not responding"

```bash
# 1. Check device is online
ping 192.168.1.64

# 2. Check device web interface
curl -I http://192.168.1.64

# 3. Verify credentials
curl http://192.168.1.64/ISAPI/System/deviceInfo \
  -u admin:password

# 4. Update device in system
PUT /api/biometric/devices
{
  "id": "device-uuid",
  "password": "new-password"
}
```

### Issue: "Webhook not receiving data"

```bash
# 1. Test webhook endpoint is accessible
GET https://your-domain.com/api/attendance/webhook

# 2. Check device can reach server
# (from device network)
curl https://your-domain.com/api/attendance/webhook

# 3. Verify webhook URL in device settings
# Device > Event > HTTP Settings

# 4. Check server logs for incoming requests
```

### Issue: "Duplicate attendance records"

System prevents duplicates automatically:
- Database constraint: `@@unique([employeeId, date])`
- One record per employee per day
- Updates existing record instead of creating new

If duplicates exist:
```sql
-- Find duplicates
SELECT "employeeId", date, COUNT(*)
FROM "Attendance"
GROUP BY "employeeId", date
HAVING COUNT(*) > 1;

-- Keep latest, delete older
DELETE FROM "Attendance" a1
USING "Attendance" a2
WHERE a1."employeeId" = a2."employeeId"
  AND a1.date = a2.date
  AND a1."createdAt" < a2."createdAt";
```

## Monitoring

### Daily Checks

```bash
# 1. Sync status
GET /api/attendance/sync

# 2. Failed logs count
SELECT COUNT(*) FROM "AttendanceLog"
WHERE processed = false;

# 3. Today's attendance
SELECT COUNT(*) FROM "Attendance"
WHERE date = CURRENT_DATE;
```

### Weekly Checks

```bash
# 1. Device last sync
GET /api/biometric/devices
# Check "lastSyncAt" timestamp

# 2. Unmapped employees
SELECT * FROM "AttendanceLog"
WHERE "employeeId" IS NULL;

# 3. Sync success rate
SELECT
  COUNT(*) FILTER (WHERE processed = true) * 100.0 / COUNT(*)
FROM "AttendanceLog";
```

## Environment Variables

```env
# Device Connection
HIKVISION_HOST=192.168.1.64
HIKVISION_PORT=80
HIKVISION_USERNAME=admin
HIKVISION_PASSWORD=your-password
HIKVISION_PROTOCOL=http

# Security
HIKVISION_WEBHOOK_SECRET=webhook-secret
CRON_SECRET=cron-secret
```

## Database Schema Quick Reference

```
BiometricDevice
├─ id, name, deviceType
├─ ipAddress, port, username, password
├─ serialNumber, model, firmwareVersion
├─ isActive, lastSyncAt
└─ createdAt, updatedAt

BiometricMapping
├─ id, employeeId (FK -> User)
├─ deviceEmployeeNo (device's employee ID)
├─ cardNo, fingerprintEnrolled, faceEnrolled
└─ syncedAt, createdAt, updatedAt

AttendanceLog (Raw events from device)
├─ id, deviceEmployeeNo, employeeId
├─ timestamp, verifyMode, inOutType
├─ deviceId, deviceName
├─ processed, processedAt, errorMessage
└─ createdAt

Attendance (Processed attendance records)
├─ id, employeeId, date
├─ checkIn, checkOut
├─ status, workHours, isWeekend
├─ deviceId, verifyMode, source
└─ createdAt, updatedAt
```

## Verify Mode Values

- `0` - Card/RFID
- `1` - Fingerprint
- `2` - Face Recognition
- `3` - Password

## In/Out Type Values

- `0` - Check In
- `1` - Check Out
- `2` - Break Out
- `3` - Break In

## Attendance Status Values

- `PRESENT` - Normal attendance
- `ABSENT` - No check-in recorded
- `LATE` - Checked in after 8:30 AM
- `HALF_DAY` - Less than 4 hours
- `LEAVE` - On approved leave
- `HOLIDAY` - Public holiday

## Attendance Source Values

- `MANUAL` - Manually entered by admin
- `BIOMETRIC` - From fingerprint device
- `MOBILE` - From mobile app (future)
- `WEB` - From web interface (future)
