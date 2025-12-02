// src/app/api/biometric/sync-employees/route.ts

import { NextResponse } from 'next/server';
import { createAttendanceSyncService } from '@/lib/services/attendance-sync';

/**
 * API endpoint to sync employee list from device and create mappings
 */

export async function POST() {
  try {
    const syncService = createAttendanceSyncService();

    const result = await syncService.syncEmployeeList();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Employee sync completed with errors',
          result,
        },
        { status: 207 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${result.synced} employees`,
      result,
    });
  } catch (error: any) {
    console.error('Employee sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync employees' },
      { status: 500 }
    );
  }
}
