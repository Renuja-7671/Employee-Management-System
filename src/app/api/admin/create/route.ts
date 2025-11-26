// src/app/api/admin/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, currentAdminId } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

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
        { success: false, error: 'Unauthorized: Only admins can create new admins' },
        { status: 403 }
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
    const newAdmin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'ADMIN',
        employeeId,
        firstName,
        lastName,
        department: 'ADMINISTRATION',
        position: 'System Administrator',
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        department: true,
        position: true,
        createdAt: true,
      },
    });

    // Create leave balance for admin
    await prisma.leaveBalance.create({
      data: {
        employeeId: newAdmin.id,
        year: new Date().getFullYear(),
        annual: 14,
        casual: 7,
        medical: 0,
        business: 0,
      },
    });

    return NextResponse.json({
      success: true,
      admin: {
        ...newAdmin,
        name: `${newAdmin.firstName} ${newAdmin.lastName}`,
      },
      message: 'New admin created successfully',
    });
  } catch (error: any) {
    console.error('Create admin error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while creating admin' },
      { status: 500 }
    );
  }
}
