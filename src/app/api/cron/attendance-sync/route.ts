// src/app/api/cron/attendance-sync/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createAttendanceSyncService } from '@/lib/services/attendance-sync';

/**
 * Cron job endpoint for periodic attendance sync
 *
 * This endpoint should be called by a cron service (e.g., Vercel Cron, GitHub Actions, or external cron service)
 *
 * For Vercel Cron, add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/attendance-sync",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 *
 * For security, you should add authentication via cron secret
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

    console.log('[CRON] Starting scheduled attendance sync...');

    const syncService = createAttendanceSyncService();

    // Sync attendance from last sync time
    const result = await syncService.syncAttendance();

    console.log('[CRON] Attendance sync completed:', {
      success: result.success,
      recordsFetched: result.recordsFetched,
      recordsProcessed: result.recordsProcessed,
      recordsFailed: result.recordsFailed,
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
