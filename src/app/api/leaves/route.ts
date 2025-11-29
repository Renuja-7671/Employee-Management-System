// src/app/api/leaves/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const leaves = await prisma.leave.findMany({
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
          },
        },
        coverEmployee: {
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

    // For each leave request, check if the employee is serving as a cover employee
    const leavesWithCoverInfo = await Promise.all(
      leaves.map(async (leave) => {
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

    return NextResponse.json({ leaves: leavesWithCoverInfo });
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
