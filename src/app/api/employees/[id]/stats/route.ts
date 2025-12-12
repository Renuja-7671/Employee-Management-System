import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;

    // Get current month start and end
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Fetch all data in parallel for maximum performance
    const [leaveBalance, pendingLeavesCount, approvedLeavesCount, attendanceCount] = await Promise.all([
      // Get leave balance
      prisma.leave.findMany({
        where: {
          employeeId,
          status: 'APPROVED',
        },
        select: {
          leaveType: true,
          totalDays: true,
        },
      }),

      // Count pending leaves
      prisma.leave.count({
        where: {
          employeeId,
          status: {
            in: ['PENDING_COVER', 'PENDING_ADMIN'],
          },
        },
      }),

      // Count approved leaves
      prisma.leave.count({
        where: {
          employeeId,
          status: 'APPROVED',
        },
      }),

      // Count attendance this month
      prisma.attendance.count({
        where: {
          employeeId,
          date: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          },
        },
      }),
    ]);

    // Calculate leave balances
    let annualTaken = 0;
    let casualTaken = 0;
    let medicalTaken = 0;
    let officialTaken = 0;

    leaveBalance.forEach((leave) => {
      const days = Number(leave.totalDays) || 0;
      switch (leave.leaveType) {
        case 'ANNUAL':
          annualTaken += days;
          break;
        case 'CASUAL':
          casualTaken += days;
          break;
        case 'MEDICAL':
          medicalTaken += days;
          break;
        case 'OFFICIAL':
          officialTaken += days;
          break;
      }
    });

    const balance = {
      annual: Math.max(0, 14 - annualTaken),
      casual: Math.max(0, 7 - casualTaken),
      medical: Math.max(0, 7 - medicalTaken),
    };

    const counts = {
      medicalLeaveTaken: medicalTaken,
      officialLeaveTaken: officialTaken,
    };

    const stats = {
      pendingLeaves: pendingLeavesCount,
      approvedLeaves: approvedLeavesCount,
      attendanceThisMonth: attendanceCount,
    };

    return NextResponse.json({ balance, counts, stats });
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee stats' },
      { status: 500 }
    );
  }
}
