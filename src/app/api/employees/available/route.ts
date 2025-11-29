// src/app/api/employees/available/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const currentUserId = searchParams.get('userId');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Get all employees except the current user
    const allEmployees = await prisma.user.findMany({
      where: {
        role: 'EMPLOYEE',
        isActive: true,
        ...(currentUserId && { id: { not: currentUserId } }),
      },
      select: {
        id: true,
        email: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        department: true,
        position: true,
      },
    });

    // Get employees who have approved leaves during the requested period
    const employeesOnLeave = await prisma.leave.findMany({
      where: {
        status: 'APPROVED',
        OR: [
          // Leave that starts during the requested period
          {
            startDate: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
          // Leave that ends during the requested period
          {
            endDate: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
          // Leave that spans the entire requested period
          {
            AND: [
              {
                startDate: {
                  lte: new Date(startDate),
                },
              },
              {
                endDate: {
                  gte: new Date(endDate),
                },
              },
            ],
          },
        ],
      },
      select: {
        employeeId: true,
      },
    });

    // Get IDs of employees on leave
    const employeeIdsOnLeave = new Set(
      employeesOnLeave.map((leave) => leave.employeeId)
    );

    // Filter out employees who are on leave
    const availableEmployees = allEmployees.filter(
      (employee) => !employeeIdsOnLeave.has(employee.id)
    );

    return NextResponse.json({ employees: availableEmployees });
  } catch (error) {
    console.error('Error fetching available employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available employees' },
      { status: 500 }
    );
  }
}
