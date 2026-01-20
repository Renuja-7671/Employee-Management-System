// src/app/api/biometric/mappings/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAttendanceSyncService } from '@/lib/services/attendance-sync';
import crypto from 'crypto';

/**
 * API endpoints for managing employee biometric mappings
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    const where: any = {};
    if (employeeId) {
      where.employeeId = employeeId;
    }

    const mappings = await prisma.biometricMapping.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ mappings });
  } catch (error: any) {
    console.error('Error fetching mappings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch mappings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.employeeId || !body.deviceEmployeeNo) {
      return NextResponse.json(
        { error: 'Missing required fields: employeeId, deviceEmployeeNo' },
        { status: 400 }
      );
    }

    // Check if employee exists
    const employee = await prisma.user.findUnique({
      where: { id: body.employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check if mapping already exists
    const existing = await prisma.biometricMapping.findUnique({
      where: { employeeId: body.employeeId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Employee already has a biometric mapping' },
        { status: 400 }
      );
    }

    // Create mapping
    const mapping = await prisma.biometricMapping.create({
      data: {
        id: crypto.randomUUID(),
        employeeId: body.employeeId,
        deviceEmployeeNo: body.deviceEmployeeNo,
        cardNo: body.cardNo,
        fingerprintEnrolled: body.fingerprintEnrolled || false,
        faceEnrolled: body.faceEnrolled || false,
        updatedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      mapping,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating mapping:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create mapping' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Mapping ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (body.deviceEmployeeNo) updateData.deviceEmployeeNo = body.deviceEmployeeNo;
    if (body.cardNo) updateData.cardNo = body.cardNo;
    if (typeof body.fingerprintEnrolled === 'boolean') {
      updateData.fingerprintEnrolled = body.fingerprintEnrolled;
    }
    if (typeof body.faceEnrolled === 'boolean') {
      updateData.faceEnrolled = body.faceEnrolled;
    }

    const mapping = await prisma.biometricMapping.update({
      where: { id: body.id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      mapping,
    });
  } catch (error: any) {
    console.error('Error updating mapping:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update mapping' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Mapping ID is required' },
        { status: 400 }
      );
    }

    await prisma.biometricMapping.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Mapping deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting mapping:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete mapping' },
      { status: 500 }
    );
  }
}
