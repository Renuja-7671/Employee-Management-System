// src/app/api/employees/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const employee = await prisma.user.findUnique({
      where: { id },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if employee exists
    const existingEmployee = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Prepare update data - only allow specific fields to be updated
    const updateData: any = {};

    if (body.callingName !== undefined) updateData.callingName = body.callingName;
    if (body.fullName !== undefined) updateData.fullName = body.fullName;
    if (body.nameWithInitials !== undefined) updateData.nameWithInitials = body.nameWithInitials;
    if (body.firstName !== undefined) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phoneNumber !== undefined) updateData.phoneNumber = body.phoneNumber;
    if (body.nic !== undefined) updateData.nic = body.nic;
    if (body.position !== undefined) updateData.position = body.position;
    if (body.department !== undefined) updateData.department = body.department;
    if (body.birthday !== undefined) updateData.birthday = body.birthday ? new Date(body.birthday) : null;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.emergencyContact !== undefined) updateData.emergencyContact = body.emergencyContact;
    if (body.dateOfJoining !== undefined) updateData.dateOfJoining = body.dateOfJoining ? new Date(body.dateOfJoining) : null;
    if (body.profilePicture !== undefined) updateData.profilePicture = body.profilePicture;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    // Update employee
    const employee = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        employeeId: true,
        callingName: true,
        fullName: true,
        nameWithInitials: true,
        firstName: true,
        lastName: true,
        nic: true,
        department: true,
        position: true,
        phoneNumber: true,
        birthday: true,
        address: true,
        emergencyContact: true,
        profilePicture: true,
        dateOfJoining: true,
        isActive: true,
      },
    } as any);

    return NextResponse.json({ employee });
  } catch (error: any) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update employee' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if employee exists
    const existingEmployee = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete employee' },
      { status: 500 }
    );
  }
}