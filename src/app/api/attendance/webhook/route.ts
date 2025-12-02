// src/app/api/attendance/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay } from 'date-fns';

/**
 * Webhook endpoint to receive real-time attendance events from Hikvision device
 * The device will send HTTP POST requests to this endpoint when fingerprint scans occur
 */

interface HikvisionEvent {
  EventNotificationAlert?: {
    eventType?: string;
    eventState?: string;
    eventDescription?: string;
    dateTime?: string;
    AcsEvent?: {
      employeeNoString?: string;
      name?: string;
      time?: string;
      cardReaderVerifyMode?: number;
      attendanceStatus?: number;
      deviceName?: string;
      serialNo?: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from authorized device (optional security check)
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.HIKVISION_WEBHOOK_SECRET;

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the webhook payload (Hikvision sends XML or JSON)
    const contentType = request.headers.get('content-type') || '';
    let eventData: HikvisionEvent;

    if (contentType.includes('application/json')) {
      eventData = await request.json();
    } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      const xmlText = await request.text();
      eventData = parseHikvisionXML(xmlText);
    } else {
      const body = await request.text();
      try {
        eventData = JSON.parse(body);
      } catch {
        eventData = parseHikvisionXML(body);
      }
    }

    // Extract attendance event from the payload
    const acsEvent = eventData.EventNotificationAlert?.AcsEvent;

    if (!acsEvent) {
      console.warn('No AcsEvent found in webhook payload');
      return NextResponse.json({ message: 'No attendance event found' });
    }

    const deviceEmployeeNo = acsEvent.employeeNoString || '';
    const timestamp = new Date(acsEvent.time || Date.now());
    const verifyMode = acsEvent.cardReaderVerifyMode || 0;
    const inOutType = acsEvent.attendanceStatus || 0;
    const deviceName = acsEvent.deviceName || '';
    const deviceSerial = acsEvent.serialNo || '';

    console.log('Received attendance event:', {
      deviceEmployeeNo,
      timestamp,
      verifyMode,
      inOutType,
      deviceName,
    });

    // Store the raw log first
    const attendanceLog = await prisma.attendanceLog.create({
      data: {
        deviceEmployeeNo,
        timestamp,
        verifyMode,
        inOutType,
        deviceName,
        deviceId: deviceSerial,
        processed: false,
      },
    });

    // Try to find employee mapping
    const mapping = await prisma.biometricMapping.findUnique({
      where: { deviceEmployeeNo },
      include: { employee: true },
    });

    if (!mapping) {
      console.warn(`No employee mapping found for device employee no: ${deviceEmployeeNo}`);
      await prisma.attendanceLog.update({
        where: { id: attendanceLog.id },
        data: {
          errorMessage: 'Employee mapping not found',
        },
      });
      return NextResponse.json({
        message: 'Event logged but employee mapping not found',
        logId: attendanceLog.id,
      });
    }

    // Update log with employee ID
    await prisma.attendanceLog.update({
      where: { id: attendanceLog.id },
      data: { employeeId: mapping.employeeId },
    });

    // Process the attendance
    const result = await processAttendanceEvent(
      mapping.employeeId,
      timestamp,
      inOutType,
      verifyMode,
      deviceSerial
    );

    // Mark log as processed
    await prisma.attendanceLog.update({
      where: { id: attendanceLog.id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Attendance event processed successfully',
      logId: attendanceLog.id,
      attendanceId: result.id,
    });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process attendance event' },
      { status: 500 }
    );
  }
}

/**
 * Process attendance event and update/create attendance record
 */
async function processAttendanceEvent(
  employeeId: string,
  timestamp: Date,
  inOutType: number,
  verifyMode: number,
  deviceId?: string
) {
  const dateOnly = startOfDay(timestamp);

  // Find or create attendance record for the day
  let attendance = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId,
        date: dateOnly,
      },
    },
  });

  // Determine if check-in or check-out based on inOutType
  // 0 = Check In, 1 = Check Out, 2 = Break Out, 3 = Break In
  const isCheckIn = inOutType === 0 || inOutType === 3;

  if (!attendance) {
    // Create new attendance record
    attendance = await prisma.attendance.create({
      data: {
        employeeId,
        date: dateOnly,
        checkIn: isCheckIn ? timestamp : null,
        checkOut: !isCheckIn ? timestamp : null,
        status: 'PRESENT',
        verifyMode,
        deviceId,
        source: 'BIOMETRIC',
      },
    });
  } else {
    // Update existing record
    const updateData: any = {
      verifyMode,
      deviceId,
      source: 'BIOMETRIC',
    };

    if (isCheckIn && !attendance.checkIn) {
      updateData.checkIn = timestamp;
    } else if (!isCheckIn) {
      updateData.checkOut = timestamp;
    }

    // Calculate work hours if both check-in and check-out exist
    if (attendance.checkIn && updateData.checkOut) {
      const checkInTime = new Date(attendance.checkIn);
      const checkOutTime = new Date(updateData.checkOut);
      updateData.workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    } else if (updateData.checkIn && attendance.checkOut) {
      const checkInTime = new Date(updateData.checkIn);
      const checkOutTime = new Date(attendance.checkOut);
      updateData.workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    }

    attendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: updateData,
    });
  }

  return attendance;
}

/**
 * Parse Hikvision XML webhook payload
 */
function parseHikvisionXML(xml: string): HikvisionEvent {
  try {
    // Simple XML parsing - for production, consider using xml2js library
    const event: HikvisionEvent = {
      EventNotificationAlert: {
        AcsEvent: {},
      },
    };

    const acsEvent = event.EventNotificationAlert!.AcsEvent!;

    // Extract employee number
    const employeeNoMatch = xml.match(/<employeeNoString>(.*?)<\/employeeNoString>/i);
    if (employeeNoMatch) acsEvent.employeeNoString = employeeNoMatch[1];

    // Extract name
    const nameMatch = xml.match(/<name>(.*?)<\/name>/i);
    if (nameMatch) acsEvent.name = nameMatch[1];

    // Extract time
    const timeMatch = xml.match(/<time>(.*?)<\/time>/i);
    if (timeMatch) acsEvent.time = timeMatch[1];

    // Extract verify mode
    const verifyModeMatch = xml.match(/<cardReaderVerifyMode>(.*?)<\/cardReaderVerifyMode>/i);
    if (verifyModeMatch) acsEvent.cardReaderVerifyMode = parseInt(verifyModeMatch[1]);

    // Extract attendance status (in/out type)
    const attendanceStatusMatch = xml.match(/<attendanceStatus>(.*?)<\/attendanceStatus>/i);
    if (attendanceStatusMatch) acsEvent.attendanceStatus = parseInt(attendanceStatusMatch[1]);

    // Extract device name
    const deviceNameMatch = xml.match(/<deviceName>(.*?)<\/deviceName>/i);
    if (deviceNameMatch) acsEvent.deviceName = deviceNameMatch[1];

    // Extract serial number
    const serialNoMatch = xml.match(/<serialNo>(.*?)<\/serialNo>/i);
    if (serialNoMatch) acsEvent.serialNo = serialNoMatch[1];

    return event;
  } catch (error) {
    console.error('Error parsing XML:', error);
    return {};
  }
}

// Allow GET requests for testing
export async function GET() {
  return NextResponse.json({
    message: 'Hikvision Attendance Webhook Endpoint',
    status: 'active',
    note: 'Configure your Hikvision device to send events to this URL',
  });
}
