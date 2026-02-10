// src/app/api/leaves/export-official/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/leaves/export-official
 * Export official leaves as CSV
 * Query parameters:
 * - startDate: Start date (YYYY-MM-DD)
 * - endDate: End date (YYYY-MM-DD)
 * - employeeId: Optional employee ID to filter
 * - status: Optional status to filter (PENDING_ADMIN, APPROVED, DECLINED, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');

    // Build where clause
    const where: any = {
      leaveType: 'OFFICIAL', // Only official leaves
    };

    // Add date filters if provided
    if (startDate && endDate) {
      where.OR = [
        {
          startDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        {
          endDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        {
          AND: [
            { startDate: { lte: new Date(startDate) } },
            { endDate: { gte: new Date(endDate) } },
          ],
        },
      ];
    }

    // Add employee filter if provided
    if (employeeId && employeeId !== 'all') {
      where.employeeId = employeeId;
    }

    // Add status filter if provided
    if (status && status !== 'all') {
      where.status = status;
    }

    // Fetch official leaves
    const leaves = await prisma.leave.findMany({
      where,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (leaves.length === 0) {
      return NextResponse.json(
        { error: 'No official leaves found for the specified criteria' },
        { status: 404 }
      );
    }

    // Generate CSV content
    const headers = [
      'Employee Name',
      'Employee ID',
      'Leave Type',
      'Start Date',
      'End Date',
      'Total Days',
      'Half Day Type',
      'Status',
      'Applied Date',
      'Reason',
    ];

    const rows = leaves.map((leave) => {
      const employeeName = `${leave.employee.firstName} ${leave.employee.lastName}`;
      const employeeIdStr = leave.employee.employeeId;
      const startDateStr = new Date(leave.startDate).toISOString().split('T')[0];
      const endDateStr = new Date(leave.endDate).toISOString().split('T')[0];
      const appliedDate = new Date(leave.createdAt).toLocaleDateString();
      
      // Format half-day type for display
      let halfDayDisplay = 'N/A';
      if (leave.halfDayType === 'FIRST_HALF') {
        halfDayDisplay = 'First Half';
      } else if (leave.halfDayType === 'SECOND_HALF') {
        halfDayDisplay = 'Second Half';
      }

      return [
        employeeName,
        employeeIdStr,
        leave.leaveType,
        startDateStr,
        endDateStr,
        leave.totalDays.toString(),
        halfDayDisplay,
        leave.status,
        appliedDate,
        leave.reason || 'N/A',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `official_leaves_${dateStr}.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting official leaves:', error);
    return NextResponse.json(
      { error: 'Failed to export official leaves' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/leaves/export-official (without query params)
 * Returns API documentation
 */
export async function OPTIONS() {
  return NextResponse.json({
    endpoint: '/api/leaves/export-official',
    method: 'GET',
    description: 'Export official leaves as CSV file',
    queryParameters: {
      startDate: 'Start date in YYYY-MM-DD format',
      endDate: 'End date in YYYY-MM-DD format',
      employeeId: 'Optional: Filter by specific employee ID',
      status: 'Optional: Filter by status (PENDING_ADMIN, APPROVED, DECLINED, etc.)',
    },
    example: '/api/leaves/export-official?startDate=2026-01-01&endDate=2026-01-31',
  });
}
