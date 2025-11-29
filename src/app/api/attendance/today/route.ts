// src/app/api/attendance/today/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');

    // Verify admin authentication
    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Only admins can access attendance data' },
        { status: 403 }
      );
    }

    // Get total active employees
    const totalEmployees = await prisma.user.count({
      where: {
        role: 'EMPLOYEE',
        isActive: true,
      },
    });

    // Get today's date range (start and end of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's attendance records with check-in
    const todayAttendance = await prisma.attendance.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
        checkIn: {
          not: null,
        },
      },
      select: {
        id: true,
        employeeId: true,
        checkIn: true,
        checkOut: true,
        status: true,
      },
    });

    // Count present employees (those who checked in)
    const presentCount = todayAttendance.length;

    // Get employees on approved leave today
    const employeesOnLeave = await prisma.leave.findMany({
      where: {
        status: 'APPROVED',
        startDate: {
          lte: today,
        },
        endDate: {
          gte: today,
        },
      },
      select: {
        employeeId: true,
      },
    });

    const onLeaveCount = employeesOnLeave.length;

    // Calculate absent (total - present - on leave)
    const absentCount = totalEmployees - presentCount - onLeaveCount;

    // Calculate attendance percentage
    const attendancePercentage = totalEmployees > 0
      ? parseFloat(((presentCount / totalEmployees) * 100).toFixed(1))
      : 0;

    return NextResponse.json({
      success: true,
      totalEmployees,
      presentCount,
      absentCount,
      onLeaveCount,
      attendancePercentage,
      date: today.toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching today\'s attendance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch attendance data' },
      { status: 500 }
    );
  }
}
