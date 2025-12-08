import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Find or create leave balance for the user
    let leaveBalance = await prisma.leaveBalance.findFirst({
      where: {
        employeeId: userId,
        year: currentYear,
      },
    });

    // If no leave balance exists for this year, create one with default values
    if (!leaveBalance) {
      leaveBalance = await prisma.leaveBalance.create({
        data: {
          employeeId: userId,
          year: currentYear,
          annual: 14,
          casual: 7,
          medical: 7,
          official: 0,
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
