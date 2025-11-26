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

    // Deduct leave balance only for annual and casual leaves (medical is unlimited)
    if (leave.leaveType === 'ANNUAL' || leave.leaveType === 'CASUAL') {
      const currentYear = new Date().getFullYear();

      // Find or create leave balance
      let leaveBalance = await prisma.leaveBalance.findFirst({
        where: {
          employeeId: leave.employeeId,
          year: currentYear,
        },
      });

      if (!leaveBalance) {
        // Create default leave balance if it doesn't exist
        leaveBalance = await prisma.leaveBalance.create({
          data: {
            employeeId: leave.employeeId,
            year: currentYear,
            annual: 14,
            casual: 7,
            medical: 0,
            business: 0,
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

    // Send emails to all parties (don't wait for completion)
    if (employee) {
      const leaveTypeMap: any = {
        ANNUAL: 'Annual Leave',
        CASUAL: 'Casual Leave',
        MEDICAL: 'Medical Leave',
        BUSINESS: 'Business Leave',
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
