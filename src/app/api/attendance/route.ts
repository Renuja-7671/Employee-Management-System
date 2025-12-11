// src/app/api/attendance/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const employeeId = searchParams.get('employeeId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '100');

    const where: any = {};

    // Filter by employeeId if provided (for employee portal)
    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Get total count for pagination
    const totalCount = await prisma.attendance.count({ where });

    // Fetch attendance with pagination
    const attendance = await prisma.attendance.findMany({
      where,
      orderBy: {
        date: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      attendance,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.employeeId || !body.date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId: body.employeeId,
        date: new Date(body.date),
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        status: body.status || 'PRESENT',
        isWeekend: body.isWeekend || false,
        notes: body.notes,
      },
    });

    return NextResponse.json({ attendance }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating attendance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create attendance' },
      { status: 500 }
    );
  }
}
