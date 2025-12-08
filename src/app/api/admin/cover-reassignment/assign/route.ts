import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Assign new cover employee for a duty reassignment
 * Only HR Head can perform this action
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reassignmentId, newCoverEmployeeId, hrHeadId } = body;

    // Validate required fields
    if (!reassignmentId || !newCoverEmployeeId || !hrHeadId) {
      return NextResponse.json(
        { error: 'Missing required fields: reassignmentId, newCoverEmployeeId, hrHeadId' },
        { status: 400 }
      );
    }

    // Verify HR Head authorization
    const hrHead = await prisma.user.findUnique({
      where: { id: hrHeadId },
      select: {
        id: true,
        role: true,
        adminType: true,
        firstName: true,
        lastName: true,
      },
    } as any);

    if (!hrHead || hrHead.role !== 'ADMIN' || hrHead.adminType !== 'HR_HEAD') {
      return NextResponse.json(
        { error: 'Unauthorized: Only HR Head can reassign cover duties' },
        { status: 403 }
      );
    }

    // Get the reassignment record
    const reassignment = await prisma.coverDutyReassignment.findUnique({
      where: { id: reassignmentId },
    });

    if (!reassignment) {
      return NextResponse.json(
        { error: 'Reassignment record not found' },
        { status: 404 }
      );
    }

    if (reassignment.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This reassignment has already been processed' },
        { status: 400 }
      );
    }

    // Get the original leave that needs a new cover
    const originalLeave = await prisma.leave.findUnique({
      where: { id: reassignment.originalLeaveId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!originalLeave) {
      return NextResponse.json(
        { error: 'Original leave not found' },
        { status: 404 }
      );
    }

    // Get the new cover employee details
    const newCoverEmployee = await prisma.user.findUnique({
      where: { id: newCoverEmployeeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!newCoverEmployee) {
      return NextResponse.json(
        { error: 'New cover employee not found' },
        { status: 404 }
      );
    }

    // Check if new cover employee is available during the leave period
    const conflictingLeave = await prisma.leave.findFirst({
      where: {
        employeeId: newCoverEmployeeId,
        status: 'APPROVED',
        OR: [
          {
            AND: [
              { startDate: { lte: originalLeave.startDate } },
              { endDate: { gte: originalLeave.startDate } },
            ],
          },
          {
            AND: [
              { startDate: { lte: originalLeave.endDate } },
              { endDate: { gte: originalLeave.endDate } },
            ],
          },
          {
            AND: [
              { startDate: { gte: originalLeave.startDate } },
              { endDate: { lte: originalLeave.endDate } },
            ],
          },
        ],
      },
    });

    if (conflictingLeave) {
      return NextResponse.json(
        {
          error: `${newCoverEmployee.firstName} ${newCoverEmployee.lastName} is on leave during this period and cannot be assigned as cover`,
        },
        { status: 400 }
      );
    }

    // Update the original leave with new cover employee
    const updatedLeave = await prisma.leave.update({
      where: { id: originalLeave.id },
      data: {
        coverEmployeeId: newCoverEmployeeId,
      },
    });

    // Update the reassignment record
    const updatedReassignment = await prisma.coverDutyReassignment.update({
      where: { id: reassignmentId },
      data: {
        newCoverEmployeeId,
        reassignedBy: hrHeadId,
        status: 'REASSIGNED',
      },
    });

    // Notify the new cover employee
    await prisma.notification.create({
      data: {
        userId: newCoverEmployeeId,
        type: 'COVER_REQUEST',
        title: '🔄 Cover Duty Assigned',
        message: `You have been assigned to cover for ${originalLeave.employee.firstName} ${originalLeave.employee.lastName}'s ${originalLeave.leaveType.toLowerCase()} leave from ${new Date(originalLeave.startDate).toLocaleDateString()} to ${new Date(originalLeave.endDate).toLocaleDateString()}. This was reassigned by HR.`,
        senderId: hrHeadId,
        relatedId: originalLeave.id,
      },
    });

    // Notify the original employee about the new cover
    await prisma.notification.create({
      data: {
        userId: originalLeave.employeeId,
        type: 'SYSTEM_ALERT',
        title: '🔄 Cover Employee Updated',
        message: `Your cover employee has been changed to ${newCoverEmployee.firstName} ${newCoverEmployee.lastName} for your leave from ${new Date(originalLeave.startDate).toLocaleDateString()} to ${new Date(originalLeave.endDate).toLocaleDateString()}.`,
        senderId: hrHeadId,
        relatedId: originalLeave.id,
      },
    });

    // Notify Managing Director about the reassignment
    const managingDirector = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
        adminType: 'MANAGING_DIRECTOR',
        isActive: true,
      },
    });

    if (managingDirector) {
      await prisma.notification.create({
        data: {
          userId: managingDirector.id,
          type: 'SYSTEM_ALERT',
          title: '✅ Cover Duty Reassigned',
          message: `${hrHead.firstName} ${hrHead.lastName} assigned ${newCoverEmployee.firstName} ${newCoverEmployee.lastName} to cover for ${originalLeave.employee.firstName} ${originalLeave.employee.lastName}'s leave (${new Date(originalLeave.startDate).toLocaleDateString()} - ${new Date(originalLeave.endDate).toLocaleDateString()}).`,
          senderId: hrHeadId,
          relatedId: originalLeave.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Cover duty reassigned successfully',
      updatedLeave,
      reassignment: updatedReassignment,
    });
  } catch (error: any) {
    console.error('Error reassigning cover duty:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reassign cover duty' },
      { status: 500 }
    );
  }
}

/**
 * Get all pending reassignments for HR Head
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hrHeadId = searchParams.get('hrHeadId');

    if (!hrHeadId) {
      return NextResponse.json(
        { error: 'HR Head ID is required' },
        { status: 400 }
      );
    }

    // Verify HR Head authorization
    const hrHead = await prisma.user.findUnique({
      where: { id: hrHeadId },
      select: {
        role: true,
        adminType: true,
      },
    } as any);

    if (!hrHead || hrHead.role !== 'ADMIN' || hrHead.adminType !== 'HR_HEAD') {
      return NextResponse.json(
        { error: 'Unauthorized: Only HR Head can view reassignments' },
        { status: 403 }
      );
    }

    // Get all pending reassignments
    const pendingReassignments = await prisma.coverDutyReassignment.findMany({
      where: {
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch related leave details
    const reassignmentsWithDetails = await Promise.all(
      pendingReassignments.map(async (reassignment) => {
        const originalLeave = await prisma.leave.findUnique({
          where: { id: reassignment.originalLeaveId },
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

        const coverEmployeeLeave = await prisma.leave.findUnique({
          where: { id: reassignment.coverEmployeeLeaveId },
          include: {
            employee: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        return {
          ...reassignment,
          originalLeave,
          coverEmployeeLeave,
        };
      })
    );

    return NextResponse.json({
      reassignments: reassignmentsWithDetails,
      total: reassignmentsWithDetails.length,
    });
  } catch (error) {
    console.error('Error fetching reassignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reassignments' },
      { status: 500 }
    );
  }
}
