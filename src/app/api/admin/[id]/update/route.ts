// src/app/api/admin/[id]/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { firstName, lastName, email, currentPassword, newPassword } = await request.json();

    // Verify that the user exists and is an admin
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        password: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'User is not an admin' },
        { status: 400 }
      );
    }

    // Check if email is being changed and if it's already in use
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          id: { not: id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'Email already in use by another user' },
          { status: 400 }
        );
      }
    }

    // If changing password, verify current password
    if (currentPassword && newPassword) {
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 400 }
        );
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user profile with new password
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(email && { email }),
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          role: true,
          adminType: true,
          department: true,
          position: true,
        },
      } as any);

      return NextResponse.json({
        success: true,
        message: 'Profile and password updated successfully',
        user: {
          ...updatedUser,
          name: `${updatedUser.firstName} ${updatedUser.lastName}`,
        },
      });
    }

    // Update user profile without password change
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
      },
      select: {
        id: true,
        email: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        role: true,
        adminType: true,
        department: true,
        position: true,
      },
    } as any);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        ...updatedUser,
        name: `${updatedUser.firstName} ${updatedUser.lastName}`,
      },
    });
  } catch (error: any) {
    console.error('Update admin profile error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating profile' },
      { status: 500 }
    );
  }
}
