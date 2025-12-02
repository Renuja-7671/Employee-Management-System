// src/lib/services/attendance-sync.ts

import { prisma } from '@/lib/prisma';
import { HikvisionClient, AttendanceRecord } from './hikvision';
import { startOfDay } from 'date-fns';

/**
 * Service to sync attendance data from Hikvision devices
 * Can be called manually or scheduled via cron job
 */

export interface SyncResult {
  success: boolean;
  recordsFetched: number;
  recordsProcessed: number;
  recordsFailed: number;
  errors: string[];
}

export class AttendanceSyncService {
  private hikvisionClient: HikvisionClient | null = null;

  constructor(hikvisionClient?: HikvisionClient) {
    this.hikvisionClient = hikvisionClient || null;
  }

  /**
   * Initialize client from database configuration
   */
  async initializeFromDatabase(): Promise<boolean> {
    try {
      const device = await prisma.biometricDevice.findFirst({
        where: {
          deviceType: 'HIKVISION',
          isActive: true,
        },
      });

      if (!device) {
        console.error('No active Hikvision device found in database');
        return false;
      }

      this.hikvisionClient = new HikvisionClient({
        host: device.ipAddress,
        port: device.port,
        username: device.username,
        password: device.password,
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize Hikvision client:', error);
      return false;
    }
  }

  /**
   * Sync attendance records from device
   * @param startDate - Start date for sync (default: last sync time or 24 hours ago)
   * @param endDate - End date for sync (default: now)
   */
  async syncAttendance(
    startDate?: Date,
    endDate?: Date
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsFetched: 0,
      recordsProcessed: 0,
      recordsFailed: 0,
      errors: [],
    };

    try {
      // Initialize client if not already done
      if (!this.hikvisionClient) {
        const initialized = await this.initializeFromDatabase();
        if (!initialized) {
          result.errors.push('Failed to initialize Hikvision client');
          return result;
        }
      }

      // Get device info
      const device = await prisma.biometricDevice.findFirst({
        where: { deviceType: 'HIKVISION', isActive: true },
      });

      if (!device) {
        result.errors.push('No active Hikvision device found');
        return result;
      }

      // Determine sync period
      const start = startDate || device.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const end = endDate || new Date();

      console.log(`Syncing attendance from ${start} to ${end}`);

      // Fetch attendance records from device
      const records = await this.hikvisionClient!.getAttendanceRecords(start, end);
      result.recordsFetched = records.length;

      console.log(`Fetched ${records.length} attendance records from device`);

      // Process each record
      for (const record of records) {
        try {
          await this.processAttendanceRecord(record, device.id);
          result.recordsProcessed++;
        } catch (error: any) {
          result.recordsFailed++;
          result.errors.push(
            `Failed to process record for ${record.employeeNo}: ${error.message}`
          );
          console.error(`Error processing record:`, error);
        }
      }

      // Update last sync time
      await prisma.biometricDevice.update({
        where: { id: device.id },
        data: { lastSyncAt: new Date() },
      });

      result.success = true;
      console.log(`Sync completed: ${result.recordsProcessed} processed, ${result.recordsFailed} failed`);

      return result;
    } catch (error: any) {
      result.errors.push(error.message || 'Unknown error during sync');
      console.error('Attendance sync failed:', error);
      return result;
    }
  }

  /**
   * Process a single attendance record from device
   */
  private async processAttendanceRecord(
    record: AttendanceRecord,
    deviceId: string
  ): Promise<void> {
    // First, store the raw log
    const log = await prisma.attendanceLog.create({
      data: {
        deviceEmployeeNo: record.employeeNo,
        timestamp: record.time,
        verifyMode: record.verifyMode,
        inOutType: record.inOutType,
        deviceName: record.deviceName,
        deviceId: record.deviceSerial || deviceId,
        processed: false,
      },
    });

    // Try to find employee mapping
    const mapping = await prisma.biometricMapping.findUnique({
      where: { deviceEmployeeNo: record.employeeNo },
    });

    if (!mapping) {
      await prisma.attendanceLog.update({
        where: { id: log.id },
        data: {
          errorMessage: `No employee mapping found for device employee no: ${record.employeeNo}`,
        },
      });
      throw new Error(`No employee mapping found for ${record.employeeNo}`);
    }

    // Update log with employee ID
    await prisma.attendanceLog.update({
      where: { id: log.id },
      data: { employeeId: mapping.employeeId },
    });

    // Process the attendance
    await this.upsertAttendance(
      mapping.employeeId,
      record.time,
      record.inOutType,
      record.verifyMode,
      deviceId
    );

    // Mark log as processed
    await prisma.attendanceLog.update({
      where: { id: log.id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Create or update attendance record
   */
  private async upsertAttendance(
    employeeId: string,
    timestamp: Date,
    inOutType: number,
    verifyMode: number,
    deviceId: string
  ): Promise<void> {
    const dateOnly = startOfDay(timestamp);
    const isCheckIn = inOutType === 0 || inOutType === 3; // 0=In, 1=Out, 2=BreakOut, 3=BreakIn

    // Find existing attendance for the day
    let attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: dateOnly,
        },
      },
    });

    if (!attendance) {
      // Create new attendance
      await prisma.attendance.create({
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
      // Update existing attendance
      const updateData: any = {
        verifyMode,
        deviceId,
        source: 'BIOMETRIC',
      };

      // Update check-in if this is a check-in event and no check-in exists
      if (isCheckIn && !attendance.checkIn) {
        updateData.checkIn = timestamp;
      }
      // Update check-in if this event is earlier than existing check-in
      else if (isCheckIn && attendance.checkIn && timestamp < attendance.checkIn) {
        updateData.checkIn = timestamp;
      }
      // Update check-out if this is a check-out event
      else if (!isCheckIn) {
        // Always update check-out to the latest time
        if (!attendance.checkOut || timestamp > attendance.checkOut) {
          updateData.checkOut = timestamp;
        }
      }

      // Calculate work hours if both times exist
      const checkIn = updateData.checkIn || attendance.checkIn;
      const checkOut = updateData.checkOut || attendance.checkOut;

      if (checkIn && checkOut) {
        updateData.workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

        // Determine status based on work hours and check-in time
        const checkInTime = new Date(checkIn);
        const workHours = updateData.workHours;

        // Assuming standard work time is 8:30 AM and half-day is less than 4 hours
        const checkInHour = checkInTime.getHours() + checkInTime.getMinutes() / 60;

        if (checkInHour > 8.5) {
          updateData.status = 'LATE';
        } else if (workHours < 4) {
          updateData.status = 'HALF_DAY';
        } else {
          updateData.status = 'PRESENT';
        }
      }

      await prisma.attendance.update({
        where: { id: attendance.id },
        data: updateData,
      });
    }
  }

  /**
   * Sync employee list from device to database
   */
  async syncEmployeeList(): Promise<{
    success: boolean;
    synced: number;
    errors: string[];
  }> {
    const result = {
      success: false,
      synced: 0,
      errors: [] as string[],
    };

    try {
      if (!this.hikvisionClient) {
        const initialized = await this.initializeFromDatabase();
        if (!initialized) {
          result.errors.push('Failed to initialize client');
          return result;
        }
      }

      const employees = await this.hikvisionClient!.getEmployeeList();
      console.log(`Found ${employees.length} employees on device`);

      for (const emp of employees) {
        try {
          // Try to find existing mapping
          const existing = await prisma.biometricMapping.findUnique({
            where: { deviceEmployeeNo: emp.employeeNo },
          });

          if (existing) {
            console.log(`Employee ${emp.employeeNo} already mapped`);
            continue;
          }

          // Try to find user by employee ID
          const user = await prisma.user.findUnique({
            where: { employeeId: emp.employeeNo },
          });

          if (user) {
            await prisma.biometricMapping.create({
              data: {
                employeeId: user.id,
                deviceEmployeeNo: emp.employeeNo,
                fingerprintEnrolled: true,
                syncedAt: new Date(),
              },
            });
            result.synced++;
            console.log(`Mapped ${emp.employeeNo} to ${user.firstName} ${user.lastName}`);
          } else {
            result.errors.push(
              `No user found with employeeId: ${emp.employeeNo} (${emp.name})`
            );
          }
        } catch (error: any) {
          result.errors.push(`Error syncing ${emp.employeeNo}: ${error.message}`);
        }
      }

      result.success = true;
      return result;
    } catch (error: any) {
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Test device connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.hikvisionClient) {
        await this.initializeFromDatabase();
      }
      return await this.hikvisionClient!.testConnection();
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

/**
 * Factory function to create sync service
 */
export function createAttendanceSyncService(): AttendanceSyncService {
  return new AttendanceSyncService();
}
