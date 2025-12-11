// src/app/api/employees/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendNewEmployeeEmails } from '@/lib/employee-emails';

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
        nameWithInitials: true,
        nic: true,
        department: true,
        position: true,
        phoneNumber: true,
        birthday: true,
        address: true,
        emergencyContact: true,
        dateOfJoining: true,
        isActive: true,
        profilePicture: true,
      },
    } as any);

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

    // Store the plain password before hashing (for email only)
    const plainPassword = body.password;

    // Hash the password
    const hashedPassword = await bcrypt.hash(body.password, 10);

    const employee = await prisma.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        employeeId: body.employeeId,
        firstName: body.firstName,
        lastName: body.lastName,
        nameWithInitials: body.nameWithInitials || null,
        nic: body.nic || null,
        department: body.department,
        position: body.position,
        phoneNumber: body.phoneNumber,
        birthday: body.birthday ? new Date(body.birthday) : null,
        address: body.address || null,
        emergencyContact: body.emergencyContact || null,
        profilePicture: body.profilePicture || null,
        role: 'EMPLOYEE',
        isActive: true,
        dateOfJoining: new Date(),
      },
    } as any);

    // Send welcome email with account credentials (don't wait for completion)
    const emailData = {
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeEmail: employee.email,
      employeeId: employee.employeeId,
      password: plainPassword,
      department: employee.department || 'Not specified',
      position: employee.position || 'Not specified',
    };

    // Send emails asynchronously (don't block the response)
    sendNewEmployeeEmails(emailData)
      .then((results) => {
        console.log('New employee emails sent:', results);
      })
      .catch((error) => {
        console.error('Error sending new employee emails:', error);
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