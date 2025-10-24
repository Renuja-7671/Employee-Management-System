import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, phoneNumber, address, birthday, emergencyContact } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build update data object
    const updateData: any = {};

    if (phoneNumber !== undefined) {
      updateData.phoneNumber = phoneNumber || null;
    }

    if (address !== undefined) {
      updateData.address = address || null;
    }

    if (birthday !== undefined) {
      updateData.birthday = birthday ? new Date(birthday) : null;
    }

    if (emergencyContact !== undefined) {
      updateData.emergencyContact = emergencyContact || null;
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        department: true,
        position: true,
        phoneNumber: true,
        birthday: true,
        address: true,
        emergencyContact: true,
        dateOfJoining: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: updatedUser,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
