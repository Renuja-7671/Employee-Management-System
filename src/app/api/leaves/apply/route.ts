import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canApplyForLeaveType, getLeaveBalanceForEmployee } from '@/lib/leave-probation-utils';
import { cleanupExpiredCoverRequests, hasExpiredCoverRequests } from '@/lib/cleanup-expired-covers';

// Helper function to check if a date is a Sunday
const isSunday = (date: Date): boolean => {
  return date.getDay() === 0;
};

// Helper function to calculate working days (excluding Sundays and company holidays)
const calculateWorkingDays = async (startDate: Date, endDate: Date): Promise<number> => {
  // Normalize start and end dates to UTC midnight for proper comparison
  const normalizedStart = new Date(startDate);
  normalizedStart.setUTCHours(0, 0, 0, 0);

  const normalizedEnd = new Date(endDate);
  normalizedEnd.setUTCHours(23, 59, 59, 999);

  // Fetch all public holidays (Mercantile and Poya) in the date range at once
  const holidays = await prisma.publicHoliday.findMany({
    where: {
      date: {
        gte: normalizedStart,
        lte: normalizedEnd,
      },
      OR: [
        { description: 'Mercantile' },
        { description: 'Poya' }
      ]
    },
    select: {
      date: true,
      name: true,
    }
  });

  console.log(`[LEAVE] Fetched ${holidays.length} holidays from ${normalizedStart.toISOString().split('T')[0]} to ${normalizedEnd.toISOString().split('T')[0]}`);
  // Create a Set of holiday date strings for fast lookup (YYYY-MM-DD format)
  // Use toISOString to ensure consistent date formatting regardless of timezone
  const holidayDates = new Set(
    holidays.map(h => h.date.toISOString().split('T')[0])
  );

  console.log('[LEAVE] Checking holidays for range:', {
    start: normalizedStart.toISOString().split('T')[0],
    end: normalizedEnd.toISOString().split('T')[0],
    foundHolidays: holidays.length,
    holidayDates: Array.from(holidayDates),
    holidayDetails: holidays.map(h => ({
      name: h.name,
      date: h.date.toISOString().split('T')[0]
    }))
  });

  let workingDays = 0;
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Use toISOString to match the format used for holiday dates
    const currentDateStr = currentDate.toISOString().split('T')[0];
    const isHoliday = holidayDates.has(currentDateStr);

    console.log(`[LEAVE] Date ${currentDateStr}:`, {
      isSunday: isSunday(currentDate),
      isHoliday,
      counted: !isSunday(currentDate) && !isHoliday
    });

    // Count only if it's not Sunday and not a company holiday
    if (!isSunday(currentDate) && !isHoliday) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`[LEAVE] Total working days calculated: ${workingDays}`);

  return workingDays;
};

export async function POST(request: NextRequest) {
  try {
    // Lazy cleanup: Remove expired cover requests before processing new leave application
    if (await hasExpiredCoverRequests()) {
      await cleanupExpiredCoverRequests();
    }

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
      halfDayType,
    } = body;

    // Validate required fields
    if (!userId || !leaveType || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const leaveTypeUpper = leaveType.toUpperCase();

    // Cover employee is required for all leave types except official
    if (leaveTypeUpper !== 'OFFICIAL' && !coverEmployeeId) {
      return NextResponse.json(
        { error: 'Cover employee is required for this leave type' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Check employee's probation status and leave eligibility
    const applicantEmployee = await prisma.user.findUnique({
      where: { id: userId },
    }) as any;

    if (!applicantEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check if probation employee can apply for this leave type
    const leaveEligibility = canApplyForLeaveType(applicantEmployee.isProbation, leaveType);
    if (!leaveEligibility.canApply) {
      return NextResponse.json(
        { error: leaveEligibility.message },
        { status: 400 }
      );
    }

    // Calculate working days excluding Sundays and company holidays
    // For half-day (0.5) leaves, use the provided numberOfDays
    const totalDays = numberOfDays === 0.5 ? 0.5 : await calculateWorkingDays(start, end);

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

    // Check for overlapping leaves (PENDING_COVER, PENDING_ADMIN, or APPROVED status)
    const overlappingLeaves = await prisma.leave.findMany({
      where: {
        employeeId: userId,
        status: {
          in: ['PENDING_COVER', 'PENDING_ADMIN', 'APPROVED'],
        },
        OR: [
          // New leave that starts during an existing leave
          {
            startDate: {
              gte: start,
              lte: end,
            },
          },
          // New leave that ends during an existing leave
          {
            endDate: {
              gte: start,
              lte: end,
            },
          },
          // New leave that spans an entire existing leave
          {
            AND: [
              {
                startDate: {
                  lte: start,
                },
              },
              {
                endDate: {
                  gte: end,
                },
              },
            ],
          },
          // Existing leave that starts during the new leave
          {
            AND: [
              {
                startDate: {
                  gte: start,
                  lte: end,
                },
              },
            ],
          },
          // Existing leave that ends during the new leave
          {
            AND: [
              {
                endDate: {
                  gte: start,
                  lte: end,
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        leaveType: true,
        startDate: true,
        endDate: true,
        status: true,
        totalDays: true,
      },
    });

    if (overlappingLeaves.length > 0) {
      const overlappingLeave = overlappingLeaves[0];
      const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      };

      console.log('[LEAVE] Overlapping leave detected:', {
        requestedStart: start.toISOString().split('T')[0],
        requestedEnd: end.toISOString().split('T')[0],
        existingLeave: {
          id: overlappingLeave.id,
          type: overlappingLeave.leaveType,
          start: overlappingLeave.startDate,
          end: overlappingLeave.endDate,
          status: overlappingLeave.status,
        },
      });

      return NextResponse.json(
        {
          error: `You already have a ${overlappingLeave.status.toLowerCase()} ${overlappingLeave.leaveType.toLowerCase()} leave from ${formatDate(overlappingLeave.startDate)} to ${formatDate(overlappingLeave.endDate)}. You cannot apply for overlapping leaves.`,
        },
        { status: 400 }
      );
    }

    // Get or create leave balance for the employee
    // Note: Due to unique constraint on employeeId, each employee has one balance record
    // The year field tracks the balance year, but we can only have one record per employee
    const leaveYear = start.getFullYear();
    let leaveBalance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId: userId,
      },
    });

    // Calculate leave balance based on probation status
    const calculatedBalance = getLeaveBalanceForEmployee(
      applicantEmployee.isProbation,
      leaveYear,
      applicantEmployee.confirmedAt
    );

    // Create or update leave balance if it doesn't exist or if it's for a different year
    if (!leaveBalance) {
      leaveBalance = await prisma.leaveBalance.create({
        data: {
          employeeId: userId,
          year: leaveYear,
          annual: calculatedBalance.annual,
          casual: calculatedBalance.casual,
          medical: calculatedBalance.medical,
          official: calculatedBalance.official,
        },
      });
    } else if (leaveBalance.year !== leaveYear) {
      // If the balance is for a different year, update it to the new year with calculated balance
      // This resets the balance when applying for leave in a new year
      leaveBalance = await prisma.leaveBalance.update({
        where: {
          employeeId: userId,
        },
        data: {
          year: leaveYear,
          annual: calculatedBalance.annual,
          casual: calculatedBalance.casual,
          medical: calculatedBalance.medical,
          official: calculatedBalance.official,
        },
      });
    }

    // Check if this will be a No Pay leave
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

    // Validate annual leave max 7 consecutive days per request
    if (leaveTypeUpper === 'ANNUAL' && totalDays > 7) {
      return NextResponse.json(
        { error: 'Annual leave cannot exceed 7 consecutive days per request' },
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
    // Official leave goes directly to admin, others require cover employee approval
    const leave = await prisma.leave.create({
      data: {
        employeeId: userId,
        leaveType: leaveTypeUpper,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalDays,
        reason: reason || '',
        coverEmployeeId: leaveTypeUpper === 'OFFICIAL' ? null : coverEmployeeId,
        medicalCertPath: medicalCertUrl || null,
        status: leaveTypeUpper === 'OFFICIAL' ? 'PENDING_ADMIN' : 'PENDING_COVER',
        isNoPay: isNoPay,
        halfDayType: halfDayType || null, // Store half-day type for official leaves
      },
    });

    // Get employee details for notifications
    const employee = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    // Only create cover request for non-official leaves
    if (leaveTypeUpper !== 'OFFICIAL') {
      // Create cover request with 24-hour expiry
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await prisma.coverRequest.create({
        data: {
          leaveId: leave.id,
          coverEmployeeId,
          status: 'PENDING',
          expiresAt,
        },
      });

      // Create notification for cover employee
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
    } else {
      // For official leave, notify admin directly
      // Get all admins
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      // Create notifications for all admins
      await Promise.all(
        admins.map((admin) =>
          prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'LEAVE_REQUEST',
              title: 'New Official Leave Request',
              message: `${employee?.firstName} ${employee?.lastName} has requested official leave from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
              senderId: userId,
              relatedId: leave.id,
            },
          })
        )
      );
    }

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
      message: leaveTypeUpper === 'OFFICIAL' 
        ? 'Official leave request submitted successfully. Your request will be reviewed by admin.'
        : 'Leave request submitted successfully',
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
