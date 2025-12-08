import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Update biometric mapping
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      deviceEmployeeNo,
      cardNo,
      fingerprintEnrolled,
      faceEnrolled,
    } = body;

    // Check if mapping exists
    const existingMapping = await prisma.biometricMapping.findUnique({
      where: { id },
    });

    if (!existingMapping) {
      return NextResponse.json(
        { error: 'Biometric mapping not found' },
        { status: 404 }
      );
    }

    // If device employee number is being changed, check if it's already in use
    if (deviceEmployeeNo && deviceEmployeeNo !== existingMapping.deviceEmployeeNo) {
      const duplicateDeviceNo = await prisma.biometricMapping.findUnique({
        where: { deviceEmployeeNo },
      });

      if (duplicateDeviceNo) {
        return NextResponse.json(
          { error: 'This Device Employee Number is already in use' },
          { status: 400 }
        );
      }
    }

    // Update mapping
    const mapping = await prisma.biometricMapping.update({
      where: { id },
      data: {
        deviceEmployeeNo: deviceEmployeeNo || existingMapping.deviceEmployeeNo,
        cardNo: cardNo !== undefined ? cardNo : existingMapping.cardNo,
        fingerprintEnrolled: fingerprintEnrolled !== undefined ? fingerprintEnrolled : existingMapping.fingerprintEnrolled,
        faceEnrolled: faceEnrolled !== undefined ? faceEnrolled : existingMapping.faceEnrolled,
        syncedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Biometric mapping updated successfully',
      mapping,
    });
  } catch (error) {
    console.error('Error updating biometric mapping:', error);
    return NextResponse.json(
      { error: 'Failed to update biometric mapping' },
      { status: 500 }
    );
  }
}

/**
 * Delete biometric mapping
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if mapping exists
    const existingMapping = await prisma.biometricMapping.findUnique({
      where: { id },
    });

    if (!existingMapping) {
      return NextResponse.json(
        { error: 'Biometric mapping not found' },
        { status: 404 }
      );
    }

    // Delete mapping
    await prisma.biometricMapping.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Biometric mapping deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting biometric mapping:', error);
    return NextResponse.json(
      { error: 'Failed to delete biometric mapping' },
      { status: 500 }
    );
  }
}
