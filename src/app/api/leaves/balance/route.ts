import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLeaveBalanceForEmployee } from '@/lib/leave-probation-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get the current year
    const currentYear = new Date().getFullYear();
    
    // Fetch employee to check probation status
    const employee = await prisma.user.findUnique({
      where: { id: userId },
    }) as any;

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 400 }
      );
    }

    // Calculate leave balance based on probation status
    const calculatedBalance = getLeaveBalanceForEmployee(
      employee.isProbation,
      currentYear,
      employee.confirmedAt
    );

    // Find or create leave balance for the user
    let leaveBalance = await prisma.leaveBalance.findFirst({
      where: {
        employeeId: userId,
        year: currentYear,
      },
    });

    // If no leave balance exists for this year, create one with calculated values
    if (!leaveBalance) {
      leaveBalance = await prisma.leaveBalance.create({
        data: {
          employeeId: userId,
          year: currentYear,
          annual: calculatedBalance.annual,
          casual: calculatedBalance.casual,
          medical: calculatedBalance.medical,
          official: calculatedBalance.official,
        },
      });
    } else {
      // Update existing balance if probation status affects it
      leaveBalance = await prisma.leaveBalance.update({
        where: { id: leaveBalance.id },
        data: {
          annual: calculatedBalance.annual,
          casual: calculatedBalance.casual,
          medical: calculatedBalance.medical,
          official: calculatedBalance.official,
        },
      });
    }

    // Count approved medical and official leaves for current year
    const medicalLeaveCount = await prisma.leave.count({
      where: {
        employeeId: userId,
        leaveType: 'MEDICAL',
        status: 'APPROVED',
        startDate: {
          gte: new Date(currentYear, 0, 1), // January 1st of current year
          lt: new Date(currentYear + 1, 0, 1), // January 1st of next year
        },
      },
    });

    const officialLeaveCount = await prisma.leave.count({
      where: {
        employeeId: userId,
        leaveType: 'OFFICIAL',
        status: 'APPROVED',
        startDate: {
          gte: new Date(currentYear, 0, 1),
          lt: new Date(currentYear + 1, 0, 1),
        },
      },
    });

    return NextResponse.json({
      balance: {
        annual: leaveBalance.annual,
        casual: leaveBalance.casual,
        medical: leaveBalance.medical,
        official: leaveBalance.official,
      },
      counts: {
        medicalLeaveTaken: medicalLeaveCount,
        officialLeaveTaken: officialLeaveCount,
      },
    });
  } catch (error) {
    console.error('Error fetching leave balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave balance' },
      { status: 500 }
    );
  }
}
