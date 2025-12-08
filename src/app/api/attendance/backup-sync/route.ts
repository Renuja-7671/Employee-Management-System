import { NextRequest, NextResponse } from 'next/server';
import { HikvisionClient } from '@/lib/services/hikvision';
import { AttendanceSyncService } from '@/lib/services/attendance-sync';

/**
 * Local Backup Sync Endpoint
 *
 * This endpoint receives sync requests from a local script running on your company network.
 * The local script can access the device (same LAN) and sends data to Vercel for processing.
 *
 * This provides backup sync capability even though Vercel cannot directly access your device.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      deviceIp,
      devicePort,
      deviceUsername,
      devicePassword,
      startTime,
      endTime,
    } = body;

    // Validate required fields
    if (!deviceIp || !deviceUsername || !devicePassword || !startTime || !endTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: deviceIp, deviceUsername, devicePassword, startTime, endTime'
        },
        { status: 400 }
      );
    }

    console.log('[LOCAL BACKUP SYNC] Starting sync from local script');
    console.log(`[LOCAL BACKUP SYNC] Device: ${deviceIp}:${devicePort || 80}`);
    console.log(`[LOCAL BACKUP SYNC] Time range: ${startTime} to ${endTime}`);

    // Create Hikvision client with provided credentials
    const hikClient = new HikvisionClient({
      host: deviceIp,
      port: devicePort || 80,
      username: deviceUsername,
      password: devicePassword,
    });

    // Create sync service with the client
    const syncService = new AttendanceSyncService(hikClient);

    // Perform sync
    const start = new Date(startTime);
    const end = new Date(endTime);

    const result = await syncService.syncAttendance(start, end);

    console.log('[LOCAL BACKUP SYNC] Completed:', {
      success: result.success,
      recordsFetched: result.recordsFetched,
      recordsProcessed: result.recordsProcessed,
      recordsFailed: result.recordsFailed,
      errors: result.errors?.length || 0,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sync completed with errors',
          recordsFetched: result.recordsFetched,
          recordsProcessed: result.recordsProcessed,
          recordsFailed: result.recordsFailed,
          errors: result.errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Backup sync completed successfully',
      recordsFetched: result.recordsFetched,
      recordsProcessed: result.recordsProcessed,
      recordsFailed: result.recordsFailed,
      errors: result.errors || [],
    });
  } catch (error: any) {
    console.error('[LOCAL BACKUP SYNC] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to sync attendance',
      },
      { status: 500 }
    );
  }
}

/**
 * Get sync endpoint info
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/attendance/backup-sync',
    method: 'POST',
    description: 'Local backup sync endpoint for attendance data',
    usage: 'Called by local sync script running on company network',
    requiredFields: [
      'deviceIp',
      'devicePort',
      'deviceUsername',
      'devicePassword',
      'startTime (ISO 8601)',
      'endTime (ISO 8601)',
    ],
    example: {
      deviceIp: '192.168.1.200',
      devicePort: 80,
      deviceUsername: 'admin',
      devicePassword: 'Uniquin@2',
      startTime: '2024-12-07T08:00:00.000Z',
      endTime: '2024-12-07T10:00:00.000Z',
    },
  });
}
