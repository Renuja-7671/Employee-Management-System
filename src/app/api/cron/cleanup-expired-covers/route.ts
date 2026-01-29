// src/app/api/cron/cleanup-expired-covers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Cron Job for Cleaning Up Expired Cover Requests
 *
 * This endpoint runs every hour to clean up expired cover requests that were not responded to.
 * When a cover request expires (24 hours after creation):
 * - Delete the cover request
 * - Delete the leave request (as if it was never applied)
 * - Notify the employee that their request expired
 * - Free up the cover employee for other requests
 *
 * Schedule: Every hour (configured in vercel.json)
 *
 * For security, add CRON_SECRET to environment variables
 */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[CLEANUP-EXPIRED-COVERS] Unauthorized cron attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CLEANUP-EXPIRED-COVERS] Starting cleanup of expired cover requests...');

    const now = new Date();

    // Find all expired cover requests that are still PENDING
    const expiredCoverRequests = await prisma.coverRequest.findMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: now, // Less than current time = expired
        },
      },
      include: {
        Leave: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            coverEmployee: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    console.log(`[CLEANUP-EXPIRED-COVERS] Found ${expiredCoverRequests.length} expired cover requests`);

    let cleanedCount = 0;
    let notificationCount = 0;
    const errors = [];

    // Process each expired cover request
    for (const coverRequest of expiredCoverRequests) {
      try {
        const leave = coverRequest.Leave;
        const employee = leave.employee;
        const coverEmployee = leave.coverEmployee;

        console.log(`[CLEANUP-EXPIRED-COVERS] Processing expired request for ${employee.firstName} ${employee.lastName} (Leave ID: ${leave.id})`);

        // Create notification for the employee
        await prisma.notification.create({
          data: {
            userId: employee.id,
            type: 'SYSTEM_ALERT',
            title: '❌ Leave Request Expired',
            message: `Your ${leave.leaveType.toLowerCase()} leave request (${new Date(leave.startDate).toLocaleDateString()} - ${new Date(leave.endDate).toLocaleDateString()}) has expired because ${coverEmployee?.firstName} ${coverEmployee?.lastName} did not respond within 24 hours. Please reapply if you still need this leave.`,
            relatedId: leave.id,
            isPinned: true,
          },
        });

        notificationCount++;

        // Delete the leave (this will cascade delete the cover request due to onDelete: Cascade)
        await prisma.leave.delete({
          where: { id: leave.id },
        });

        cleanedCount++;

        console.log(`[CLEANUP-EXPIRED-COVERS] Successfully cleaned up Leave ID: ${leave.id}`);
      } catch (error) {
        console.error(`[CLEANUP-EXPIRED-COVERS] Error processing cover request ${coverRequest.id}:`, error);
        errors.push({
          coverRequestId: coverRequest.id,
          leaveId: coverRequest.leaveId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const summary = {
      timestamp: now.toISOString(),
      totalExpired: expiredCoverRequests.length,
      successfullyCleaned: cleanedCount,
      notificationsSent: notificationCount,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : undefined,
    };

    console.log('[CLEANUP-EXPIRED-COVERS] Cleanup completed:', summary);

    return NextResponse.json({
      success: true,
      message: 'Expired cover requests cleanup completed',
      summary,
    });
  } catch (error) {
    console.error('[CLEANUP-EXPIRED-COVERS] Fatal error during cleanup:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup expired cover requests',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
