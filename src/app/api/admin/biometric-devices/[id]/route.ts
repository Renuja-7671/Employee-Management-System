import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Update biometric device
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      deviceType,
      ipAddress,
      port,
      username,
      password,
      serialNumber,
      model,
      firmwareVersion,
      macAddress,
      isActive,
    } = body;

    // Check if device exists
    const existingDevice = await prisma.biometricDevice.findUnique({
      where: { id },
    });

    if (!existingDevice) {
      return NextResponse.json(
        { error: 'Biometric device not found' },
        { status: 404 }
      );
    }

    // If serial number is being changed, check if it's already in use
    if (serialNumber && serialNumber !== existingDevice.serialNumber) {
      const duplicateSerial = await prisma.biometricDevice.findUnique({
        where: { serialNumber },
      });

      if (duplicateSerial) {
        return NextResponse.json(
          { error: 'This Serial Number is already in use' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (deviceType !== undefined) updateData.deviceType = deviceType;
    if (ipAddress !== undefined) updateData.ipAddress = ipAddress;
    if (port !== undefined) updateData.port = port;
    if (username !== undefined) updateData.username = username;
    if (password !== undefined) updateData.password = password; // TODO: Encrypt
    if (serialNumber !== undefined) updateData.serialNumber = serialNumber || null;
    if (model !== undefined) updateData.model = model || null;
    if (firmwareVersion !== undefined) updateData.firmwareVersion = firmwareVersion || null;
    if (macAddress !== undefined) updateData.macAddress = macAddress || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update device
    const device = await prisma.biometricDevice.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Biometric device updated successfully',
      device,
    });
  } catch (error) {
    console.error('Error updating biometric device:', error);
    return NextResponse.json(
      { error: 'Failed to update biometric device' },
      { status: 500 }
    );
  }
}

/**
 * Delete biometric device
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if device exists
    const existingDevice = await prisma.biometricDevice.findUnique({
      where: { id },
    });

    if (!existingDevice) {
      return NextResponse.json(
        { error: 'Biometric device not found' },
        { status: 404 }
      );
    }

    // Delete device
    await prisma.biometricDevice.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Biometric device deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting biometric device:', error);
    return NextResponse.json(
      { error: 'Failed to delete biometric device' },
      { status: 500 }
    );
  }
}
