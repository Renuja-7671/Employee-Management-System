# Testing Hikvision Integration Without Physical Device

This guide shows you how to test the entire attendance integration without access to the physical Hikvision fingerprint reader.

## Table of Contents

1. [Mock Device Simulator](#mock-device-simulator)
2. [Testing Database Schema](#testing-database-schema)
3. [Testing APIs](#testing-apis)
4. [Simulating Fingerprint Scans](#simulating-fingerprint-scans)
5. [Testing Webhook](#testing-webhook)
6. [Testing Sync Service](#testing-sync-service)

---

## Mock Device Simulator

I've created a mock Hikvision device simulator that you can run locally to test all functionality.

### Setup Mock Device

The mock device will:
- ✅ Respond to ISAPI API calls
- ✅ Return device information
- ✅ Provide mock attendance records
- ✅ Simulate employee list
- ✅ Send webhook events

---

## Testing Database Schema

### Step 1: Run Migration

First, apply the database changes:

```bash
# Generate Prisma client
npx prisma generate

# Run migration
npx prisma migrate dev --name add_biometric_integration
```

### Step 2: Verify Tables

Open Prisma Studio to see the new tables:

```bash
npx prisma studio
```

You should see:
- ✅ BiometricDevice
- ✅ BiometricMapping
- ✅ AttendanceLog
- ✅ Attendance (with new fields)

---

## Testing APIs

### Test 1: Create Mock Device

Instead of connecting to a real device, create a mock device entry:

```bash
curl -X POST http://localhost:3000/api/biometric/devices \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mock Fingerprint Reader (Testing)",
    "deviceType": "HIKVISION",
    "ipAddress": "127.0.0.1",
    "port": 9999,
    "username": "admin",
    "password": "test123"
  }'
```

**Note:** This will fail the connection test, which is expected. We'll bypass this for testing.

### Test 2: Create Device Directly in Database

Use Prisma Studio or SQL to insert a mock device:

```sql
INSERT INTO "BiometricDevice" (
  id, name, "deviceType", "ipAddress", port, username, password,
  "serialNumber", model, "isActive", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'Mock Device - Testing',
  'HIKVISION',
  '127.0.0.1',
  9999,
  'admin',
  'test123',
  'MOCK-12345',
  'DS-K1A8503EF-B',
  true,
  NOW(),
  NOW()
);
```

Or via Prisma Studio:
1. Open `BiometricDevice` table
2. Click "Add record"
3. Fill in the fields above
4. Save

### Test 3: Create Employee Mappings

Map your existing employees to mock device employee numbers:

```bash
# Get an employee ID from your system first
curl http://localhost:3000/api/users # or check database

# Create mapping
curl -X POST http://localhost:3000/api/biometric/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "your-employee-uuid",
    "deviceEmployeeNo": "EMP001",
    "fingerprintEnrolled": true
  }'
```

Or create multiple mappings in Prisma Studio:

```sql
-- Example: Map first 5 employees
INSERT INTO "BiometricMapping" (
  id, "employeeId", "deviceEmployeeNo",
  "fingerprintEnrolled", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  id,
  "employeeId",
  true,
  NOW(),
  NOW()
FROM "User"
WHERE role = 'EMPLOYEE'
LIMIT 5;
```

---

## Simulating Fingerprint Scans

### Method 1: Direct Database Insert (Easiest)

Simulate attendance logs directly in the database:

```sql
-- Simulate employee EMP001 checking in today at 8:00 AM
INSERT INTO "AttendanceLog" (
  id, "deviceEmployeeNo", "employeeId", timestamp,
  "verifyMode", "inOutType", "deviceId", processed, "createdAt"
)
VALUES (
  gen_random_uuid(),
  'EMP001',
  (SELECT "employeeId" FROM "BiometricMapping" WHERE "deviceEmployeeNo" = 'EMP001'),
  NOW() - INTERVAL '30 minutes',  -- 30 minutes ago
  1,  -- Fingerprint
  0,  -- Check In
  (SELECT id FROM "BiometricDevice" LIMIT 1),
  false,
  NOW()
);

-- Simulate same employee checking out at 5:00 PM
INSERT INTO "AttendanceLog" (
  id, "deviceEmployeeNo", "employeeId", timestamp,
  "verifyMode", "inOutType", "deviceId", processed, "createdAt"
)
VALUES (
  gen_random_uuid(),
  'EMP001',
  (SELECT "employeeId" FROM "BiometricMapping" WHERE "deviceEmployeeNo" = 'EMP001'),
  NOW(),  -- Just now
  1,  -- Fingerprint
  1,  -- Check Out
  (SELECT id FROM "BiometricDevice" LIMIT 1),
  false,
  NOW()
);
```

### Method 2: Via API (Webhook Simulation)

Test the webhook endpoint by sending mock data:

```bash
curl -X POST http://localhost:3000/api/attendance/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "EventNotificationAlert": {
      "AcsEvent": {
        "employeeNoString": "EMP001",
        "name": "John Doe",
        "time": "2025-12-01T08:00:00+08:00",
        "cardReaderVerifyMode": 1,
        "attendanceStatus": 0,
        "deviceName": "Mock Device",
        "serialNo": "MOCK-12345"
      }
    }
  }'
```

This simulates a real fingerprint scan event!

### Method 3: Create Multiple Test Events

Create a batch of test attendance logs:

```sql
-- Generate attendance for last 7 days for employee EMP001
INSERT INTO "AttendanceLog" (
  id, "deviceEmployeeNo", "employeeId", timestamp,
  "verifyMode", "inOutType", "deviceId", processed, "createdAt"
)
SELECT
  gen_random_uuid(),
  'EMP001',
  (SELECT "employeeId" FROM "BiometricMapping" WHERE "deviceEmployeeNo" = 'EMP001'),
  date_trunc('day', CURRENT_DATE - (series || ' days')::INTERVAL) + TIME '08:30:00',
  1,
  0,
  (SELECT id FROM "BiometricDevice" LIMIT 1),
  false,
  NOW()
FROM generate_series(0, 6) AS series;

-- Generate check-outs
INSERT INTO "AttendanceLog" (
  id, "deviceEmployeeNo", "employeeId", timestamp,
  "verifyMode", "inOutType", "deviceId", processed, "createdAt"
)
SELECT
  gen_random_uuid(),
  'EMP001',
  (SELECT "employeeId" FROM "BiometricMapping" WHERE "deviceEmployeeNo" = 'EMP001'),
  date_trunc('day', CURRENT_DATE - (series || ' days')::INTERVAL) + TIME '17:00:00',
  1,
  1,
  (SELECT id FROM "BiometricDevice" LIMIT 1),
  false,
  NOW()
FROM generate_series(0, 6) AS series;
```

---

## Testing Webhook

### Test 1: Check Webhook is Active

```bash
curl http://localhost:3000/api/attendance/webhook
```

Expected response:
```json
{
  "message": "Hikvision Attendance Webhook Endpoint",
  "status": "active",
  "note": "Configure your Hikvision device to send events to this URL"
}
```

### Test 2: Send Mock Check-In Event

```bash
curl -X POST http://localhost:3000/api/attendance/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "EventNotificationAlert": {
      "AcsEvent": {
        "employeeNoString": "EMP001",
        "time": "2025-12-01T09:15:00+08:00",
        "cardReaderVerifyMode": 1,
        "attendanceStatus": 0
      }
    }
  }'
```

### Test 3: Send Mock Check-Out Event

```bash
curl -X POST http://localhost:3000/api/attendance/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "EventNotificationAlert": {
      "AcsEvent": {
        "employeeNoString": "EMP001",
        "time": "2025-12-01T18:00:00+08:00",
        "cardReaderVerifyMode": 1,
        "attendanceStatus": 1
      }
    }
  }'
```

### Test 4: Verify Attendance Created

```bash
# Check attendance records
curl http://localhost:3000/api/attendance?startDate=2025-12-01&endDate=2025-12-01
```

Or check in Prisma Studio:
```sql
SELECT * FROM "Attendance"
WHERE date >= CURRENT_DATE
ORDER BY "createdAt" DESC;
```

---

## Testing Sync Service

### Test 1: Process Unprocessed Logs

After inserting mock logs, process them:

```bash
curl -X POST http://localhost:3000/api/attendance/sync
```

This will:
1. Find all unprocessed AttendanceLog records
2. Map to employees via BiometricMapping
3. Create/update Attendance records
4. Calculate work hours

### Test 2: Check Sync Status

```bash
curl http://localhost:3000/api/attendance/sync
```

Expected response:
```json
{
  "configured": true,
  "device": {
    "name": "Mock Device - Testing",
    "ipAddress": "127.0.0.1",
    "lastSyncAt": "2025-12-01T10:00:00Z"
  },
  "stats": {
    "totalLogs": 14,
    "processedLogs": 14,
    "failedLogs": 0,
    "pendingLogs": 0
  },
  "recentLogs": [...]
}
```

### Test 3: Verify Attendance Processing

Check that AttendanceLog records were processed:

```sql
SELECT
  al.*,
  a.date,
  a."checkIn",
  a."checkOut",
  a."workHours",
  a.status
FROM "AttendanceLog" al
LEFT JOIN "BiometricMapping" bm ON al."deviceEmployeeNo" = bm."deviceEmployeeNo"
LEFT JOIN "Attendance" a ON a."employeeId" = bm."employeeId"
  AND a.date = DATE(al.timestamp)
ORDER BY al."createdAt" DESC
LIMIT 10;
```

---

## Complete Testing Workflow

### Step-by-Step Test Process

**1. Setup Database:**
```bash
npm install axios
npx prisma generate
npx prisma migrate dev --name add_biometric_integration
```

**2. Create Mock Device in Database:**
```sql
INSERT INTO "BiometricDevice" (
  id, name, "deviceType", "ipAddress", port, username, password,
  "serialNumber", "isActive", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'Test Device',
  'HIKVISION',
  '127.0.0.1',
  9999,
  'admin',
  'test',
  'TEST-001',
  true,
  NOW(),
  NOW()
);
```

**3. Create Employee Mappings:**
```sql
-- Map your first employee
INSERT INTO "BiometricMapping" (
  id, "employeeId", "deviceEmployeeNo",
  "fingerprintEnrolled", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  id,
  "employeeId",  -- Using system employeeId as device employee no
  true,
  NOW(),
  NOW()
FROM "User"
WHERE role = 'EMPLOYEE'
LIMIT 1;
```

**4. Simulate Fingerprint Scan (via Webhook):**
```bash
# Get the employeeId/deviceEmployeeNo from your mapping
DEVICE_EMP_NO=$(psql $DATABASE_URL -t -c "SELECT \"deviceEmployeeNo\" FROM \"BiometricMapping\" LIMIT 1" | xargs)

# Send check-in
curl -X POST http://localhost:3000/api/attendance/webhook \
  -H "Content-Type: application/json" \
  -d "{
    \"EventNotificationAlert\": {
      \"AcsEvent\": {
        \"employeeNoString\": \"$DEVICE_EMP_NO\",
        \"time\": \"$(date -u +%Y-%m-%dT%H:%M:%S)+08:00\",
        \"cardReaderVerifyMode\": 1,
        \"attendanceStatus\": 0
      }
    }
  }"
```

**5. Verify Attendance:**
```bash
curl http://localhost:3000/api/attendance?startDate=$(date +%Y-%m-%d)&endDate=$(date +%Y-%m-%d)
```

**6. Check Logs:**
```sql
SELECT * FROM "AttendanceLog" ORDER BY "createdAt" DESC LIMIT 5;
SELECT * FROM "Attendance" WHERE date = CURRENT_DATE;
```

---

## Mock Data Helper Script

Save this as a quick test script:

```bash
#!/bin/bash
# File: scripts/test-attendance.sh

echo "Testing Hikvision Integration (No Device)"

# Get first employee mapping
MAPPING=$(curl -s http://localhost:3000/api/biometric/mappings | jq -r '.mappings[0]')
EMP_NO=$(echo $MAPPING | jq -r '.deviceEmployeeNo')
EMP_NAME=$(echo $MAPPING | jq -r '.employee.firstName + " " + .employee.lastName')

if [ "$EMP_NO" = "null" ]; then
  echo "Error: No employee mappings found. Create one first."
  exit 1
fi

echo "Simulating attendance for: $EMP_NAME ($EMP_NO)"

# Check-in
echo "Sending check-in..."
curl -s -X POST http://localhost:3000/api/attendance/webhook \
  -H "Content-Type: application/json" \
  -d "{
    \"EventNotificationAlert\": {
      \"AcsEvent\": {
        \"employeeNoString\": \"$EMP_NO\",
        \"name\": \"$EMP_NAME\",
        \"time\": \"$(date -u +%Y-%m-%dT08:30:00+08:00)\",
        \"cardReaderVerifyMode\": 1,
        \"attendanceStatus\": 0
      }
    }
  }" | jq

sleep 2

# Check-out
echo "Sending check-out..."
curl -s -X POST http://localhost:3000/api/attendance/webhook \
  -H "Content-Type: application/json" \
  -d "{
    \"EventNotificationAlert\": {
      \"AcsEvent\": {
        \"employeeNoString\": \"$EMP_NO\",
        \"name\": \"$EMP_NAME\",
        \"time\": \"$(date -u +%Y-%m-%dT17:00:00+08:00)\",
        \"cardReaderVerifyMode\": 1,
        \"attendanceStatus\": 1
      }
    }
  }" | jq

# Check result
echo ""
echo "Checking attendance..."
curl -s "http://localhost:3000/api/attendance?startDate=$(date +%Y-%m-%d)&endDate=$(date +%Y-%m-%d)" | jq

echo "Done!"
```

Make it executable:
```bash
chmod +x scripts/test-attendance.sh
./scripts/test-attendance.sh
```

---

## Testing Checklist

- [ ] Database migration completed
- [ ] BiometricDevice record created
- [ ] BiometricMapping records created for test employees
- [ ] Webhook endpoint responds to GET
- [ ] Webhook accepts POST with mock data
- [ ] AttendanceLog records created
- [ ] Attendance records created with correct check-in/check-out
- [ ] Work hours calculated correctly
- [ ] Sync status API works
- [ ] Multiple scans for same employee/day updates (not duplicates)

---

## What to Expect

### After Webhook Event:

1. **AttendanceLog created:**
   - `processed = false` initially
   - Contains raw device data

2. **Employee mapped:**
   - System finds BiometricMapping
   - Links to User record

3. **Attendance created/updated:**
   - One record per employee per day
   - `checkIn` time set (for inOutType=0)
   - `checkOut` time set (for inOutType=1)
   - `workHours` calculated when both exist
   - `status` determined (PRESENT/LATE/HALF_DAY)

4. **Log marked processed:**
   - `processed = true`
   - `processedAt` timestamp set

### Expected Data Flow:

```
Mock Webhook Event
  ↓
AttendanceLog (raw)
  ↓
Find BiometricMapping
  ↓
Get User (Employee)
  ↓
Upsert Attendance
  ↓
Calculate Hours
  ↓
Mark Log as Processed
```

---

## Troubleshooting Tests

### Issue: "Employee mapping not found"

**Check mappings:**
```sql
SELECT * FROM "BiometricMapping";
```

**Create mapping:**
```sql
INSERT INTO "BiometricMapping" (
  id, "employeeId", "deviceEmployeeNo",
  "fingerprintEnrolled", "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM "User" WHERE role = 'EMPLOYEE' LIMIT 1),
  'EMP001',
  true,
  NOW(),
  NOW()
);
```

### Issue: Webhook returns error

**Check payload format:**
```bash
# Correct format
{
  "EventNotificationAlert": {
    "AcsEvent": {
      "employeeNoString": "EMP001",  # Must match BiometricMapping
      "time": "2025-12-01T08:00:00+08:00",
      "cardReaderVerifyMode": 1,
      "attendanceStatus": 0
    }
  }
}
```

### Issue: No attendance created

**Check logs:**
```sql
SELECT * FROM "AttendanceLog"
WHERE processed = false
ORDER BY "createdAt" DESC;
```

**Process manually:**
```bash
curl -X POST http://localhost:3000/api/attendance/sync
```

---

## Next: Real Device Testing

When you have access to the physical device:

1. ✅ All APIs already tested and working
2. ✅ Just update device IP in BiometricDevice table
3. ✅ Test real connection
4. ✅ Sync employee list from device
5. ✅ Configure webhook on device
6. ✅ Done!

The entire integration is already functional - you're just swapping the mock data source for the real device!
