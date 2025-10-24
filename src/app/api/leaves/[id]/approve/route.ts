// src/app/api/leaves/[id]/approve/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    return NextResponse.json({ success: true, leave });
  } catch (error: any) {
    console.error('Error approving leave:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve leave' },
      { status: 500 }
    );
  }
}
