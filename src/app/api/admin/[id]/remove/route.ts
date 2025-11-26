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
    });

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
    });

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
    });

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
