import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch pending cover requests where the user is the cover employee
    const coverRequests = await prisma.coverRequest.findMany({
      where: {
        coverEmployeeId: userId,
        status: 'PENDING',
      },
      include: {
        Leave: {
          include: {
            employee: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    // Transform the data for frontend consumption
    const formattedRequests = coverRequests.map((request) => {
      const leave = request.Leave;
      const employee = leave.employee;

      // Calculate total days
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      return {
        id: leave.id,
        coverRequestId: request.id,
        leaveType: leave.leaveType.toLowerCase(),
        startDate: leave.startDate.toISOString(),
        endDate: leave.endDate.toISOString(),
        days,
        reason: leave.reason,
        medicalCertUrl: leave.medicalCertPath || null,
        requesterName: `${employee.firstName} ${employee.lastName}`,
        requesterEmployeeId: employee.employeeId,
        requesterEmail: employee.email,
        requesterId: employee.id,
        requesterProfilePictureUrl: null, // Can be populated from profile pictures later
        createdAt: request.requestedAt.toISOString(),
        expiresAt: request.expiresAt.toISOString(),
      };
    });

    return NextResponse.json({
      coverRequests: formattedRequests,
      count: formattedRequests.length,
    });
  } catch (error) {
    console.error('Error fetching cover requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cover requests' },
      { status: 500 }
    );
  }
}
