// src/app/api/employees/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const employees = await prisma.user.findMany({
      where: {
        role: 'EMPLOYEE',
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
        phoneNumber: true,
        birthday: true,
        address: true,
        emergencyContact: true,
        dateOfJoining: true,
        isActive: true,
      },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.employeeId || !body.firstName || !body.lastName || !body.password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(body.password, 10);

    const employee = await prisma.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        employeeId: body.employeeId,
        firstName: body.firstName,
        lastName: body.lastName,
        department: body.department,
        position: body.position,
        phoneNumber: body.phoneNumber,
        birthday: body.birthday ? new Date(body.birthday) : null,
        address: body.address || null,
        emergencyContact: body.emergencyContact || null,
        role: 'EMPLOYEE',
        isActive: true,
        dateOfJoining: new Date(),
      },
    });

    return NextResponse.json({ employee }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create employee' },
      { status: 500 }
    );
  }
}