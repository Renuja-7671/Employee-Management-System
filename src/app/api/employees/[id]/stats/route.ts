import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLeaveBalanceForEmployee } from '@/lib/leave-probation-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;

    // Get current month start and end
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Fetch employee to get probation status and confirmation date
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
    }) as any;

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Calculate base entitlement for new records only
    const calculatedBalance = getLeaveBalanceForEmployee(
      employee.isProbation ?? true,
      currentYear,
      employee.confirmedAt
    );

    // Fetch all data in parallel for maximum performance
    const [storedBalance, leavesForCounts, pendingLeavesCount, approvedLeavesCount, attendanceCount] = await Promise.all([
      prisma.leaveBalance.findUnique({
        where: { employeeId },
      }),

      prisma.leave.findMany({
        where: {
          employeeId,
          status: {
            in: ['APPROVED', 'PENDING_COVER', 'PENDING_ADMIN'],
          },
          startDate: {
            gte: new Date(currentYear, 0, 1),
            lt: new Date(currentYear + 1, 0, 1),
          },
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

    let leaveBalanceRecord = storedBalance;

    if (!leaveBalanceRecord) {
      leaveBalanceRecord = await prisma.leaveBalance.create({
        data: {
          employeeId,
          year: currentYear,
          annual: calculatedBalance.annual,
          casual: calculatedBalance.casual,
          medical: calculatedBalance.medical,
          official: calculatedBalance.official,
        },
      });
    }

    // LeaveBalance stores remaining days (deducted on apply, adjusted by admin).
    const balance = {
      annual: Number(leaveBalanceRecord.annual) || 0,
      casual: Number(leaveBalanceRecord.casual) || 0,
      medical: Number(leaveBalanceRecord.medical) || 0,
    };

    let medicalTaken = 0;
    let officialTaken = 0;

    leavesForCounts.forEach((leave) => {
      const days = Number(leave.totalDays) || 0;
      switch (leave.leaveType) {
        case 'MEDICAL':
          medicalTaken += days;
          break;
        case 'OFFICIAL':
          officialTaken += days;
          break;
      }
    });

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
