// src/app/api/attendance/device/configure/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HikvisionClient } from '@/lib/services/hikvision';

/**
 * Device Configuration Endpoint
 *
 * Configures the Hikvision device to send real-time webhook events
 * This should be run once after device setup or when webhook URL changes
 */

export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication check
    // Only admins should be able to configure devices

    const body = await request.json();
    const { webhookUrl } = body;

    // Get webhook URL (use provided or construct from environment)
    const baseUrl = webhookUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://employee-management-system-mu-beryl.vercel.app';
    const fullWebhookUrl = `${baseUrl}/api/attendance/webhook`;

    console.log('[DEVICE CONFIG] Configuring webhook to:', fullWebhookUrl);

    // Get device from database
    const device = await prisma.biometricDevice.findFirst({
      where: {
        deviceType: 'HIKVISION',
        isActive: true,
      },
    });

    if (!device) {
      return NextResponse.json(
        { error: 'No active Hikvision device found. Please add a device first.' },
        { status: 404 }
      );
    }

    // Create Hikvision client
    const hikClient = new HikvisionClient({
      host: device.ipAddress,
      port: device.port,
      username: device.username,
      password: device.password,
    });

    // Configure webhook on device
    try {
      // Determine protocol based on URL
      const protocolType = fullWebhookUrl.startsWith('https') ? 'HTTPS' : 'HTTP';

      const success = await hikClient.configureEventNotification(
        fullWebhookUrl,
        protocolType
      );

      if (!success) {
        throw new Error('Device returned failure when configuring webhook');
      }

      console.log('[DEVICE CONFIG] Successfully configured webhook on device');

      // Update device record with webhook info
      await prisma.biometricDevice.update({
        where: { id: device.id },
        data: {
          lastSyncAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Device webhook configured successfully',
        webhookUrl: fullWebhookUrl,
        deviceInfo: {
          name: device.name,
          ipAddress: device.ipAddress,
        },
      });
    } catch (configError: any) {
      console.error('[DEVICE CONFIG] Failed to configure webhook:', configError);
      return NextResponse.json(
        {
          error: 'Failed to configure webhook on device',
          details: configError.message,
          suggestion: 'You can also configure the webhook manually via the device web interface',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[DEVICE CONFIG] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to configure device' },
      { status: 500 }
    );
  }
}

/**
 * Get current device configuration
 */
export async function GET() {
  try {
    const device = await prisma.biometricDevice.findFirst({
      where: {
        deviceType: 'HIKVISION',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        ipAddress: true,
        port: true,
        deviceType: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
      },
    });

    if (!device) {
      return NextResponse.json({
        configured: false,
        message: 'No Hikvision device configured',
      });
    }

    // Get webhook URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://employee-management-system-mu-beryl.vercel.app';
    const webhookUrl = `${baseUrl}/api/attendance/webhook`;

    // Get recent sync stats
    const recentLogs = await prisma.attendanceLog.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    return NextResponse.json({
      configured: true,
      device: {
        ...device,
        webhookUrl,
        recentEvents: recentLogs,
      },
      setupInstructions: {
        manual: `Login to device at http://${device.ipAddress} and configure webhook URL: ${webhookUrl}`,
        api: 'POST to /api/attendance/device/configure to configure automatically',
      },
    });
  } catch (error: any) {
    console.error('[DEVICE CONFIG] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get device configuration' },
      { status: 500 }
    );
  }
}
