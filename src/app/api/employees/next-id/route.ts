// src/app/api/employees/next-id/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get all users with EMPLOYEE role to check employee IDs
    const allEmployees = await prisma.user.findMany({
      where: {
        role: 'EMPLOYEE',
      },
      select: {
        employeeId: true,
      },
      orderBy: {
        employeeId: 'desc',
      },
    });

    if (allEmployees.length === 0) {
      // First employee
      return NextResponse.json({ nextId: 'EMP001' });
    }

    // Extract numeric parts from employee IDs that start with "EMP"
    const numericIds = allEmployees
      .map((user) => {
        if (!user.employeeId || !user.employeeId.startsWith('EMP')) return 0;
        // Extract numbers from employee ID (e.g., "EMP001" -> 1, "EMP007" -> 7)
        const numericPart = user.employeeId.replace('EMP', '');
        const parsed = parseInt(numericPart, 10);
        return isNaN(parsed) ? 0 : parsed;
      })
      .filter((id) => id > 0);

    // Find the highest ID
    const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;

    // Generate next ID
    const nextIdNumber = maxId + 1;
    const nextId = `EMP${String(nextIdNumber).padStart(3, '0')}`;

    return NextResponse.json({ nextId });
  } catch (error) {
    console.error('Error generating next employee ID:', error);
    return NextResponse.json(
      { error: 'Failed to generate next employee ID' },
      { status: 500 }
    );
  }
}
