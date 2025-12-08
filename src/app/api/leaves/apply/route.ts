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
          medical: 7,
          official: 0,
        },
      });
    }

    // Check if this will be a No Pay leave
    const leaveTypeUpper = leaveType.toUpperCase();
    let isNoPay = false;
    let noPayMessage = '';

    if (leaveTypeUpper === 'ANNUAL' && leaveBalance.annual < totalDays) {
      isNoPay = true;
      noPayMessage = `You have insufficient annual leave balance (${leaveBalance.annual} days remaining). This will be a NO PAY leave if approved.`;
    }

    if (leaveTypeUpper === 'CASUAL' && leaveBalance.casual < totalDays) {
      isNoPay = true;
      noPayMessage = `You have insufficient casual leave balance (${leaveBalance.casual} days remaining). This will be a NO PAY leave if approved.`;
    }

    if (leaveTypeUpper === 'MEDICAL' && leaveBalance.medical < totalDays) {
      isNoPay = true;
      noPayMessage = `You have insufficient medical leave balance (${leaveBalance.medical} days remaining). This will be a NO PAY leave if approved.`;
    }

    // Validate casual leave: only 0.5 or 1 day allowed
    if (leaveTypeUpper === 'CASUAL' && totalDays !== 0.5 && totalDays !== 1) {
      return NextResponse.json(
        { error: 'Casual leave can only be 0.5 day (half day) or 1 day' },
        { status: 400 }
      );
    }

    // Validate medical leave: only 0.5, 1, 1.5, 2, 2.5, or 3 days allowed
    if (leaveTypeUpper === 'MEDICAL') {
      const allowedDays = [0.5, 1, 1.5, 2, 2.5, 3];
      if (!allowedDays.includes(totalDays)) {
        return NextResponse.json(
          { error: 'Medical leave can only be 0.5, 1, 1.5, 2, 2.5, or 3 days' },
          { status: 400 }
        );
      }
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

    // Validate medical certificate for medical leave (required if more than 1 day)
    if (leaveTypeUpper === 'MEDICAL' && totalDays > 1 && !medicalCertUrl) {
      return NextResponse.json(
        { error: 'Medical certificate is required for medical leave exceeding 1 day' },
        { status: 400 }
      );
    }

    // Check if the employee has accepted to cover for someone else during the requested leave period
    // IMPORTANT: Medical leaves are always allowed even when covering (practical requirement - sick employees cannot work)
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

    // Block only non-medical leaves when covering duties
    // Medical leaves are ALWAYS allowed (employee cannot work if ill)
    if (coveringDuties.length > 0 && leaveTypeUpper !== 'MEDICAL') {
      const coveringFor = coveringDuties.map(
        (duty) => `${duty.employee.firstName} ${duty.employee.lastName} (${new Date(duty.startDate).toLocaleDateString()} - ${new Date(duty.endDate).toLocaleDateString()})`
      ).join(', ');

      return NextResponse.json(
        {
          error: `You cannot apply for ${leaveType} leave during this period because you have accepted to cover duties for: ${coveringFor}. However, you may apply for medical leave if needed.`,
        },
        { status: 400 }
      );
    }

    // Check if this employee is currently covering for someone else during the requested period
    // This is a critical scenario that needs special handling
    const coveringForOthers = await prisma.leave.findMany({
      where: {
        coverEmployeeId: userId,
        status: 'APPROVED', // Only approved leaves where this employee is the cover
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } },
            ],
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } },
            ],
          },
          {
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
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

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
        isNoPay: isNoPay,
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

    // If this is a No Pay leave, notify the employee
    if (isNoPay) {
      await prisma.notification.create({
        data: {
          userId: userId,
          type: 'SYSTEM_ALERT',
          title: '⚠️ No Pay Leave Notice',
          message: noPayMessage,
          relatedId: leave.id,
          isPinned: true,
        },
      });
    }

    // If this employee is covering for others and applying for leave (especially medical),
    // notify all admins about the covering duty conflict
    if (coveringForOthers.length > 0) {
      // Get all admins (Managing Director and HR Head)
      const admins = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
        },
        select: {
          id: true,
          adminType: true,
        },
      });

      // Create notifications for all admins about the conflict
      const conflictDetails = coveringForOthers.map(
        (originalLeave) =>
          `${originalLeave.employee.firstName} ${originalLeave.employee.lastName} (${new Date(originalLeave.startDate).toLocaleDateString()} - ${new Date(originalLeave.endDate).toLocaleDateString()})`
      ).join(', ');

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'COVERING_DUTY_CONFLICT',
            title: '⚠️ Covering Duty Conflict Detected',
            message: `${employee?.firstName} ${employee?.lastName} applied for ${leaveType} leave (${start.toLocaleDateString()} - ${end.toLocaleDateString()}) but is currently covering for: ${conflictDetails}. If approved, duty reassignment will be required.`,
            senderId: userId,
            relatedId: leave.id,
            isPinned: true, // Pin this to make it highly visible
          },
        });
      }

      // Create cover duty reassignment records for tracking
      for (const originalLeave of coveringForOthers) {
        await prisma.coverDutyReassignment.create({
          data: {
            originalLeaveId: originalLeave.id,
            coverEmployeeLeaveId: leave.id,
            originalCoverEmployeeId: userId,
            status: 'PENDING',
          },
        });
      }
    }

    return NextResponse.json({
      message: 'Leave request submitted successfully',
      leave: {
        id: leave.id,
        status: leave.status,
      },
      isNoPay: isNoPay,
      noPayMessage: isNoPay ? noPayMessage : null,
      coveringDutyConflict: coveringForOthers.length > 0,
      conflictDetails: coveringForOthers.length > 0 ? {
        affectedLeaves: coveringForOthers.map(l => ({
          employeeName: `${l.employee.firstName} ${l.employee.lastName}`,
          startDate: l.startDate,
          endDate: l.endDate,
        }))
      } : null,
    });
  } catch (error) {
    console.error('Error applying for leave:', error);
    return NextResponse.json(
      { error: 'Failed to submit leave request' },
      { status: 500 }
    );
  }
}
