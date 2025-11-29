// src/app/api/auth/setup/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, adminType } = await request.json();

    if (!name || !email || !password || !adminType) {
      return NextResponse.json(
        { success: false, error: 'Name, email, password and admin type are required' },
        { status: 400 }
      );
    }

    // Check if any admin already exists
    const existingAdminType = await prisma.user.findFirst({
      where: { adminType: adminType },
    });

    if (existingAdminType) {
      return NextResponse.json(
        { success: false, error: 'Admin account for this person already exists' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already in use' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Split name into first and last name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    // Generate employee ID (ADM + timestamp)
    const employeeId = `ADM${Date.now().toString().slice(-6)}`;

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'ADMIN',
        employeeId,
        firstName,
        lastName,
        department: 'MANAGEMENT',
        position: 'System Administrator',
        isActive: true,
        adminType,
      },
      select: {
        id: true,
        email: true,
        role: true,
        adminType: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        department: true,
        position: true,
      },
    } as any);

    // Create leave balance for admin
    await prisma.leaveBalance.create({
      data: {
        employeeId: user.id,
        year: new Date().getFullYear(),
        annual: 14,
        casual: 7,
        medical: 0,
        official: 0,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        name: `${user.firstName} ${user.lastName}`,
      },
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during setup' },
      { status: 500 }
    );
  }
}
