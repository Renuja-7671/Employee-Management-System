import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      leaveType,
      startDate,
      endDate,
      reason,
      coverEmployeeId,
      medicalCertUrl,
    } = body;

    // Validate required fields
    if (!userId || !leaveType || !startDate || !endDate || !coverEmployeeId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate number of days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Validate dates
    if (start > end) {
      return NextResponse.json(
        { error: 'Start date must be before or equal to end date' },
        { status: 400 }
      );
    }

    if (totalDays <= 0) {
      return NextResponse.json(
        { error: 'Invalid date range' },
        { status: 400 }
      );
    }

    // Get current year leave balance
    const currentYear = new Date().getFullYear();
    let leaveBalance = await prisma.leaveBalance.findFirst({
      where: {
        employeeId: userId,
        year: currentYear,
      },
    });

    // Create leave balance if it doesn't exist
    if (!leaveBalance) {
      leaveBalance = await prisma.leaveBalance.create({
        data: {
          employeeId: userId,
          year: currentYear,
          annual: 14,
          casual: 7,
          medical: 0,
          business: 0,
        },
      });
    }

    // Validate leave balance based on type
    const leaveTypeUpper = leaveType.toUpperCase();
    if (leaveTypeUpper === 'ANNUAL' && leaveBalance.annual < totalDays) {
      return NextResponse.json(
        { error: 'Insufficient annual leave balance' },
        { status: 400 }
      );
    }

    if (leaveTypeUpper === 'CASUAL' && leaveBalance.casual < totalDays) {
      return NextResponse.json(
        { error: 'Insufficient casual leave balance' },
        { status: 400 }
      );
    }

    // Validate annual leave max 7 days
    if (leaveTypeUpper === 'ANNUAL' && totalDays > 7) {
      return NextResponse.json(
        { error: 'Annual leave cannot exceed 7 continuous days' },
        { status: 400 }
      );
    }

    // Validate medical certificate for medical leave
    if (leaveTypeUpper === 'MEDICAL' && !medicalCertUrl) {
      return NextResponse.json(
        { error: 'Medical certificate is required for medical leave' },
        { status: 400 }
      );
    }

    // Create leave request
    const leave = await prisma.leave.create({
      data: {
        employeeId: userId,
        leaveType: leaveTypeUpper,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalDays,
        reason: reason || '',
        coverEmployeeId,
        medicalCertPath: medicalCertUrl || null,
        status: 'PENDING_COVER',
      },
    });

    // Create cover request with 12-hour expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 12);

    await prisma.coverRequest.create({
      data: {
        leaveId: leave.id,
        coverEmployeeId,
        status: 'PENDING',
        expiresAt,
      },
    });

    // Create notification for cover employee
    const employee = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    await prisma.notification.create({
      data: {
        userId: coverEmployeeId,
        type: 'COVER_REQUEST',
        title: 'New Cover Request',
        message: `${employee?.firstName} ${employee?.lastName} requested you to cover their ${leaveType} leave from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
        senderId: userId,
        relatedId: leave.id,
      },
    });

    return NextResponse.json({
      message: 'Leave request submitted successfully',
      leave: {
        id: leave.id,
        status: leave.status,
      },
    });
  } catch (error) {
    console.error('Error applying for leave:', error);
    return NextResponse.json(
      { error: 'Failed to submit leave request' },
      { status: 500 }
    );
  }
}
