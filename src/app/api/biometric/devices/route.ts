// src/app/api/biometric/devices/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HikvisionClient } from '@/lib/services/hikvision';

/**
 * API endpoints for managing biometric devices
 */

export async function GET() {
  try {
    const devices = await prisma.biometricDevice.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        deviceType: true,
        ipAddress: true,
        port: true,
        serialNumber: true,
        model: true,
        firmwareVersion: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ devices });
  } catch (error: any) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.ipAddress || !body.username || !body.password) {
      return NextResponse.json(
        { error: 'Missing required fields: name, ipAddress, username, password' },
        { status: 400 }
      );
    }

    // Test connection first
    const client = new HikvisionClient({
      host: body.ipAddress,
      port: body.port || 80,
      username: body.username,
      password: body.password,
    });

    const connected = await client.testConnection();
    if (!connected) {
      return NextResponse.json(
        { error: 'Failed to connect to device. Please check IP, credentials, and network connectivity.' },
        { status: 400 }
      );
    }

    // Get device info
    const deviceInfo = await client.getDeviceInfo();

    // Create device in database
    const device = await prisma.biometricDevice.create({
      data: {
        name: body.name,
        deviceType: body.deviceType || 'HIKVISION',
        ipAddress: body.ipAddress,
        port: body.port || 80,
        username: body.username,
        password: body.password, // TODO: Encrypt in production
        serialNumber: deviceInfo?.serialNumber,
        model: deviceInfo?.deviceModel,
        firmwareVersion: deviceInfo?.firmwareVersion,
        macAddress: deviceInfo?.macAddress,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      device: {
        id: device.id,
        name: device.name,
        deviceType: device.deviceType,
        ipAddress: device.ipAddress,
        serialNumber: device.serialNumber,
        model: device.model,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating device:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create device' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (body.name) updateData.name = body.name;
    if (body.ipAddress) updateData.ipAddress = body.ipAddress;
    if (body.port) updateData.port = body.port;
    if (body.username) updateData.username = body.username;
    if (body.password) updateData.password = body.password;
    if (typeof body.isActive === 'boolean') updateData.isActive = body.isActive;

    const device = await prisma.biometricDevice.update({
      where: { id: body.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      device,
    });
  } catch (error: any) {
    console.error('Error updating device:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update device' },
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
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    await prisma.biometricDevice.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Device deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting device:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete device' },
      { status: 500 }
    );
  }
}
