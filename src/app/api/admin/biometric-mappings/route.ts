import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Get all biometric mappings with employee details
 */
export async function GET() {
  try {
    const mappings = await prisma.biometricMapping.findMany({
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true,
            department: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ mappings });
  } catch (error) {
    console.error('Error fetching biometric mappings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch biometric mappings' },
      { status: 500 }
    );
  }
}

/**
 * Create new biometric mapping
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employeeId,
      deviceEmployeeNo,
      cardNo,
      fingerprintEnrolled,
      faceEnrolled,
    } = body;

    // Validate required fields
    if (!employeeId || !deviceEmployeeNo) {
      return NextResponse.json(
        { error: 'Employee ID and Device Employee Number are required' },
        { status: 400 }
      );
    }

    // Check if employee exists
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check if employee already has a mapping
    const existingMapping = await prisma.biometricMapping.findUnique({
      where: { employeeId },
    });

    if (existingMapping) {
      return NextResponse.json(
        { error: 'This employee already has a biometric mapping' },
        { status: 400 }
      );
    }

    // Check if device employee number is already used
    const existingDeviceNo = await prisma.biometricMapping.findUnique({
      where: { deviceEmployeeNo },
    });

    if (existingDeviceNo) {
      return NextResponse.json(
        { error: 'This Device Employee Number is already in use' },
        { status: 400 }
      );
    }

    // Create mapping
    const mapping = await prisma.biometricMapping.create({
      data: {
        employeeId,
        deviceEmployeeNo,
        cardNo: cardNo || null,
        fingerprintEnrolled: fingerprintEnrolled || false,
        faceEnrolled: faceEnrolled || false,
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
      message: 'Biometric mapping created successfully',
      mapping,
    });
  } catch (error) {
    console.error('Error creating biometric mapping:', error);
    return NextResponse.json(
      { error: 'Failed to create biometric mapping' },
      { status: 500 }
    );
  }
}
