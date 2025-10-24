import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leaveId, userId } = body;

    if (!leaveId || !userId) {
      return NextResponse.json(
        { error: 'Leave ID and User ID are required' },
        { status: 400 }
      );
    }

    // Verify the leave belongs to the user
    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
      select: {
        id: true,
        employeeId: true,
        status: true,
        coverEmployeeId: true,
      },
    });

    if (!leave) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    if (leave.employeeId !== userId) {
      return NextResponse.json(
        { error: 'You are not authorized to cancel this leave request' },
        { status: 403 }
      );
    }

    // Only allow cancellation of pending leaves
    if (leave.status !== 'PENDING_COVER' && leave.status !== 'PENDING_ADMIN') {
      return NextResponse.json(
        { error: 'Only pending leave requests can be cancelled' },
        { status: 400 }
      );
    }

    // Update leave status to CANCELLED
    const updatedLeave = await prisma.leave.update({
      where: { id: leaveId },
      data: {
        status: 'CANCELLED',
        isCancelled: true,
      },
    });

    // Create notification for cover employee if applicable
    if (leave.coverEmployeeId) {
      await prisma.notification.create({
        data: {
          userId: leave.coverEmployeeId,
          type: 'LEAVE_CANCELLED',
          title: 'Leave Request Cancelled',
          message: 'A leave request you were covering has been cancelled',
          relatedId: updatedLeave.id,
        },
      });
    }

    return NextResponse.json({
      message: 'Leave request cancelled successfully',
      leave: updatedLeave,
    });
  } catch (error) {
    console.error('Error cancelling leave:', error);
    return NextResponse.json(
      { error: 'Failed to cancel leave request' },
      { status: 500 }
    );
  }
}
