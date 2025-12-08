import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Get available employees for cover duty reassignment
 * Calculates availability based on current leaves, covering duties, and workload
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const excludeEmployeeId = searchParams.get('excludeEmployeeId');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all active employees
    const allEmployees = await prisma.user.findMany({
      where: {
        isActive: true,
        role: 'EMPLOYEE',
        ...(excludeEmployeeId && { id: { not: excludeEmployeeId } }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        department: true,
      },
    });

    // Get employees who are on leave during this period
    const employeesOnLeave = await prisma.leave.findMany({
      where: {
        status: 'APPROVED',
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } },
            ],
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } },
            ],
          },
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } },
            ],
          },
        ],
      },
      select: {
        employeeId: true,
      },
    });

    const onLeaveIds = new Set(employeesOnLeave.map((l) => l.employeeId));

    // Get current covering duties count for each employee
    const coveringCounts = await prisma.leave.groupBy({
      by: ['coverEmployeeId'],
      where: {
        coverEmployeeId: { not: null },
        status: 'APPROVED',
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } },
            ],
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } },
            ],
          },
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } },
            ],
          },
        ],
      },
      _count: {
        id: true,
      },
    });

    const coveringCountMap = new Map(
      coveringCounts.map((c) => [c.coverEmployeeId!, c._count.id])
    );

    // Calculate availability and workload for each employee
    const availableEmployees = allEmployees.map((emp) => {
      const coveringCount = coveringCountMap.get(emp.id) || 0;
      const isOnLeave = onLeaveIds.has(emp.id);

      // Workload score: higher number = more busy
      const workloadScore = coveringCount * 2 + (isOnLeave ? 10 : 0);

      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        employeeId: emp.employeeId,
        department: emp.department,
        currentWorkload: coveringCount,
        onLeave: isOnLeave,
        coveringCount: coveringCount,
        workloadScore,
        available: !isOnLeave, // Available if not on leave
      };
    });

    // Sort by availability (available first), then by workload (least busy first)
    availableEmployees.sort((a, b) => {
      // Available employees first
      if (a.available !== b.available) {
        return a.available ? -1 : 1;
      }
      // Then sort by workload (lower is better)
      if (a.workloadScore !== b.workloadScore) {
        return a.workloadScore - b.workloadScore;
      }
      // Finally sort alphabetically
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      availableEmployees,
      total: availableEmployees.length,
      availableCount: availableEmployees.filter((e) => e.available).length,
    });
  } catch (error) {
    console.error('Error fetching available employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available employees' },
      { status: 500 }
    );
  }
}
