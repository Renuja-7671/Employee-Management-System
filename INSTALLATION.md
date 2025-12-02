# Hikvision Integration Installation

## Quick Start

### 1. Install Dependencies

First, install the required npm package for HTTP communication with the Hikvision device:

```bash
npm install axios
```

### 2. Run Setup Script

Make the setup script executable and run it:

```bash
chmod +x scripts/setup-hikvision.sh
./scripts/setup-hikvision.sh
```

The script will:
- ✅ Verify prerequisites
- ✅ Test device connection
- ✅ Configure environment variables
- ✅ Generate Prisma client
- ✅ Run database migration

### 3. Manual Setup (Alternative)

If you prefer manual setup:

#### Step 1: Install axios

```bash
npm install axios
```

#### Step 2: Configure Environment

Add to your `.env` file:

```env
# Hikvision Device
HIKVISION_HOST=192.168.1.64
HIKVISION_PORT=80
HIKVISION_USERNAME=admin
HIKVISION_PASSWORD=your-password
HIKVISION_PROTOCOL=http

# Webhook Secret (optional)
HIKVISION_WEBHOOK_SECRET=your-random-secret

# Cron Secret
CRON_SECRET=your-cron-secret
```

#### Step 3: Run Migration

```bash
npx prisma generate
npx prisma migrate dev --name add_biometric_integration
```

Or for production:

```bash
npx prisma migrate deploy
```

### 4. Register Device

After installation, register your device via API:

```bash
curl -X POST http://localhost:3000/api/biometric/devices \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Office Fingerprint Reader",
    "ipAddress": "192.168.1.64",
    "port": 80,
    "username": "admin",
    "password": "your-password"
  }'
```

### 5. Map Employees

Automatically sync employees from device:

```bash
curl -X POST http://localhost:3000/api/biometric/sync-employees
```

### 6. Test Sync

Trigger a manual sync to test:

```bash
curl -X POST http://localhost:3000/api/attendance/sync
```

### 7. Check Status

View sync status:

```bash
curl http://localhost:3000/api/attendance/sync
```

## Verification

After setup, verify everything is working:

1. **Device Connection:**
   ```bash
   curl http://192.168.1.64/ISAPI/System/deviceInfo -u admin:password
   ```

2. **API Endpoints:**
   ```bash
   curl http://localhost:3000/api/biometric/devices
   curl http://localhost:3000/api/biometric/mappings
   curl http://localhost:3000/api/attendance/sync
   ```

3. **Test Attendance:**
   - Scan fingerprint on device
   - Wait 15 minutes (for cron) OR trigger manual sync
   - Check attendance records in database

## Troubleshooting

### Error: Cannot find module 'axios'

**Solution:**
```bash
npm install axios
```

### Error: Device connection failed

**Check:**
1. Device IP is correct
2. Device is powered on
3. Network connectivity: `ping 192.168.1.64`
4. Credentials are correct

### Error: Migration failed

**Solution:**
```bash
# Reset database (WARNING: deletes data)
npx prisma migrate reset

# Or apply manually
npx prisma migrate deploy
```

### Error: Employee mapping not found

**Solution:**
1. Ensure employee IDs in system match device employee numbers
2. Run employee sync: `POST /api/biometric/sync-employees`
3. Or create manual mappings via API

## Next Steps

After successful installation:

1. Read [HIKVISION_SETUP.md](HIKVISION_SETUP.md) for detailed configuration
2. Configure webhook for real-time sync (optional)
3. Set up admin UI for device management
4. Monitor sync logs regularly

## Support

For issues:
1. Check server logs
2. Review [HIKVISION_SETUP.md](HIKVISION_SETUP.md) troubleshooting section
3. Test API endpoints manually
4. Verify device web interface is accessible
