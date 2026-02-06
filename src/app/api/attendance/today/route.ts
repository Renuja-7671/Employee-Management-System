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

    // Get today's date range (start and end of day) in UTC
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

    // Get employees on leave today
    // Include leaves where:
    // 1. Status is APPROVED (admin approved), OR
    // 2. Status is PENDING_ADMIN (cover employee approved, waiting for admin), OR
    // 3. Leave type is OFFICIAL and status is PENDING_ADMIN (no cover employee needed)
    const employeesOnLeave = await prisma.leave.findMany({
      where: {
        // Check if today falls within the leave period
        AND: [
          {
            startDate: {
              lte: tomorrow, // Leave starts on or before tomorrow
            },
          },
          {
            endDate: {
              gte: today, // Leave ends on or after today
            },
          },
        ],
        OR: [
          // Approved by admin
          { status: 'APPROVED' },
          // Cover employee approved, waiting for admin (work is already delegated)
          { 
            status: 'PENDING_ADMIN',
            leaveType: { not: 'OFFICIAL' }, // Non-official leaves must have cover approval
          },
          // Official leaves don't need cover employee approval
          {
            status: 'PENDING_ADMIN',
            leaveType: 'OFFICIAL',
          },
        ],
      },
      select: {
        id: true,
        employeeId: true,
        leaveType: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    });

    console.log('[ATTENDANCE_TODAY] Debug info:', {
      todayDate: today.toISOString(),
      tomorrowDate: tomorrow.toISOString(),
      totalLeaves: employeesOnLeave.length,
      leaves: employeesOnLeave.map(l => ({
        id: l.id,
        employeeId: l.employeeId,
        type: l.leaveType,
        status: l.status,
        startDate: l.startDate,
        endDate: l.endDate,
      })),
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
