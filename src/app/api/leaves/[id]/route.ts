// src/app/api/leaves/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  leaveBalanceFieldForType,
  shouldRestoreBalanceOnDelete,
} from '@/lib/leave-balance-utils';
import { getDisplayName } from '@/lib/user-utils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const adminId = body.adminId as string | undefined;

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, role: true },
    });

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Only admins can delete leave requests' },
        { status: 403 }
      );
    }

    const leave = await prisma.leave.findUnique({
      where: { id },
      include: {
        employee: {
          select: { callingName: true, firstName: true, lastName: true },
        },
      },
    });

    if (!leave) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    }

    const restoreBalance = shouldRestoreBalanceOnDelete(leave.status, leave.leaveType);
    const balanceField = leaveBalanceFieldForType(leave.leaveType);
    const daysToRestore = Number(leave.totalDays) || 0;

    await prisma.$transaction(async (tx) => {
      // Remove cover-duty reassignment records referencing this leave
      await tx.coverDutyReassignment.deleteMany({
        where: {
          OR: [
            { originalLeaveId: id },
            { coverEmployeeLeaveId: id },
          ],
        },
      });

      // CoverRequest cascades on leave delete; restore balance before delete
      if (restoreBalance && balanceField && daysToRestore > 0) {
        const existingBalance = await tx.leaveBalance.findUnique({
          where: { employeeId: leave.employeeId },
        });

        if (existingBalance) {
          await tx.leaveBalance.update({
            where: { employeeId: leave.employeeId },
            data: {
              [balanceField]: { increment: daysToRestore },
            },
          });
        }
      }

      await tx.leave.delete({ where: { id } });
    });

    await prisma.notification.create({
      data: {
        userId: leave.employeeId,
        type: 'LEAVE_CANCELLED',
        title: 'Leave Record Removed',
        message: `An administrator removed your ${leave.leaveType.toLowerCase()} leave (${daysToRestore} day(s), ${new Date(leave.startDate).toLocaleDateString()} – ${new Date(leave.endDate).toLocaleDateString()}).${
          restoreBalance && balanceField
            ? ' Your leave balance has been restored.'
            : ''
        }`,
        senderId: adminId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Leave deleted successfully',
      balanceRestored: restoreBalance && !!balanceField,
      daysRestored: restoreBalance ? daysToRestore : 0,
      employeeName: getDisplayName(leave.employee),
    });
  } catch (error) {
    console.error('[DELETE LEAVE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete leave request' },
      { status: 500 }
    );
  }
}
