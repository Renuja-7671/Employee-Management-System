# Testing Hikvision Integration Without Physical Device

## Quick Start

### 1. Install Dependencies

```bash
npm install axios
```

### 2. Run Database Migration

```bash
npx prisma generate
npx prisma migrate dev --name add_biometric_integration
```

### 3. Start Mock Device Server

In one terminal, start the mock Hikvision device:

```bash
node scripts/mock-hikvision-device.js
```

You should see:
```
====================================
Mock Hikvision Device Server
====================================

Server running at: http://localhost:8064
Username: admin
Password: admin123

Mock data: 5 employees, 30 attendance records
====================================
```

**Keep this terminal open!**

### 4. Update Environment Variables

Add to your `.env` file:

```env
# For testing with mock device
HIKVISION_HOST=localhost
HIKVISION_PORT=8064
HIKVISION_USERNAME=admin
HIKVISION_PASSWORD=admin123
HIKVISION_PROTOCOL=http
```

### 5. Start Your Application

In another terminal:

```bash
npm run dev
```

### 6. Run Integration Tests

In a third terminal:

```bash
chmod +x scripts/test-integration.sh
./scripts/test-integration.sh
```

This will automatically:
- ✅ Register the mock device
- ✅ Sync employees from mock device
- ✅ Create employee mappings
- ✅ Simulate fingerprint scans
- ✅ Create attendance records
- ✅ Test all APIs

## Manual Testing

### Option A: Use the Test Script

```bash
./scripts/test-integration.sh
```

### Option B: Manual Step-by-Step

#### Step 1: Register Mock Device

```bash
curl -X POST http://localhost:3000/api/biometric/devices \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mock Test Device",
    "deviceType": "HIKVISION",
    "ipAddress": "localhost",
    "port": 8064,
    "username": "admin",
    "password": "admin123"
  }'
```

#### Step 2: Sync Employees

```bash
curl -X POST http://localhost:3000/api/biometric/sync-employees
```

This will sync the 5 mock employees (EMP001-EMP005).

#### Step 3: Simulate Fingerprint Scan

```bash
curl -X POST http://localhost:3000/api/attendance/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "EventNotificationAlert": {
      "AcsEvent": {
        "employeeNoString": "EMP001",
        "name": "John Doe",
        "time": "2025-12-01T08:30:00+08:00",
        "cardReaderVerifyMode": 1,
        "attendanceStatus": 0
      }
    }
  }'
```

#### Step 4: Check Attendance

```bash
curl "http://localhost:3000/api/attendance?startDate=2025-12-01&endDate=2025-12-01"
```

#### Step 5: Sync from Device

```bash
curl -X POST http://localhost:3000/api/attendance/sync
```

This will fetch the 30 pre-generated attendance records from the mock device.

## View Results

### Option 1: Prisma Studio

```bash
npx prisma studio
```

Then browse:
- **BiometricDevice** - See the mock device
- **BiometricMapping** - See employee mappings
- **AttendanceLog** - See raw attendance events
- **Attendance** - See processed attendance records

### Option 2: Query Database

```bash
# View devices
psql $DATABASE_URL -c 'SELECT * FROM "BiometricDevice";'

# View mappings
psql $DATABASE_URL -c 'SELECT * FROM "BiometricMapping";'

# View today's attendance
psql $DATABASE_URL -c 'SELECT * FROM "Attendance" WHERE date = CURRENT_DATE;'

# View attendance logs
psql $DATABASE_URL -c 'SELECT * FROM "AttendanceLog" ORDER BY "createdAt" DESC LIMIT 10;'
```

## Mock Device Details

The mock device provides:

### Mock Employees
- EMP001 - John Doe
- EMP002 - Jane Smith
- EMP003 - Bob Johnson
- EMP004 - Alice Williams
- EMP005 - Charlie Brown

### Pre-generated Records
- 30 attendance records (last 3 days)
- Each employee has check-in and check-out for 3 days
- Random times between 8-9 AM (check-in) and 5-6 PM (check-out)

### Supported ISAPI Endpoints
- `GET /ISAPI/System/deviceInfo` - Device information
- `POST /ISAPI/AccessControl/UserInfo/Search` - Employee list
- `POST /ISAPI/AccessControl/AcsEvent` - Attendance records

## Testing Scenarios

### Scenario 1: New Employee Check-in

```bash
# Send check-in event
curl -X POST http://localhost:3000/api/attendance/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "EventNotificationAlert": {
      "AcsEvent": {
        "employeeNoString": "EMP001",
        "time": "'$(date -u +%Y-%m-%dT08:00:00+08:00)'",
        "cardReaderVerifyMode": 1,
        "attendanceStatus": 0
      }
    }
  }'

# Verify attendance created
curl "http://localhost:3000/api/attendance?startDate=$(date +%Y-%m-%d)&endDate=$(date +%Y-%m-%d)"
```

### Scenario 2: Check-out Updates Record

```bash
# Send check-out event (for same employee, same day)
curl -X POST http://localhost:3000/api/attendance/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "EventNotificationAlert": {
      "AcsEvent": {
        "employeeNoString": "EMP001",
        "time": "'$(date -u +%Y-%m-%dT17:30:00+08:00)'",
        "cardReaderVerifyMode": 1,
        "attendanceStatus": 1
      }
    }
  }'

# Check work hours calculated
curl "http://localhost:3000/api/attendance?startDate=$(date +%Y-%m-%d)&endDate=$(date +%Y-%m-%d)" | jq '.attendance[0].workHours'
```

### Scenario 3: Bulk Sync from Device

```bash
# Fetch all records from mock device
curl -X POST http://localhost:3000/api/attendance/sync

# Check how many were synced
curl http://localhost:3000/api/attendance/sync | jq '.stats'
```

### Scenario 4: Late Check-in

```bash
# Check-in at 9:30 AM (late)
curl -X POST http://localhost:3000/api/attendance/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "EventNotificationAlert": {
      "AcsEvent": {
        "employeeNoString": "EMP002",
        "time": "'$(date -u +%Y-%m-%dT09:30:00+08:00)'",
        "cardReaderVerifyMode": 1,
        "attendanceStatus": 0
      }
    }
  }'

# Check status is LATE
curl "http://localhost:3000/api/attendance?startDate=$(date +%Y-%m-%d)&endDate=$(date +%Y-%m-%d)" | jq '.attendance[] | select(.employeeId | contains("EMP002")) | .status'
```

## Troubleshooting

### Mock device not starting

**Error:** `Address already in use`

**Solution:**
```bash
# Check what's using port 8064
lsof -i :8064

# Kill the process or use different port
# Edit scripts/mock-hikvision-device.js and change PORT
```

### No employees synced

**Check:**
1. Mock device is running
2. Device registered in database
3. Your system has employees with matching IDs

**Create manual mapping:**
```bash
curl -X POST http://localhost:3000/api/biometric/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "your-user-uuid-from-database",
    "deviceEmployeeNo": "EMP001",
    "fingerprintEnrolled": true
  }'
```

### Attendance not created

**Check logs:**
```bash
curl http://localhost:3000/api/attendance/sync | jq '.recentLogs'
```

Look for `errorMessage` field to see what went wrong.

## What Gets Tested

✅ **Database Schema**
- BiometricDevice model
- BiometricMapping model
- AttendanceLog model
- Attendance model updates

✅ **API Endpoints**
- POST /api/biometric/devices
- GET /api/biometric/devices
- POST /api/biometric/sync-employees
- POST /api/biometric/mappings
- GET /api/biometric/mappings
- POST /api/attendance/webhook
- POST /api/attendance/sync
- GET /api/attendance/sync
- GET /api/attendance

✅ **Business Logic**
- Device connection and registration
- Employee mapping creation
- Attendance event processing
- Work hours calculation
- Status determination (PRESENT/LATE/HALF_DAY)
- Duplicate prevention (one record per employee per day)

✅ **Integration Flow**
- Real-time webhook processing
- Periodic sync from device
- Error handling and logging

## Switching to Real Device

When you have access to the physical device:

1. **Stop mock device:**
   - Press Ctrl+C in the mock device terminal

2. **Update .env:**
   ```env
   HIKVISION_HOST=192.168.1.64  # Your device's real IP
   HIKVISION_PORT=80
   HIKVISION_USERNAME=admin
   HIKVISION_PASSWORD=your-real-password
   ```

3. **Update device in database:**
   ```bash
   curl -X PUT http://localhost:3000/api/biometric/devices \
     -H "Content-Type: application/json" \
     -d '{
       "id": "your-device-uuid",
       "ipAddress": "192.168.1.64",
       "port": 80,
       "password": "real-password"
     }'
   ```

4. **Sync employees from real device:**
   ```bash
   curl -X POST http://localhost:3000/api/biometric/sync-employees
   ```

5. **Done!** Everything else works the same.

## Success Criteria

After testing, you should see:

- ✅ Mock device responds to API calls
- ✅ Device registered in BiometricDevice table
- ✅ 5 employees mapped in BiometricMapping table
- ✅ Webhook accepts events and creates AttendanceLog
- ✅ Attendance records created with correct times
- ✅ Work hours calculated correctly
- ✅ Sync pulls records from mock device
- ✅ No duplicate attendance records

## Next Steps

1. Test in your application UI
2. Build admin panel for device management
3. Add reporting features
4. Connect to real device when available

---

**All functionality is working with the mock device - you're ready for the real hardware!** 🎉
