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
      numberOfDays,
    } = body;

    // Validate required fields
    if (!userId || !leaveType || !startDate || !endDate || !coverEmployeeId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use numberOfDays from request (handles half-day 0.5 for casual leave)
    // Fall back to date calculation for other leave types if not provided
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = numberOfDays || Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

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

    // Get leave balance for the year of the requested leave (not current year)
    // This ensures employees can only use the balance allocated for that specific year
    const leaveYear = start.getFullYear();
    let leaveBalance = await prisma.leaveBalance.findFirst({
      where: {
        employeeId: userId,
        year: leaveYear,
      },
    });

    // Create leave balance if it doesn't exist for the requested year
    if (!leaveBalance) {
      leaveBalance = await prisma.leaveBalance.create({
        data: {
          employeeId: userId,
          year: leaveYear,
          annual: 14,
          casual: 7,
          medical: 0,
          official: 0,
        },
      });
    }

    // Validate leave balance based on type (not applicable for official leave)
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

    // Validate casual leave: only 0.5 or 1 day allowed
    if (leaveTypeUpper === 'CASUAL' && totalDays !== 0.5 && totalDays !== 1) {
      return NextResponse.json(
        { error: 'Casual leave can only be 0.5 day (half day) or 1 day' },
        { status: 400 }
      );
    }

    // Validate casual leave date range (2 days before current date to all future)
    if (leaveTypeUpper === 'CASUAL') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const minDate = new Date(today);
      minDate.setDate(today.getDate() - 2);

      if (start < minDate) {
        return NextResponse.json(
          { error: 'Casual leave can only be applied for dates within 2 days before today or any future date' },
          { status: 400 }
        );
      }
    }

    // Validate annual leave max 3 days per request
    if (leaveTypeUpper === 'ANNUAL' && totalDays > 3) {
      return NextResponse.json(
        { error: 'Annual leave cannot exceed 3 continuous days per request' },
        { status: 400 }
      );
    }

    // Validate annual leave date range (7 days before current date to all future)
    if (leaveTypeUpper === 'ANNUAL') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const minDate = new Date(today);
      minDate.setDate(today.getDate() - 7);

      if (start < minDate) {
        return NextResponse.json(
          { error: 'Annual leave can only be applied for dates within 7 days before today or any future date' },
          { status: 400 }
        );
      }
    }

    // Validate official leave max 3 days and date range
    if (leaveTypeUpper === 'OFFICIAL') {
      if (totalDays > 3) {
        return NextResponse.json(
          { error: 'Official leave cannot exceed 3 continuous days' },
          { status: 400 }
        );
      }

      // Validate date range: 3 days before to 3 days after current date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const minDate = new Date(today);
      minDate.setDate(today.getDate() - 3);
      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + 3);

      if (start < minDate || start > maxDate) {
        return NextResponse.json(
          { error: 'Official leave can only be applied for dates within 3 days before or after today' },
          { status: 400 }
        );
      }
    }

    // Validate medical leave date range (4 days before current date to all future)
    if (leaveTypeUpper === 'MEDICAL') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const minDate = new Date(today);
      minDate.setDate(today.getDate() - 4);

      if (start < minDate) {
        return NextResponse.json(
          { error: 'Medical leave can only be applied for dates within 4 days before today or any future date' },
          { status: 400 }
        );
      }
    }

    // Validate medical certificate for medical leave
    if (leaveTypeUpper === 'MEDICAL' && !medicalCertUrl) {
      return NextResponse.json(
        { error: 'Medical certificate is required for medical leave' },
        { status: 400 }
      );
    }

    // Check if the employee has accepted to cover for someone else during the requested leave period
    const coveringDuties = await prisma.leave.findMany({
      where: {
        coverEmployeeId: userId,
        status: 'APPROVED', // Only check approved leaves where this employee is covering
        OR: [
          {
            // Requested leave starts during an existing covering period
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } },
            ],
          },
          {
            // Requested leave ends during an existing covering period
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } },
            ],
          },
          {
            // Requested leave completely encompasses an existing covering period
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } },
            ],
          },
        ],
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (coveringDuties.length > 0) {
      const coveringFor = coveringDuties.map(
        (duty) => `${duty.employee.firstName} ${duty.employee.lastName} (${new Date(duty.startDate).toLocaleDateString()} - ${new Date(duty.endDate).toLocaleDateString()})`
      ).join(', ');

      return NextResponse.json(
        {
          error: `You cannot apply for leave during this period because you have accepted to cover duties for: ${coveringFor}`,
        },
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
