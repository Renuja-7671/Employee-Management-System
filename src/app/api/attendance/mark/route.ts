// src/app/api/attendance/mark/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.employeeId || !body.date) {
      return NextResponse.json(
        { error: 'Missing required fields: employeeId and date are required' },
        { status: 400 }
      );
    }

    // Parse the date and time values
    const attendanceDate = new Date(body.date);

    // Convert time strings (HH:MM) to DateTime
    let checkInDateTime = null;
    let checkOutDateTime = null;

    if (body.checkIn) {
      const [hours, minutes] = body.checkIn.split(':');
      checkInDateTime = new Date(attendanceDate);
      checkInDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }

    if (body.checkOut) {
      const [hours, minutes] = body.checkOut.split(':');
      checkOutDateTime = new Date(attendanceDate);
      checkOutDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }

    // Calculate work hours
    let workHours = null;
    if (checkInDateTime && checkOutDateTime) {
      const diffMs = checkOutDateTime.getTime() - checkInDateTime.getTime();
      workHours = diffMs / (1000 * 60 * 60); // Convert to hours
    }

    // Check if attendance record already exists for this date
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: body.employeeId,
          date: attendanceDate,
        },
      },
    });

    let attendance;

    if (existingAttendance) {
      // Update existing record
      attendance = await prisma.attendance.update({
        where: {
          id: existingAttendance.id,
        },
        data: {
          checkIn: checkInDateTime,
          checkOut: checkOutDateTime,
          status: body.status || 'PRESENT',
          workHours: workHours,
          notes: body.notes,
        },
      });
    } else {
      // Create new record
      attendance = await prisma.attendance.create({
        data: {
          employeeId: body.employeeId,
          date: attendanceDate,
          checkIn: checkInDateTime,
          checkOut: checkOutDateTime,
          status: body.status || 'PRESENT',
          workHours: workHours,
          isWeekend: body.isWeekend || false,
          notes: body.notes,
        },
      });
    }

    return NextResponse.json({ attendance, success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error marking attendance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark attendance' },
      { status: 500 }
    );
  }
}
