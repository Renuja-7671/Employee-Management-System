// src/app/api/admin/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currentAdminId = searchParams.get('adminId');

    // Verify that the request is from an existing admin
    if (!currentAdminId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      );
    }

    const currentAdmin = await prisma.user.findUnique({
      where: { id: currentAdminId },
    });

    if (!currentAdmin || currentAdmin.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only admins can view admin list' },
        { status: 403 }
      );
    }

    // Get all admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        department: true,
        position: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const adminsWithNames = admins.map(admin => ({
      ...admin,
      name: `${admin.firstName} ${admin.lastName}`,
    }));

    return NextResponse.json({
      success: true,
      admins: adminsWithNames,
      count: admins.length,
    });
  } catch (error: any) {
    console.error('List admins error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching admins' },
      { status: 500 }
    );
  }
}
