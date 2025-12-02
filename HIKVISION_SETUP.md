# Hikvision Fingerprint Reader Integration Guide

This guide explains how to integrate your Hikvision DS-K1A8503EF-B fingerprint reader with the EMS (Employee Management System).

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Network Setup](#network-setup)
5. [Configuration Steps](#configuration-steps)
6. [Employee Mapping](#employee-mapping)
7. [Sync Methods](#sync-methods)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)

## Overview

The integration supports two methods for collecting attendance data:

1. **Real-time Webhook** - Device sends instant notifications when fingerprint scans occur
2. **Periodic Polling** - System pulls attendance data from device every 15 minutes

Both methods can work together for redundancy.

## Architecture

```
┌─────────────────────┐
│ Hikvision Device    │
│ DS-K1A8503EF-B      │
│ (192.168.x.x)       │
└──────────┬──────────┘
           │
           │ LAN/WiFi
           │
           ├──────────────────┐
           │                  │
           │ Webhook          │ Polling
           │ (Real-time)      │ (Every 15min)
           │                  │
           ▼                  ▼
┌─────────────────────────────────┐
│  EMS Application Server         │
│  - Webhook Endpoint             │
│  - Sync Service                 │
│  - Database                     │
└─────────────────────────────────┘
```

## Prerequisites

### Hardware Requirements
- ✅ Hikvision DS-K1A8503EF-B fingerprint reader (already installed)
- ✅ Network connection (LAN cable already connected)
- ✅ WiFi network (available in your company)

### Software Requirements
- Hikvision device firmware version 4.x or higher
- Access to device admin credentials
- EMS system with database access

### Network Requirements
- Static IP address for the Hikvision device
- Network connectivity between device and server
- Open port 80 (HTTP) or 443 (HTTPS) on device

## Network Setup

### Step 1: Configure Static IP on Hikvision Device

1. **Access Device Web Interface:**
   - Open browser and navigate to device IP (e.g., `http://192.168.1.64`)
   - Login with admin credentials
   - Default username: `admin`
   - Password: (device specific)

2. **Set Static IP:**
   - Go to: `Configuration > Network > Basic Settings > TCP/IP`
   - Set to **Static IP** mode
   - Configure:
     ```
     IP Address: 192.168.1.64 (or your preferred IP)
     Subnet Mask: 255.255.255.0
     Gateway: 192.168.1.1 (your router IP)
     DNS Server: 8.8.8.8
     ```
   - Click **Save**

3. **Enable HTTP/HTTPS:**
   - Go to: `Configuration > Network > Basic Settings > Port`
   - Ensure HTTP port is **80** and HTTPS is **443**
   - Click **Save**

### Step 2: Test Network Connectivity

From your server, test connection to device:

```bash
# Ping the device
ping 192.168.1.64

# Test HTTP access
curl http://192.168.1.64/ISAPI/System/deviceInfo -u admin:password
```

## Configuration Steps

### Step 1: Update Environment Variables

Add the following to your `.env` file:

```env
# Hikvision Device Configuration
HIKVISION_HOST=192.168.1.64
HIKVISION_PORT=80
HIKVISION_USERNAME=admin
HIKVISION_PASSWORD=your-device-password
HIKVISION_PROTOCOL=http

# Webhook Secret (optional security)
HIKVISION_WEBHOOK_SECRET=your-random-secret-key

# Cron Secret (for scheduled sync)
CRON_SECRET=your-cron-secret-key
```

### Step 2: Run Database Migration

Apply the database schema changes:

```bash
# Generate Prisma client
npx prisma generate

# Run migration
npx prisma migrate dev --name add_biometric_integration

# Or for production
npx prisma migrate deploy
```

### Step 3: Register Device in System

Use the API to register your Hikvision device:

**API Call:**
```bash
POST /api/biometric/devices
Content-Type: application/json

{
  "name": "Main Office Fingerprint Reader",
  "deviceType": "HIKVISION",
  "ipAddress": "192.168.1.64",
  "port": 80,
  "username": "admin",
  "password": "your-device-password"
}
```

**Response:**
```json
{
  "success": true,
  "device": {
    "id": "uuid",
    "name": "Main Office Fingerprint Reader",
    "deviceType": "HIKVISION",
    "ipAddress": "192.168.1.64",
    "serialNumber": "DS-K1A8503EF-B12345",
    "model": "DS-K1A8503EF-B"
  }
}
```

### Step 4: Configure Webhook (Optional - for Real-time Updates)

Configure the device to send events to your server:

1. **Get Your Server Webhook URL:**
   ```
   https://your-domain.com/api/attendance/webhook
   ```

2. **Configure on Device:**
   - Login to device web interface
   - Go to: `Event > Smart Event > Access Control`
   - Enable **Event Notification**
   - Set Notification Method: **HTTP**
   - Configure:
     ```
     URL: https://your-domain.com/api/attendance/webhook
     Protocol Type: HTTP or HTTPS
     Username: (leave blank or use webhook auth)
     Password: (leave blank or use webhook secret)
     ```
   - Click **Save**

3. **Test Webhook:**
   - Perform a fingerprint scan
   - Check server logs for incoming webhook event

### Step 5: Verify Cron Job

The system automatically syncs attendance every 15 minutes via Vercel Cron.

**Verify cron is configured:**
Check [vercel.json](vercel.json):
```json
{
  "crons": [
    {
      "path": "/api/cron/attendance-sync",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Manual sync test:**
```bash
curl -X POST https://your-domain.com/api/attendance/sync
```

## Employee Mapping

Before attendance can be tracked, employees must be mapped to their device employee numbers.

### Automatic Mapping (Recommended)

If employee IDs in your system match the device employee numbers:

```bash
POST /api/biometric/sync-employees
```

This will:
1. Fetch all employees from Hikvision device
2. Match device employee numbers with system employee IDs
3. Automatically create mappings

### Manual Mapping

For custom mapping:

```bash
POST /api/biometric/mappings
Content-Type: application/json

{
  "employeeId": "user-uuid-from-database",
  "deviceEmployeeNo": "EMP001",
  "fingerprintEnrolled": true
}
```

### View Mappings

```bash
GET /api/biometric/mappings
```

### Enroll New Employee

1. **Add employee in your EMS system** (if not already added)

2. **Enroll fingerprint on device:**
   - Use IVMS-4200 software OR
   - Use device web interface: `User > User Management > Add`
   - Enter employee number (must match system employee ID)
   - Enroll fingerprint

3. **Sync to system:**
   ```bash
   POST /api/biometric/sync-employees
   ```

## Sync Methods

### Method 1: Real-time Webhook (Instant)

**How it works:**
- Employee scans fingerprint
- Device sends HTTP POST to `/api/attendance/webhook`
- System processes immediately
- Attendance recorded in real-time

**Advantages:**
- ✅ Instant attendance recording
- ✅ No delay
- ✅ Lower data load

**Requirements:**
- Device must have network access to your server
- Server must be publicly accessible OR on same network

### Method 2: Periodic Polling (Every 15 minutes)

**How it works:**
- Cron job runs every 15 minutes
- System fetches new attendance records from device
- Processes and stores in database

**Advantages:**
- ✅ Works even if webhook fails
- ✅ No firewall configuration needed
- ✅ Catches missed events

**Configuration:**
Automatically configured via [vercel.json](vercel.json).

### Method 3: Manual Sync (On-demand)

Trigger manual sync via API:

```bash
POST /api/attendance/sync
Content-Type: application/json

{
  "startDate": "2025-12-01T00:00:00Z",
  "endDate": "2025-12-01T23:59:59Z"
}
```

## Troubleshooting

### Issue: Device not connecting

**Check:**
1. Network connectivity: `ping 192.168.1.64`
2. HTTP access: `curl http://192.168.1.64`
3. Credentials are correct
4. Firewall not blocking

**Solution:**
```bash
# Test connection via API
GET /api/biometric/devices
```

### Issue: Attendance not syncing

**Check:**
1. Device is registered: `GET /api/biometric/devices`
2. Employee mappings exist: `GET /api/biometric/mappings`
3. Sync logs: `GET /api/attendance/sync`

**Debug:**
```bash
# Check recent logs
GET /api/attendance/sync

# Response shows:
{
  "stats": {
    "totalLogs": 150,
    "processedLogs": 145,
    "failedLogs": 5,
    "pendingLogs": 0
  },
  "recentLogs": [...]
}
```

### Issue: Employee mapping not found

**Error:** "No employee mapping found for device employee no: XXX"

**Solution:**
1. Check if employee exists in system with matching employee ID
2. Create manual mapping:
   ```bash
   POST /api/biometric/mappings
   {
     "employeeId": "user-uuid",
     "deviceEmployeeNo": "XXX"
   }
   ```

### Issue: Webhook not receiving events

**Check:**
1. Server is publicly accessible
2. Webhook URL is correct in device settings
3. Device can reach server: Test from device network

**Test webhook:**
```bash
# Check webhook endpoint is active
GET https://your-domain.com/api/attendance/webhook

# Response:
{
  "message": "Hikvision Attendance Webhook Endpoint",
  "status": "active"
}
```

### Issue: Duplicate attendance records

**Cause:** Both webhook and polling creating records

**Solution:**
The system handles this automatically by using unique constraint:
```prisma
@@unique([employeeId, date])
```

Only one attendance record per employee per day.

## API Reference

### Device Management

#### Register Device
```http
POST /api/biometric/devices
Content-Type: application/json

{
  "name": "string",
  "ipAddress": "string",
  "port": 80,
  "username": "string",
  "password": "string"
}
```

#### Get Devices
```http
GET /api/biometric/devices
```

#### Update Device
```http
PUT /api/biometric/devices
Content-Type: application/json

{
  "id": "uuid",
  "name": "string",
  "isActive": true
}
```

#### Delete Device
```http
DELETE /api/biometric/devices?id=uuid
```

### Employee Mapping

#### Auto-sync Employees
```http
POST /api/biometric/sync-employees
```

#### Get Mappings
```http
GET /api/biometric/mappings
GET /api/biometric/mappings?employeeId=uuid
```

#### Create Mapping
```http
POST /api/biometric/mappings
Content-Type: application/json

{
  "employeeId": "uuid",
  "deviceEmployeeNo": "string",
  "fingerprintEnrolled": true
}
```

#### Update Mapping
```http
PUT /api/biometric/mappings
Content-Type: application/json

{
  "id": "uuid",
  "fingerprintEnrolled": true
}
```

#### Delete Mapping
```http
DELETE /api/biometric/mappings?id=uuid
```

### Attendance Sync

#### Manual Sync
```http
POST /api/attendance/sync
Content-Type: application/json

{
  "startDate": "2025-12-01T00:00:00Z",
  "endDate": "2025-12-01T23:59:59Z"
}
```

#### Get Sync Status
```http
GET /api/attendance/sync
```

#### Webhook Endpoint
```http
POST /api/attendance/webhook
Content-Type: application/xml
Authorization: Bearer webhook-secret (optional)

[Device sends XML/JSON payload]
```

## Database Schema

### BiometricDevice
```prisma
model BiometricDevice {
  id              String   @id @default(uuid())
  name            String
  deviceType      DeviceType
  ipAddress       String
  port            Int
  username        String
  password        String
  serialNumber    String?  @unique
  model           String?
  isActive        Boolean  @default(true)
  lastSyncAt      DateTime?
}
```

### BiometricMapping
```prisma
model BiometricMapping {
  id                  String   @id @default(uuid())
  employeeId          String   @unique
  deviceEmployeeNo    String
  fingerprintEnrolled Boolean  @default(false)
  syncedAt            DateTime?
}
```

### AttendanceLog
```prisma
model AttendanceLog {
  id               String   @id @default(uuid())
  deviceEmployeeNo String
  employeeId       String?
  timestamp        DateTime
  verifyMode       Int
  inOutType        Int
  processed        Boolean  @default(false)
  errorMessage     String?
}
```

### Attendance (Updated)
```prisma
model Attendance {
  id          String            @id @default(uuid())
  employeeId  String
  date        DateTime
  checkIn     DateTime?
  checkOut    DateTime?
  status      AttendanceStatus
  workHours   Float?
  deviceId    String?
  verifyMode  Int?
  source      AttendanceSource  @default(MANUAL)

  @@unique([employeeId, date])
}
```

## Migration from IVMS-4200

### Current Setup
- ✅ Device connected to one computer via LAN
- ✅ IVMS-4200 software installed
- ✅ Attendance reports generated manually

### New Setup
- ✅ Device remains connected to network (LAN/WiFi)
- ✅ IVMS-4200 can still be used for device management
- ✅ Attendance data automatically syncs to EMS
- ✅ No manual report generation needed

### Minimal Changes Required
1. Assign static IP to device (one-time)
2. Register device in EMS (one-time)
3. Map employees (one-time)
4. System handles the rest automatically

## Support

For issues or questions:
1. Check logs: `GET /api/attendance/sync`
2. Review troubleshooting section above
3. Contact system administrator

## Next Steps

1. ✅ Complete network setup
2. ✅ Register device in system
3. ✅ Map all employees
4. ✅ Test with few employees
5. ✅ Enable webhook for real-time sync
6. ✅ Monitor sync logs regularly
