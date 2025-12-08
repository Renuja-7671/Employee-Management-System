// src/app/api/leaves/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const adminId = searchParams.get('adminId');

    // Verify admin authentication
    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Only admins can access leave summary' },
        { status: 403 }
      );
    }

    // Get all employees with their leave data
    const employees = await prisma.user.findMany({
      where: {
        role: 'EMPLOYEE',
        isActive: true,
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        department: true,
        position: true,
        dateOfJoining: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });

    // Get leave balances for the specified year
    const leaveBalances = await prisma.leaveBalance.findMany({
      where: {
        year: parseInt(year),
      },
      select: {
        employeeId: true,
        annual: true,
        casual: true,
        medical: true,
        official: true,
      },
    });

    // Get all leaves for the specified year
    const startOfYear = new Date(parseInt(year), 0, 1);
    const endOfYear = new Date(parseInt(year), 11, 31);

    const leaves = await prisma.leave.findMany({
      where: {
        startDate: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
      select: {
        id: true,
        employeeId: true,
        leaveType: true,
        status: true,
        totalDays: true,
        startDate: true,
        endDate: true,
        isNoPay: true,
      },
    });

    // Create a map of leave balances by employee ID
    const balanceMap = new Map(
      leaveBalances.map(b => [b.employeeId, b])
    );

    // Process data for each employee
    const employeeSummaries = employees.map(employee => {
      const employeeLeaves = leaves.filter(l => l.employeeId === employee.id);
      const balance = balanceMap.get(employee.id) || {
        annual: 14,
        casual: 7,
        medical: 0,
        official: 0,
      };

      // Calculate leave taken by type and status
      const leaveTaken = {
        ANNUAL: { approved: 0, pending: 0, declined: 0 },
        CASUAL: { approved: 0, pending: 0, declined: 0 },
        MEDICAL: { approved: 0, pending: 0, declined: 0 },
        OFFICIAL: { approved: 0, pending: 0, declined: 0 },
      };

      // Calculate No Pay leaves (approved leaves with isNoPay = true)
      let noPayLeaveCount = 0;
      let noPayLeaveDays = 0;

      employeeLeaves.forEach(leave => {
        if (leave.status === 'APPROVED') {
          leaveTaken[leave.leaveType].approved += leave.totalDays;
          // Count No Pay leaves
          if ((leave as any).isNoPay === true) {
            noPayLeaveCount += 1;
            noPayLeaveDays += leave.totalDays;
          }
        } else if (leave.status === 'PENDING_COVER' || leave.status === 'PENDING_ADMIN') {
          leaveTaken[leave.leaveType].pending += leave.totalDays;
        } else if (leave.status === 'DECLINED') {
          leaveTaken[leave.leaveType].declined += leave.totalDays;
        }
      });

      // Calculate total approved leaves
      const totalApprovedLeaves = Object.values(leaveTaken).reduce(
        (sum, type) => sum + type.approved,
        0
      );

      // Calculate leave frequency (approved leaves per month since joining)
      const monthsSinceJoining = employee.dateOfJoining
        ? Math.max(
            1,
            Math.floor(
              (new Date().getTime() - new Date(employee.dateOfJoining).getTime()) /
                (1000 * 60 * 60 * 24 * 30)
            )
          )
        : 1;

      const leaveFrequency = totalApprovedLeaves / monthsSinceJoining;

      // Calculate remaining balances
      const remainingBalance = {
        annual: balance.annual,
        casual: balance.casual,
        medical: balance.medical, // Unlimited, show as taken
        official: balance.official, // Unlimited, show as taken
      };

      // Get monthly leave distribution for charts
      const monthlyDistribution = new Array(12).fill(0);
      employeeLeaves
        .filter(l => l.status === 'APPROVED')
        .forEach(leave => {
          const month = new Date(leave.startDate).getMonth();
          monthlyDistribution[month] += leave.totalDays;
        });

      return {
        employee: {
          id: employee.id,
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          firstName: employee.firstName,
          lastName: employee.lastName,
          department: employee.department,
          position: employee.position,
          dateOfJoining: employee.dateOfJoining,
        },
        leaveTaken,
        totalApprovedLeaves,
        leaveFrequency: parseFloat(leaveFrequency.toFixed(2)),
        noPayLeaves: {
          count: noPayLeaveCount,
          days: noPayLeaveDays,
        },
        remainingBalance,
        monthlyDistribution,
        leaveHistory: employeeLeaves.map(l => ({
          id: l.id,
          type: l.leaveType,
          status: l.status,
          days: l.totalDays,
          startDate: l.startDate,
          endDate: l.endDate,
        })),
      };
    });

    // Calculate company-wide statistics
    const companyStats = {
      totalEmployees: employees.length,
      totalLeavesApproved: employeeSummaries.reduce(
        (sum, e) => sum + e.totalApprovedLeaves,
        0
      ),
      averageLeavesPerEmployee: parseFloat(
        (
          employeeSummaries.reduce((sum, e) => sum + e.totalApprovedLeaves, 0) /
          Math.max(1, employees.length)
        ).toFixed(2)
      ),
      leaveTypeDistribution: {
        ANNUAL: employeeSummaries.reduce(
          (sum, e) => sum + e.leaveTaken.ANNUAL.approved,
          0
        ),
        CASUAL: employeeSummaries.reduce(
          (sum, e) => sum + e.leaveTaken.CASUAL.approved,
          0
        ),
        MEDICAL: employeeSummaries.reduce(
          (sum, e) => sum + e.leaveTaken.MEDICAL.approved,
          0
        ),
        OFFICIAL: employeeSummaries.reduce(
          (sum, e) => sum + e.leaveTaken.OFFICIAL.approved,
          0
        ),
      },
    };

    return NextResponse.json({
      success: true,
      year: parseInt(year),
      employees: employeeSummaries,
      companyStats,
    });
  } catch (error: any) {
    console.error('Error fetching leave summary:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leave summary' },
      { status: 500 }
    );
  }
}
