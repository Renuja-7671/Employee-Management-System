import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leaveId, userId, approved, reason } = body;

    if (!leaveId || !userId || approved === undefined) {
      return NextResponse.json(
        { error: 'Leave ID, User ID, and approval status are required' },
        { status: 400 }
      );
    }

    // If declining, reason is required
    if (!approved && !reason) {
      return NextResponse.json(
        { error: 'Reason is required when declining a cover request' },
        { status: 400 }
      );
    }

    // Fetch the leave and cover request
    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
      include: {
        CoverRequest: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!leave) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    // Verify the user is the cover employee
    if (leave.coverEmployeeId !== userId) {
      return NextResponse.json(
        { error: 'You are not authorized to respond to this cover request' },
        { status: 403 }
      );
    }

    // Check if leave is in PENDING_COVER status
    if (leave.status !== 'PENDING_COVER') {
      return NextResponse.json(
        { error: 'This leave request is not pending cover approval' },
        { status: 400 }
      );
    }

    // Check if cover request exists and is pending
    if (!leave.CoverRequest || leave.CoverRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Cover request not found or already responded to' },
        { status: 400 }
      );
    }

    // Check if cover request has expired
    if (new Date() > leave.CoverRequest.expiresAt) {
      return NextResponse.json(
        { 
          error: 'This cover request has expired (24-hour limit exceeded). You are no longer assigned to cover this leave and are now available for other cover requests.',
          expired: true
        },
        { status: 400 }
      );
    }

    // Get cover employee info for notification
    const coverEmployee = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    if (approved) {
      // APPROVED: Update cover request status to ACCEPTED
      await prisma.coverRequest.update({
        where: { id: leave.CoverRequest.id },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
          responseMessage: 'Cover request accepted',
        },
      });

      // Update leave status to PENDING_ADMIN
      await prisma.leave.update({
        where: { id: leaveId },
        data: {
          status: 'PENDING_ADMIN',
        },
      });

      // Create notification for employee
      await prisma.notification.create({
        data: {
          userId: leave.employeeId,
          type: 'COVER_ACCEPTED',
          title: 'Cover Request Accepted',
          message: `${coverEmployee?.firstName} ${coverEmployee?.lastName} has accepted to cover your leave. Your request is now pending admin approval.`,
          senderId: userId,
          relatedId: leaveId,
        },
      });

      return NextResponse.json({
        message: 'Cover request accepted successfully',
        status: 'PENDING_ADMIN',
      });
    } else {
      // DECLINED: Update cover request status to DECLINED
      await prisma.coverRequest.update({
        where: { id: leave.CoverRequest.id },
        data: {
          status: 'DECLINED',
          respondedAt: new Date(),
          responseMessage: reason,
        },
      });

      // Update leave status to DECLINED (cover declined)
      await prisma.leave.update({
        where: { id: leaveId },
        data: {
          status: 'DECLINED',
          adminResponse: `Cover employee declined: ${reason}`,
        },
      });

      // Create notification for employee
      await prisma.notification.create({
        data: {
          userId: leave.employeeId,
          type: 'COVER_DECLINED',
          title: 'Cover Request Declined',
          message: `${coverEmployee?.firstName} ${coverEmployee?.lastName} declined to cover your leave. Reason: ${reason}`,
          senderId: userId,
          relatedId: leaveId,
        },
      });

      return NextResponse.json({
        message: 'Cover request declined',
        status: 'DECLINED',
      });
    }
  } catch (error) {
    console.error('Error responding to cover request:', error);
    return NextResponse.json(
      { error: 'Failed to respond to cover request' },
      { status: 500 }
    );
  }
}
