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
      select: {
        id: true,
        role: true,
        adminType: true,
      },
    } as any);

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
        adminType: true,
        department: true,
        position: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    } as any);

    const adminsWithNames = admins.map((admin: any) => ({
      ...admin,
      name: `${admin.firstName} ${admin.lastName}`,
      canDelete: canDeleteAdmin(currentAdmin.adminType, admin.adminType, admin.id, currentAdminId),
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

// Helper function to determine if an admin can delete another
function canDeleteAdmin(
  currentAdminType: string | null,
  targetAdminType: string | null,
  targetAdminId: string,
  currentAdminId: string
): boolean {
  // Cannot delete yourself
  if (targetAdminId === currentAdminId) {
    return false;
  }

  // Managing Director can delete HR Head and Reserved admin
  if (
    currentAdminType === 'MANAGING_DIRECTOR' &&
    (targetAdminType === 'HR_HEAD' || targetAdminType === 'RESERVED')
  ) {
    return true;
  }

  // HR Head can only delete Reserved admin (NOT Managing Director)
  if (currentAdminType === 'HR_HEAD' && targetAdminType === 'RESERVED') {
    return true;
  }

  // Reserved admin cannot delete anyone
  if (currentAdminType === 'RESERVED') {
    return false;
  }

  return false;
}
