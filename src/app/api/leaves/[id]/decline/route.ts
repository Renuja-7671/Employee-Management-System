// src/app/api/leaves/[id]/decline/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendLeaveRejectionEmails } from '@/lib/leave-emails';

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
        { error: 'Unauthorized: Only admins can decline leaves' },
        { status: 403 }
      );
    }

    // Only Managing Director can decline leaves
    if (admin.adminType !== 'MANAGING_DIRECTOR') {
      return NextResponse.json(
        { error: 'Only Managing Director can decline leave requests' },
        { status: 403 }
      );
    }

    if (!body.adminResponse) {
      return NextResponse.json(
        { error: 'Admin response is required for declining' },
        { status: 400 }
      );
    }

    const leave = await prisma.leave.update({
      where: { id },
      data: {
        status: 'DECLINED',
        adminResponse: body.adminResponse,
      },
    });

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
        type: 'LEAVE_DECLINED',
        title: '❌ Leave Declined',
        message: `You declined ${employee?.firstName} ${employee?.lastName}'s leave request for ${leave.totalDays} day(s).`,
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
        adminResponse: body.adminResponse,
        coverEmployeeName: coverEmployee
          ? `${coverEmployee.firstName} ${coverEmployee.lastName}`
          : undefined,
        coverEmployeeEmail: coverEmployee?.email || undefined,
      };

      // Send emails asynchronously (don't block the response)
      sendLeaveRejectionEmails(emailData)
        .then((results) => {
          console.log('Leave rejection emails sent:', results);
        })
        .catch((error) => {
          console.error('Error sending leave rejection emails:', error);
        });
    }

    return NextResponse.json({ success: true, leave });
  } catch (error: any) {
    console.error('Error declining leave:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to decline leave' },
      { status: 500 }
    );
  }
}
