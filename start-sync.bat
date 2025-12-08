@echo off
echo ========================================
echo  Attendance Backup Sync Service
echo ========================================
echo.
echo Starting sync service...
echo This window will show sync status every hour.
echo Press Ctrl+C to stop the service.
echo.
cd /d C:\attendance-backup-sync
node sync.js
pause
