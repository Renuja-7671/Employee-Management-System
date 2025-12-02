// src/app/api/attendance/sync/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createAttendanceSyncService } from '@/lib/services/attendance-sync';

/**
 * API endpoint to manually trigger attendance sync from Hikvision device
 * Only accessible by admin users
 */

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check here if needed
    // Example: Check if user is authenticated and has admin role

    const body = await request.json().catch(() => ({}));
    const { startDate, endDate } = body;

    const syncService = createAttendanceSyncService();

    // Perform sync
    const result = await syncService.syncAttendance(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Sync completed with errors',
          result,
        },
        { status: 207 } // Multi-status
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Attendance sync completed successfully',
      result,
    });
  } catch (error: any) {
    console.error('Sync API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync attendance' },
      { status: 500 }
    );
  }
}

/**
 * Get sync status and last sync time
 */
export async function GET() {
  try {
    const { prisma } = await import('@/lib/prisma');

    const device = await prisma.biometricDevice.findFirst({
      where: { deviceType: 'HIKVISION', isActive: true },
    });

    if (!device) {
      return NextResponse.json({
        configured: false,
        message: 'No Hikvision device configured',
      });
    }

    // Get recent logs
    const recentLogs = await prisma.attendanceLog.findMany({
      where: { deviceId: device.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        deviceEmployeeNo: true,
        timestamp: true,
        processed: true,
        errorMessage: true,
        createdAt: true,
      },
    });

    // Get sync stats
    const totalLogs = await prisma.attendanceLog.count();
    const processedLogs = await prisma.attendanceLog.count({
      where: { processed: true },
    });
    const failedLogs = await prisma.attendanceLog.count({
      where: {
        processed: false,
        errorMessage: { not: null },
      },
    });

    return NextResponse.json({
      configured: true,
      device: {
        name: device.name,
        ipAddress: device.ipAddress,
        lastSyncAt: device.lastSyncAt,
      },
      stats: {
        totalLogs,
        processedLogs,
        failedLogs,
        pendingLogs: totalLogs - processedLogs,
      },
      recentLogs,
    });
  } catch (error: any) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
