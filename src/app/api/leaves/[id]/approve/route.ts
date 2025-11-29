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

    // Deduct leave balance only for annual and casual leaves (medical and official are unlimited)
    if (leave.leaveType === 'ANNUAL' || leave.leaveType === 'CASUAL') {
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
            medical: 0,
            official: 0,
          },
        });
      }

      // Deduct the leave days from the appropriate balance
      const fieldToUpdate = leave.leaveType === 'ANNUAL' ? 'annual' : 'casual';
      const currentBalance = leave.leaveType === 'ANNUAL' ? leaveBalance.annual : leaveBalance.casual;
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
    await prisma.notification.create({
      data: {
        userId: body.adminId,
        type: 'LEAVE_APPROVED',
        title: '✅ Leave Approved',
        message: `You approved ${employee?.firstName} ${employee?.lastName}'s leave request for ${leave.totalDays} day(s).`,
      },
    });

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

    return NextResponse.json({ success: true, leave });
  } catch (error: any) {
    console.error('Error approving leave:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve leave' },
      { status: 500 }
    );
  }
}
