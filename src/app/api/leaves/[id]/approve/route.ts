// src/app/api/leaves/[id]/approve/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendLeaveApprovalEmails } from '@/lib/leave-emails';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verify that the request is from a Managing Director
    if (!body.adminId) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    const admin = await prisma.user.findUnique({
      where: { id: body.adminId },
      select: {
        id: true,
        role: true,
        adminType: true,
      },
    } as any);

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Only admins can approve leaves' },
        { status: 403 }
      );
    }

    // Only Managing Director can approve leaves
    if (admin.adminType !== 'MANAGING_DIRECTOR') {
      return NextResponse.json(
        { error: 'Only Managing Director can approve leave requests' },
        { status: 403 }
      );
    }

    // Get the leave details first
    const existingLeave = await prisma.leave.findUnique({
      where: { id },
    });

    if (!existingLeave) {
      return NextResponse.json(
        { error: 'Leave not found' },
        { status: 404 }
      );
    }

    // Update the leave status
    const leave = await prisma.leave.update({
      where: { id },
      data: {
        status: 'APPROVED',
        adminResponse: body.adminResponse || null,
      },
    });

    // Deduct leave balance for annual, casual, and medical leaves (official is unlimited)
    if (leave.leaveType === 'ANNUAL' || leave.leaveType === 'CASUAL' || leave.leaveType === 'MEDICAL') {
      // Deduct from the year when the leave is taken (not current year)
      const leaveYear = new Date(leave.startDate).getFullYear();

      // Find or create leave balance for the leave year
      let leaveBalance = await prisma.leaveBalance.findFirst({
        where: {
          employeeId: leave.employeeId,
          year: leaveYear,
        },
      });

      if (!leaveBalance) {
        // Create default leave balance if it doesn't exist for that year
        leaveBalance = await prisma.leaveBalance.create({
          data: {
            employeeId: leave.employeeId,
            year: leaveYear,
            annual: 14,
            casual: 7,
            medical: 7,
            official: 0,
          },
        });
      }

      // Deduct the leave days from the appropriate balance
      const fieldToUpdate =
        leave.leaveType === 'ANNUAL' ? 'annual' :
        leave.leaveType === 'CASUAL' ? 'casual' : 'medical';

      const currentBalance =
        leave.leaveType === 'ANNUAL' ? leaveBalance.annual :
        leave.leaveType === 'CASUAL' ? leaveBalance.casual : leaveBalance.medical;

      const newBalance = Math.max(0, currentBalance - leave.totalDays);

      await prisma.leaveBalance.update({
        where: { id: leaveBalance.id },
        data: {
          [fieldToUpdate]: newBalance,
        },
      });
    }

    // Fetch employee and cover employee details for email
    const employee = await prisma.user.findUnique({
      where: { id: leave.employeeId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    let coverEmployee = null;
    if (leave.coverEmployeeId) {
      coverEmployee = await prisma.user.findUnique({
        where: { id: leave.coverEmployeeId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      });
    }

    // Create notification for admin
    const adminNotificationMessage = leave.isNoPay
      ? `You approved ${employee?.firstName} ${employee?.lastName}'s leave request for ${leave.totalDays} day(s). ⚠️ This is a NO PAY leave due to insufficient balance.`
      : `You approved ${employee?.firstName} ${employee?.lastName}'s leave request for ${leave.totalDays} day(s).`;

    await prisma.notification.create({
      data: {
        userId: body.adminId,
        type: 'LEAVE_APPROVED',
        title: leave.isNoPay ? '✅ Leave Approved (NO PAY)' : '✅ Leave Approved',
        message: adminNotificationMessage,
        isPinned: leave.isNoPay ? true : false,
      },
    });

    // Check if this leave approval creates a covering duty conflict
    const coverDutyReassignments = await prisma.coverDutyReassignment.findMany({
      where: {
        coverEmployeeLeaveId: leave.id,
        status: 'PENDING',
      },
    });

    // If there are covering duty conflicts, notify HR Head for reassignment
    if (coverDutyReassignments.length > 0) {
      // Get HR Head
      const hrHead = await prisma.user.findFirst({
        where: {
          role: 'ADMIN',
          adminType: 'HR_HEAD',
          isActive: true,
        },
      });

      if (hrHead) {
        // Fetch details of affected leaves
        const affectedLeaveIds = coverDutyReassignments.map(r => r.originalLeaveId);
        const affectedLeaves = await prisma.leave.findMany({
          where: {
            id: { in: affectedLeaveIds },
          },
          include: {
            employee: {
              select: {
                firstName: true,
                lastName: true,
                employeeId: true,
              },
            },
          },
        });

        const affectedEmployeesList = affectedLeaves.map(
          l => `${l.employee.firstName} ${l.employee.lastName} (${new Date(l.startDate).toLocaleDateString()} - ${new Date(l.endDate).toLocaleDateString()})`
        ).join(', ');

        // Notify HR Head about duty reassignment needed
        await prisma.notification.create({
          data: {
            userId: hrHead.id,
            type: 'DUTY_REASSIGNMENT_REQUIRED',
            title: '🔄 Duty Reassignment Required',
            message: `${employee?.firstName} ${employee?.lastName}'s ${leave.leaveType.toLowerCase()} leave has been approved. They were covering for: ${affectedEmployeesList}. Please assign new cover employees.`,
            senderId: body.adminId,
            relatedId: leave.id,
            isPinned: true,
          },
        });
      }
    }

    // Send emails to all parties (don't wait for completion)
    if (employee) {
      const leaveTypeMap: any = {
        ANNUAL: 'Annual Leave',
        CASUAL: 'Casual Leave',
        MEDICAL: 'Medical Leave',
        BUSINESS: 'Business Leave',
        OFFICIAL: 'Official Leave',
      };

      const emailData = {
        employeeName: `${employee.firstName} ${employee.lastName}`,
        employeeEmail: employee.email,
        leaveType: leaveTypeMap[leave.leaveType] || leave.leaveType,
        startDate: new Date(leave.startDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        endDate: new Date(leave.endDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        totalDays: leave.totalDays,
        reason: leave.reason,
        adminResponse: body.adminResponse || undefined,
        coverEmployeeName: coverEmployee
          ? `${coverEmployee.firstName} ${coverEmployee.lastName}`
          : undefined,
        coverEmployeeEmail: coverEmployee?.email || undefined,
      };

      // Send emails asynchronously (don't block the response)
      sendLeaveApprovalEmails(emailData)
        .then((results) => {
          console.log('Leave approval emails sent:', results);
        })
        .catch((error) => {
          console.error('Error sending leave approval emails:', error);
        });
    }

    return NextResponse.json({
      success: true,
      leave,
      dutyReassignmentRequired: coverDutyReassignments.length > 0,
      affectedCount: coverDutyReassignments.length,
    });
  } catch (error: any) {
    console.error('Error approving leave:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve leave' },
      { status: 500 }
    );
  }
}
