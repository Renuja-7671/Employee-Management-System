// src/app/api/employees/[id]/profile/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const employee = await prisma.user.update({
      where: { id },
      data: {
        phoneNumber: body.phone,
        department: body.department,
        position: body.position,
        birthday: body.birthday,
        address: body.address,
        emergencyContact: body.emergencyContact,
        // Add other profile fields as needed
      },
    });

    return NextResponse.json({ employee });
  } catch (error: any) {
    console.error('Error updating employee profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update employee profile' },
      { status: 500 }
    );
  }
}