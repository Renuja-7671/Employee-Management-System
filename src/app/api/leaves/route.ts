// src/app/api/leaves/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cleanupExpiredCoverRequests, hasExpiredCoverRequests } from '@/lib/cleanup-expired-covers';
import { getDisplayName, getCoverEmployeeCallingName } from '@/lib/user-utils';

export async function GET(request: NextRequest) {
  try {
    // Lazy cleanup: Remove expired cover requests before fetching leaves
    if (await hasExpiredCoverRequests()) {
      await cleanupExpiredCoverRequests();
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const employeeId = searchParams.get('employeeId');
    const coverEmployeeId = searchParams.get('coverEmployeeId');
    const status = searchParams.get('status');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const usePagination = pageParam !== null || limitParam !== null;
    const page = Math.max(1, parseInt(pageParam || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '10', 10)));

    // Build where clause
    const where: any = {};

    // Filter by employee if provided
    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (coverEmployeeId) {
      where.coverEmployeeId = coverEmployeeId;
    }

    if (status) {
      where.status = status;
    }

    // Filter by date range if provided
    if (startDate && endDate) {
      where.OR = [
        {
          // Leave starts within the date range
          AND: [
            { startDate: { gte: new Date(startDate) } },
            { startDate: { lte: new Date(endDate) } },
          ],
        },
        {
          // Leave ends within the date range
          AND: [
            { endDate: { gte: new Date(startDate) } },
            { endDate: { lte: new Date(endDate) } },
          ],
        },
        {
          // Leave spans the entire date range
          AND: [
            { startDate: { lte: new Date(startDate) } },
            { endDate: { gte: new Date(endDate) } },
          ],
        },
      ];
    }

    let totalCount: number | undefined;
    if (usePagination) {
      totalCount = await prisma.leave.count({ where });
    }

    const leaves = await prisma.leave.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            callingName: true,
            fullName: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
          },
        },
        coverEmployee: {
          select: {
            id: true,
            callingName: true,
            fullName: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
        CoverRequest: {
          select: {
            status: true,
            expiresAt: true,
            coverEmployeeId: true,
            User: {
              select: {
                id: true,
                callingName: true,
                fullName: true,
                firstName: true,
                lastName: true,
                employeeId: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      ...(usePagination
        ? {
            skip: (page - 1) * limit,
            take: limit,
          }
        : {}),
    });

    // Filter out leaves with expired cover requests (PENDING_COVER status with expired CoverRequest)
    const activeLeaves = leaves.filter((leave) => {
      // If leave has a cover request
      if (leave.CoverRequest) {
        // If cover request is PENDING and expired, filter it out
        if (
          leave.CoverRequest.status === 'PENDING' &&
          new Date() > leave.CoverRequest.expiresAt
        ) {
          return false; // Don't show expired requests
        }
      }
      return true; // Show all other leaves
    });

    // Skip expensive cover-duty enrichment for paginated employee requests
    const leavesWithCoverInfo = usePagination
      ? activeLeaves
      : await Promise.all(
          activeLeaves.map(async (leave) => {
            // Find all approved leaves where this employee is the cover employee
            // and the dates overlap with this leave request
            const coveringDuties = await prisma.leave.findMany({
              where: {
                coverEmployeeId: leave.employeeId,
                status: 'APPROVED',
                id: { not: leave.id }, // Exclude the current leave
                OR: [
                  {
                    // This leave request starts during an existing covering period
                    AND: [
                      { startDate: { lte: leave.startDate } },
                      { endDate: { gte: leave.startDate } },
                    ],
                  },
                  {
                    // This leave request ends during an existing covering period
                    AND: [
                      { startDate: { lte: leave.endDate } },
                      { endDate: { gte: leave.endDate } },
                    ],
                  },
                  {
                    // This leave request completely encompasses an existing covering period
                    AND: [
                      { startDate: { gte: leave.startDate } },
                      { endDate: { lte: leave.endDate } },
                    ],
                  },
                ],
              },
              include: {
                employee: {
                  select: {
                    firstName: true,
                    lastName: true,
                    employeeId: true,
                  },
                },
              },
            });

            return {
              ...leave,
              coveringDuties: coveringDuties.map((duty) => ({
                employeeName: `${duty.employee.firstName} ${duty.employee.lastName}`,
                employeeId: duty.employee.employeeId,
                startDate: duty.startDate,
                endDate: duty.endDate,
                leaveType: duty.leaveType,
                totalDays: duty.totalDays,
              })),
            };
          })
        );

    // Resolve cover employee callingName: Leave.coverEmployeeId → User.callingName
    const coverEmployeeIds = [
      ...new Set(
        leavesWithCoverInfo
          .map((leave) => leave.coverEmployeeId)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const coverUsersById = new Map<string, { id: string; callingName: string | null }>();

    if (coverEmployeeIds.length > 0) {
      const coverUsers = await prisma.user.findMany({
        where: { id: { in: coverEmployeeIds } },
        select: {
          id: true,
          callingName: true,
        },
      });
      coverUsers.forEach((user) => coverUsersById.set(user.id, user));
    }

    const leavesResponse = leavesWithCoverInfo.map((leave) => {
      const coverUser = leave.coverEmployeeId
        ? coverUsersById.get(leave.coverEmployeeId) ??
          (leave.coverEmployee
            ? { id: leave.coverEmployee.id, callingName: leave.coverEmployee.callingName }
            : null)
        : null;

      return {
        ...leave,
        coverEmployeeName: getCoverEmployeeCallingName(leave.coverEmployeeId, coverUser),
        employeeName: getDisplayName(leave.employee),
      };
    });

    return NextResponse.json({
      leaves: leavesResponse,
      ...(usePagination && {
        pagination: {
          page,
          limit,
          totalCount: totalCount ?? 0,
          totalPages: Math.max(1, Math.ceil((totalCount ?? 0) / limit)),
        },
      }),
    });
  } catch (error) {
    console.error('Error fetching leaves:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaves' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.employeeId || !body.leaveType || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const leave = await prisma.leave.create({
      data: {
        employeeId: body.employeeId,
        leaveType: body.leaveType,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        totalDays: body.totalDays,
        reason: body.reason,
        status: body.status || 'PENDING_COVER',
        coverEmployeeId: body.coverEmployeeId,
        medicalCertPath: body.medicalCertPath,
        isCancelled: false,
      },
    });

    return NextResponse.json({ leave }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating leave:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create leave' },
      { status: 500 }
    );
  }
}
