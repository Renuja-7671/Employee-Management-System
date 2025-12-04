// src/app/api/cron/attendance-sync/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createAttendanceSyncService } from '@/lib/services/attendance-sync';

/**
 * BACKUP Cron Job for Attendance Sync
 *
 * PRIMARY METHOD: Real-time webhooks (instant updates when fingerprint scanned)
 * BACKUP METHOD: This cron job (catches any missed events)
 *
 * This endpoint runs every 6 hours as a safety net to catch:
 * - Events missed due to webhook failures
 * - Events that occurred during network downtime
 * - Events from before webhook was configured
 *
 * Schedule: Every 6 hours (configured in vercel.json)
 * Syncs: Last 24 hours of attendance data
 *
 * For security, add CRON_SECRET to environment variables
 */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[BACKUP SYNC] Starting scheduled backup sync...');

    const syncService = createAttendanceSyncService();

    // Sync last 24 hours as backup (catches any missed webhook events)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - 24);

    const result = await syncService.syncAttendance(startDate, endDate);

    console.log('[BACKUP SYNC] Completed:', {
      success: result.success,
      recordsFetched: result.recordsFetched,
      recordsProcessed: result.recordsProcessed,
      recordsFailed: result.recordsFailed,
      errors: result.errors?.length || 0,
    });

    if (!result.success) {
      console.error('[CRON] Sync errors:', result.errors);
      return NextResponse.json(
        {
          success: false,
          message: 'Sync completed with errors',
          result,
        },
        { status: 207 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Attendance sync completed successfully',
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error: any) {
    console.error('[CRON] Attendance sync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Sync failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
