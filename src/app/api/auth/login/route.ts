// src/app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    console.log("Login attempt for email:", email);

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        adminType: true,
        employeeId: true,
        callingName: true,
        fullName: true,
        firstName: true,
        lastName: true,
        department: true,
        position: true,
        phoneNumber: true,
        address: true,
        emergencyContact: true,
        birthday: true,
        dateOfJoining: true,
        isActive: true,
        isProbation: true,
        confirmedAt: true,
      },
    } as any);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account is inactive. Please contact HR.' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Remove password from response
    const { password: _password, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      profile: {
        id: user.id,
        name: user.callingName || user.fullName || `${user.firstName} ${user.lastName}`,
        callingName: user.callingName,
        fullName: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        adminType: user.adminType,
        employeeId: user.employeeId,
        department: user.department,
        position: user.position,
        phoneNumber: user.phoneNumber,
        address: user.address,
        emergencyContact: user.emergencyContact,
        birthday: user.birthday,
        dateOfJoining: user.dateOfJoining,
        isProbation: (user as any).isProbation,
        confirmedAt: (user as any).confirmedAt,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
