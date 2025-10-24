// src/app/api/leaves/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const leaves = await prisma.leave.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ leaves });
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
