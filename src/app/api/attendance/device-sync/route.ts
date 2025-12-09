// src/app/api/attendance/device-sync/route.ts
// This endpoint receives attendance events from the local sync script

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface AttendanceEvent {
  deviceEmployeeNo: string;
  timestamp: string;
  serialNo: number;
  verifyMode: number;
  cardReaderNo?: number;
  doorNo?: number;
}

interface SyncRequest {
  events: AttendanceEvent[];
  deviceIp: string;
}

/**
 * Receives attendance events from local sync script
 * and processes them into the database
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Validate API key for security
    // const apiKey = request.headers.get('X-API-Key');
    // const expectedKey = process.env.SYNC_API_KEY;
    
    // if (expectedKey && apiKey !== expectedKey) {
    //   return NextResponse.json(
    //     { error: 'Invalid API key' },
    //     { status: 401 }
    //   );
    // }

    const body: SyncRequest = await request.json();
    const { events, deviceIp } = body;

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Invalid request: events array required' },
        { status: 400 }
      );
    }

    console.log(`[DEVICE-SYNC] Received ${events.length} events from ${deviceIp}`);

    // Get the device from database (optional, for logging)
    const device = await prisma.biometricDevice.findFirst({
      where: { ipAddress: deviceIp, isActive: true },
    });

    const results = {
      received: events.length,
      processed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const event of events) {
      try {
        // Check if this event was already processed (by serialNo)
        const existingLog = await prisma.attendanceLog.findFirst({
          where: {
            deviceEmployeeNo: event.deviceEmployeeNo,
            timestamp: new Date(event.timestamp),
          },
        });

        if (existingLog) {
          results.skipped++;
          continue;
        }

        // Find employee mapping
        const mapping = await prisma.biometricMapping.findUnique({
          where: { deviceEmployeeNo: event.deviceEmployeeNo },
          include: { employee: true },
        });

        // Create attendance log (raw record)
        const log = await prisma.attendanceLog.create({
          data: {
            deviceEmployeeNo: event.deviceEmployeeNo,
            employeeId: mapping?.employeeId || null,
            timestamp: new Date(event.timestamp),
            verifyMode: event.verifyMode,
            inOutType: 0, // We'll determine in/out based on time
            deviceId: device?.id,
            deviceName: device?.name,
            processed: false,
          },
        });

        // If employee is mapped, process into attendance record
        if (mapping && mapping.employeeId) {
          await processAttendanceRecord(mapping.employeeId, new Date(event.timestamp), device?.id);
          
          // Mark log as processed
          await prisma.attendanceLog.update({
            where: { id: log.id },
            data: { processed: true, processedAt: new Date() },
          });
        }

        results.processed++;
      } catch (err: any) {
        console.error(`[DEVICE-SYNC] Error processing event:`, err);
        results.errors.push(`Employee ${event.deviceEmployeeNo}: ${err.message}`);
      }
    }

    // Update device last sync time
    if (device) {
      await prisma.biometricDevice.update({
        where: { id: device.id },
        data: { lastSyncAt: new Date() },
      });
    }

    console.log(`[DEVICE-SYNC] Results:`, results);

    return NextResponse.json({
      success: true,
      ...results,
    });

  } catch (error: any) {
    console.error('[DEVICE-SYNC] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process sync' },
      { status: 500 }
    );
  }
}

/**
 * Process a timestamp into an attendance record
 * Determines if it's a check-in or check-out based on existing records
 */
async function processAttendanceRecord(
  employeeId: string,
  timestamp: Date,
  deviceId?: string
) {
  // Get the date (start of day) for the attendance record
  const attendanceDate = new Date(timestamp);
  attendanceDate.setHours(0, 0, 0, 0);

  // Check for existing attendance record for this date
  const existing = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId,
        date: attendanceDate,
      },
    },
  });

  // Determine attendance status based on check-in time
  // Assuming work starts at 8:30 AM
  const checkInHour = timestamp.getHours();
  const checkInMinute = timestamp.getMinutes();
  const isLate = checkInHour > 8 || (checkInHour === 8 && checkInMinute > 30);

  if (!existing) {
    // First scan of the day - this is check-in
    await prisma.attendance.create({
      data: {
        employeeId,
        date: attendanceDate,
        checkIn: timestamp,
        status: isLate ? 'LATE' : 'PRESENT',
        deviceId,
        verifyMode: 1, // Fingerprint
        source: 'BIOMETRIC',
      },
    });
    console.log(`[ATTENDANCE] Created check-in for ${employeeId} at ${timestamp}`);
  } else if (!existing.checkOut) {
    // Has check-in but no check-out - this could be check-out
    // Only count as check-out if it's at least 4 hours after check-in
    const hoursSinceCheckIn = existing.checkIn 
      ? (timestamp.getTime() - existing.checkIn.getTime()) / (1000 * 60 * 60)
      : 0;

    if (hoursSinceCheckIn >= 4) {
      // Calculate work hours
      const workHours = existing.checkIn
        ? (timestamp.getTime() - existing.checkIn.getTime()) / (1000 * 60 * 60)
        : null;

      // Determine final status
      let status = existing.status;
      if (workHours && workHours < 4) {
        status = 'HALF_DAY';
      } else if (workHours && workHours >= 8) {
        status = isLate ? 'LATE' : 'PRESENT';
      }

      await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkOut: timestamp,
          workHours: workHours ? parseFloat(workHours.toFixed(2)) : null,
          status,
        },
      });
      console.log(`[ATTENDANCE] Updated check-out for ${employeeId} at ${timestamp}`);
    } else {
      // Too soon - might be a duplicate scan, ignore
      console.log(`[ATTENDANCE] Ignored duplicate scan for ${employeeId} (${hoursSinceCheckIn.toFixed(1)}h since check-in)`);
    }
  } else {
    // Already has both check-in and check-out
    // Could update check-out if this is later
    if (timestamp > existing.checkOut) {
      const workHours = existing.checkIn
        ? (timestamp.getTime() - existing.checkIn.getTime()) / (1000 * 60 * 60)
        : null;

      await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkOut: timestamp,
          workHours: workHours ? parseFloat(workHours.toFixed(2)) : null,
        },
      });
      console.log(`[ATTENDANCE] Extended check-out for ${employeeId} to ${timestamp}`);
    }
  }
}

/**
 * GET endpoint to check sync status
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/attendance/device-sync',
    status: 'active',
    description: 'Receives attendance events from local sync script',
    usage: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'your-api-key (optional)',
      },
      body: {
        events: [
          {
            deviceEmployeeNo: 'string',
            timestamp: 'ISO 8601 datetime',
            serialNo: 'number',
            verifyMode: 'number',
          },
        ],
        deviceIp: 'string',
      },
    },
  });
}
