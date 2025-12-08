# Windows Setup Guide - Attendance Backup Sync

This guide will help you set up the local backup sync script on your Windows PC.

---

## Prerequisites

1. **Node.js installed** on your Windows PC
   - Download from: https://nodejs.org/ (LTS version recommended)
   - During installation, make sure "Add to PATH" is checked

2. **Your Windows PC must be on the same network** as the fingerprint device (192.168.1.200)

---

## Step-by-Step Setup

### Step 1: Create the Sync Folder

1. Open File Explorer
2. Navigate to a location like `C:\`
3. Create a new folder: `attendance-backup-sync`
4. Full path should be: `C:\attendance-backup-sync`

### Step 2: Create Required Files

Open Notepad and create these files in `C:\attendance-backup-sync`:

#### File 1: `package.json`

```json
{
  "name": "attendance-backup-sync",
  "version": "1.0.0",
  "description": "Local backup sync for attendance data",
  "main": "sync.js",
  "scripts": {
    "sync": "node sync.js",
    "start": "node sync.js"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "node-schedule": "^2.1.1"
  }
}
```

Save as: `C:\attendance-backup-sync\package.json`

#### File 2: `sync.js`

```javascript
const axios = require('axios');
const schedule = require('node-schedule');

// Configuration
const CONFIG = {
  // Your Vercel app URL
  vercelAppUrl: 'https://employee-management-system-mu-beryl.vercel.app',

  // Device details (same LAN - accessible)
  deviceIp: '192.168.1.200',
  devicePort: 80,
  deviceUsername: 'admin',
  devicePassword: 'Uniquein@2',

  // Sync schedule (every hour at minute 0)
  schedule: '0 * * * *', // Cron format: minute hour day month weekday

  // How many hours back to sync
  syncHoursBack: 5,
};

// Sync function
async function syncAttendance() {
  const now = new Date();
  const startTime = new Date(now.getTime() - CONFIG.syncHoursBack * 60 * 60 * 1000);

  console.log(`[${now.toISOString()}] Starting backup sync...`);
  console.log(`Syncing from ${startTime.toISOString()} to ${now.toISOString()}`);

  try {
    // Call your Vercel API endpoint that can accept device credentials
    const response = await axios.post(
      `${CONFIG.vercelAppUrl}/api/attendance/backup-sync`,
      {
        deviceIp: CONFIG.deviceIp,
        devicePort: CONFIG.devicePort,
        deviceUsername: CONFIG.deviceUsername,
        devicePassword: CONFIG.devicePassword,
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    if (response.data.success) {
      console.log('✅ Sync completed successfully');
      console.log(`   Records fetched: ${response.data.recordsFetched || 0}`);
      console.log(`   Records processed: ${response.data.recordsProcessed || 0}`);
      console.log(`   Records failed: ${response.data.recordsFailed || 0}`);
    } else {
      console.error('❌ Sync failed:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Sync error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data);
    }
  }
}

// Schedule the sync
console.log('🚀 Attendance Backup Sync Service Started');
console.log(`   Vercel App: ${CONFIG.vercelAppUrl}`);
console.log(`   Device IP: ${CONFIG.deviceIp}:${CONFIG.devicePort}`);
console.log(`   Schedule: ${CONFIG.schedule} (every hour)`);
console.log(`   Sync window: Last ${CONFIG.syncHoursBack} hours`);
console.log('');

// Run immediately on start
syncAttendance();

// Then run on schedule
schedule.scheduleJob(CONFIG.schedule, () => {
  syncAttendance();
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down attendance sync service...');
  process.exit(0);
});
```

Save as: `C:\attendance-backup-sync\sync.js`

#### File 3: `start-sync.bat`

```batch
@echo off
echo Starting Attendance Backup Sync Service...
echo.
cd /d C:\attendance-backup-sync
node sync.js
pause
```

Save as: `C:\attendance-backup-sync\start-sync.bat`

### Step 3: Install Dependencies

1. Open **Command Prompt** as Administrator:
   - Press `Windows + X`
   - Click "Command Prompt (Admin)" or "Windows PowerShell (Admin)"

2. Navigate to the folder:
   ```cmd
   cd C:\attendance-backup-sync
   ```

3. Install required packages:
   ```cmd
   npm install
   ```

   You should see it downloading `axios` and `node-schedule`.

### Step 4: Test the Sync

Before setting up automatic sync, test it manually:

1. Double-click `start-sync.bat` file
2. You should see output like:

```
🚀 Attendance Backup Sync Service Started
   Vercel App: https://employee-management-system-mu-beryl.vercel.app
   Device IP: 192.168.1.200:80
   Schedule: 0 * * * * (every hour)
   Sync window: Last 5 hours

[2024-12-08T10:00:00.000Z] Starting backup sync...
Syncing from 2024-12-08T05:00:00.000Z to 2024-12-08T10:00:00.000Z
✅ Sync completed successfully
   Records fetched: 5
   Records processed: 2
   Records failed: 0
```

3. If you see ✅ success, it's working!
4. Leave this window open - it will sync every hour automatically

### Step 5: Set Up Windows Task Scheduler (Auto-Start)

To make the sync service start automatically when Windows boots:

#### Method 1: Using Task Scheduler (Recommended)

1. Press `Windows + R`, type `taskschd.msc`, press Enter
2. Click **"Create Basic Task"** in the right panel
3. Fill in the wizard:

   **Name:** Attendance Backup Sync
   **Description:** Syncs attendance data from fingerprint device to cloud

4. **Trigger:** Select "When the computer starts"
   - Click Next

5. **Action:** Select "Start a program"
   - Click Next

6. **Program/script:**
   ```
   C:\Program Files\nodejs\node.exe
   ```

7. **Add arguments:**
   ```
   sync.js
   ```

8. **Start in:**
   ```
   C:\attendance-backup-sync
   ```

9. Click Next, then Finish

10. **Important:** Right-click the task you just created → Properties
    - Go to "General" tab
    - Check ✅ "Run whether user is logged on or not"
    - Check ✅ "Run with highest privileges"
    - Click OK (you may need to enter your Windows password)

#### Method 2: Using Startup Folder (Simpler but requires user login)

1. Press `Windows + R`
2. Type: `shell:startup`
3. Press Enter
4. Copy the `start-sync.bat` file into this folder
5. Now it will start automatically when you log in to Windows

---

## Verify It's Running

### Check if the service is running:

1. Open Task Manager (`Ctrl + Shift + Esc`)
2. Go to "Details" tab
3. Look for `node.exe` process
4. If you see it, the sync service is running ✅

### View the logs:

The console window (if you used Method 2) will show:
- When syncs happen (every hour)
- How many records were synced
- Any errors

---

## Troubleshooting

### Error: "node is not recognized"

**Problem:** Node.js not installed or not in PATH

**Solution:**
1. Download and install Node.js from https://nodejs.org/
2. During installation, check "Add to PATH"
3. Restart Command Prompt after installation

### Error: "Cannot connect to device"

**Problem:** Windows PC can't reach the fingerprint device

**Test connection:**
1. Open Command Prompt
2. Run:
   ```cmd
   ping 192.168.1.200
   ```
3. If you get replies, the device is reachable ✅
4. If you get "Request timed out", check:
   - Is the PC on the same network as the device?
   - Is the device IP correct?
   - Is the device powered on?

### Error: "Cannot connect to Vercel"

**Problem:** No internet connection

**Test connection:**
1. Open browser
2. Visit: https://employee-management-system-mu-beryl.vercel.app/api/attendance/backup-sync
3. You should see endpoint info
4. If not, check internet connection

### The sync stops after I close the window

**Problem:** Using Method 2 (Startup folder)

**Solution:** Use Method 1 (Task Scheduler) instead - it runs in the background

---

## Configuration Options

You can edit `sync.js` to change:

### Change sync frequency:

```javascript
schedule: '0 * * * *'      // Every hour at minute 0
schedule: '*/30 * * * *'   // Every 30 minutes
schedule: '0 */2 * * *'    // Every 2 hours
schedule: '0 9-17 * * *'   // Every hour from 9 AM to 5 PM
```

### Change sync window:

```javascript
syncHoursBack: 5    // Sync last 5 hours
syncHoursBack: 2    // Sync last 2 hours
syncHoursBack: 12   // Sync last 12 hours
```

---

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│  Your Office Network (192.168.1.x)                      │
│                                                          │
│  ┌──────────────────┐      ┌────────────────────┐      │
│  │ Windows PC       │─────>│ Fingerprint Device │      │
│  │ (Sync Script)    │ LAN  │ (192.168.1.200)    │      │
│  │                  │<─────│                    │      │
│  └──────────────────┘      └────────────────────┘      │
│         │                                                │
│         │ Internet (HTTPS)                              │
└─────────┼──────────────────────────────────────────────┘
          │
          v
   ┌──────────────┐
   │ Vercel App   │
   │ (Cloud)      │
   └──────────────┘
          │
          v
   ┌──────────────┐
   │ Database     │
   │ (Supabase)   │
   └──────────────┘
```

**What happens:**
1. Script starts when Windows boots
2. Runs immediately, then every hour
3. Fetches attendance from device (via LAN - fast ✅)
4. Sends to Vercel API (via internet)
5. Vercel saves to database
6. Any missed webhooks are caught!

---

## Benefits

✅ **No data loss** - Even if internet fails temporarily
✅ **Automatic** - Runs 24/7 without intervention
✅ **Reliable** - Catches all missed webhook events
✅ **Simple** - Just 3 files on your Windows PC
✅ **Local access** - Can reach device on same LAN

---

## Summary

1. ✅ Create folder: `C:\attendance-backup-sync`
2. ✅ Create 3 files: `package.json`, `sync.js`, `start-sync.bat`
3. ✅ Run `npm install` in Command Prompt
4. ✅ Test with `start-sync.bat`
5. ✅ Set up Task Scheduler for auto-start
6. ✅ Your attendance data is now protected!

Need help? Check the troubleshooting section above.
