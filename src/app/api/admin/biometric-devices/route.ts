import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Get all biometric devices
 */
export async function GET() {
  try {
    const devices = await prisma.biometricDevice.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ devices });
  } catch (error) {
    console.error('Error fetching biometric devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch biometric devices' },
      { status: 500 }
    );
  }
}

/**
 * Create new biometric device
 */
export async function POST(request: NextRequest) {
  try {
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

    // Validate required fields
    if (!name || !deviceType || !ipAddress || !username || !password) {
      return NextResponse.json(
        { error: 'Name, Device Type, IP Address, Username, and Password are required' },
        { status: 400 }
      );
    }

    // Check if serial number is already in use (if provided)
    if (serialNumber) {
      const existingSerial = await prisma.biometricDevice.findUnique({
        where: { serialNumber },
      });

      if (existingSerial) {
        return NextResponse.json(
          { error: 'This Serial Number is already registered' },
          { status: 400 }
        );
      }
    }

    // Create device
    const device = await prisma.biometricDevice.create({
      data: {
        name,
        deviceType,
        ipAddress,
        port: port || 80,
        username,
        password, // TODO: Encrypt password in production
        serialNumber: serialNumber || null,
        model: model || null,
        firmwareVersion: firmwareVersion || null,
        macAddress: macAddress || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({
      message: 'Biometric device created successfully',
      device,
    });
  } catch (error) {
    console.error('Error creating biometric device:', error);
    return NextResponse.json(
      { error: 'Failed to create biometric device' },
      { status: 500 }
    );
  }
}
