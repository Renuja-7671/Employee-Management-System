// src/app/api/admin/[id]/remove/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { currentAdminId } = await request.json();

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
        { success: false, error: 'Unauthorized: Only admins can remove admins' },
        { status: 403 }
      );
    }

    // Prevent admin from removing themselves
    if (id === currentAdminId) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove yourself as admin' },
        { status: 400 }
      );
    }

    // Check if the user to be removed is an admin
    const adminToRemove = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        adminType: true,
        firstName: true,
        lastName: true,
        email: true,
        employeeId: true,
      },
    } as any);

    if (!adminToRemove) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    if (adminToRemove.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'User is not an admin' },
        { status: 400 }
      );
    }

    // Check permissions based on admin types
    const canDelete = checkDeletePermission(
      currentAdmin.adminType,
      adminToRemove.adminType
    );

    if (!canDelete) {
      let errorMessage = 'You do not have permission to remove this admin.';

      if (currentAdmin.adminType === 'HR_HEAD' && adminToRemove.adminType === 'MANAGING_DIRECTOR') {
        errorMessage = 'HR Head cannot remove Managing Director.';
      } else if (currentAdmin.adminType === 'RESERVED') {
        errorMessage = 'Reserved admin cannot remove other administrators.';
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage
        },
        { status: 403 }
      );
    }

    // Count remaining admins
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });

    // Prevent removing the last admin
    if (adminCount <= 1) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove the last admin. At least one admin must exist in the system.' },
        { status: 400 }
      );
    }

    // Change admin role to employee instead of deleting
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role: 'EMPLOYEE',
        adminType: null,
        position: 'Employee',
      },
      select: {
        id: true,
        email: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    } as any);

    return NextResponse.json({
      success: true,
      message: `Admin privileges removed from ${updatedUser.firstName} ${updatedUser.lastName}`,
      user: {
        ...updatedUser,
        name: `${updatedUser.firstName} ${updatedUser.lastName}`,
      },
    });
  } catch (error: any) {
    console.error('Remove admin error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while removing admin' },
      { status: 500 }
    );
  }
}

// Helper function to check if current admin can delete target admin
function checkDeletePermission(
  currentAdminType: string | null,
  targetAdminType: string | null
): boolean {
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
