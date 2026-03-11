// src/lib/cleanup-expired-covers.ts

import { prisma } from '@/lib/prisma';

/**
 * Clean up expired cover requests (lazy cleanup approach)
 * This function is called on-demand by various API endpoints instead of relying on cron jobs
 * 
 * @returns Object with cleanup statistics
 */
export async function cleanupExpiredCoverRequests() {
  const now = new Date();
  
  try {
    console.log('[LAZY-CLEANUP] Starting cleanup of expired cover requests...');

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
              },
            },
            coverEmployee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    console.log(`[LAZY-CLEANUP] Found ${expiredCoverRequests.length} expired cover requests`);

    if (expiredCoverRequests.length === 0) {
      return {
        success: true,
        totalExpired: 0,
        cleaned: 0,
        notificationsSent: 0,
        errors: 0,
      };
    }

    let cleanedCount = 0;
    let notificationCount = 0;
    const errors: any[] = [];

    // Process each expired cover request
    for (const coverRequest of expiredCoverRequests) {
      try {
        const leave = coverRequest.Leave;
        const employee = leave.employee;
        const coverEmployee = leave.coverEmployee;

        console.log(`[LAZY-CLEANUP] Processing expired request for ${employee.firstName} ${employee.lastName} (Leave ID: ${leave.id})`);

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

        console.log(`[LAZY-CLEANUP] Successfully cleaned up Leave ID: ${leave.id}`);
      } catch (error) {
        console.error(`[LAZY-CLEANUP] Error processing cover request ${coverRequest.id}:`, error);
        errors.push({
          coverRequestId: coverRequest.id,
          leaveId: coverRequest.leaveId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const summary = {
      success: true,
      totalExpired: expiredCoverRequests.length,
      cleaned: cleanedCount,
      notificationsSent: notificationCount,
      errors: errors.length,
      errorDetails: errors,
    };

    console.log('[LAZY-CLEANUP] Cleanup completed:', summary);

    return summary;
  } catch (error) {
    console.error('[LAZY-CLEANUP] Fatal error during cleanup:', error);
    return {
      success: false,
      totalExpired: 0,
      cleaned: 0,
      notificationsSent: 0,
      errors: 1,
      errorDetails: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
    };
  }
}

/**
 * Lightweight check if there are any expired cover requests
 * Use this before calling the full cleanup to avoid unnecessary processing
 */
export async function hasExpiredCoverRequests(): Promise<boolean> {
  const count = await prisma.coverRequest.count({
    where: {
      status: 'PENDING',
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return count > 0;
}
