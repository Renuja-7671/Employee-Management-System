// src/lib/services/hikvision.ts

import axios, { AxiosInstance } from 'axios';
import { createHash } from 'crypto';

/**
 * Hikvision ISAPI Client for DS-K1A8503EF-B Fingerprint Reader
 * Supports HTTP API and ISAPI protocol for attendance data retrieval
 */

export interface HikvisionConfig {
  host: string; // IP address of the device
  port: number; // Default: 80
  username: string; // Device admin username
  password: string; // Device admin password
  protocol?: 'http' | 'https'; // Default: http
}

export interface AttendanceRecord {
  employeeNo: string; // Employee ID from device
  name?: string; // Employee name (if available)
  time: Date; // Punch time
  verifyMode: number; // 0: Card, 1: Fingerprint, 2: Face, etc.
  inOutType: number; // 0: Check In, 1: Check Out, 2: Break Out, 3: Break In, etc.
  deviceName?: string;
  deviceSerial?: string;
}

export interface DeviceInfo {
  deviceName: string;
  deviceModel: string;
  serialNumber: string;
  firmwareVersion: string;
  macAddress: string;
}

export class HikvisionClient {
  private client: AxiosInstance;
  private config: HikvisionConfig;

  constructor(config: HikvisionConfig) {
    this.config = {
      protocol: 'http',
      ...config,
    };

    const baseURL = `${this.config.protocol}://${this.config.host}:${this.config.port}`;

    this.client = axios.create({
      baseURL,
      timeout: 10000,
      auth: {
        username: this.config.username,
        password: this.config.password,
      },
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  }

  /**
   * Test connection to the device
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/ISAPI/System/deviceInfo');
      return response.status === 200;
    } catch (error) {
      console.error('Hikvision connection test failed:', error);
      return false;
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo(): Promise<DeviceInfo | null> {
    try {
      const response = await this.client.get('/ISAPI/System/deviceInfo');

      // Parse XML response (simplified - you may want to use xml2js library)
      const data = response.data;

      return {
        deviceName: this.extractXMLValue(data, 'deviceName'),
        deviceModel: this.extractXMLValue(data, 'model'),
        serialNumber: this.extractXMLValue(data, 'serialNumber'),
        firmwareVersion: this.extractXMLValue(data, 'firmwareVersion'),
        macAddress: this.extractXMLValue(data, 'macAddress'),
      };
    } catch (error) {
      console.error('Failed to get device info:', error);
      return null;
    }
  }

  /**
   * Get attendance records from device
   * @param startTime - Start time for records (default: 24 hours ago)
   * @param endTime - End time for records (default: now)
   * @param maxResults - Maximum number of records to retrieve (default: 500)
   */
  async getAttendanceRecords(
    startTime?: Date,
    endTime?: Date,
    maxResults: number = 500
  ): Promise<AttendanceRecord[]> {
    try {
      const start = startTime || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const end = endTime || new Date();

      // Build search XML
      const searchXML = this.buildAttendanceSearchXML(start, end, maxResults);

      const response = await this.client.post(
        '/ISAPI/AccessControl/AcsEvent?format=json',
        searchXML
      );

      return this.parseAttendanceRecords(response.data);
    } catch (error) {
      console.error('Failed to get attendance records:', error);
      return [];
    }
  }

  /**
   * Alternative method: Get transaction logs (works on most Hikvision models)
   */
  async getTransactionLogs(
    startTime?: Date,
    endTime?: Date
  ): Promise<AttendanceRecord[]> {
    try {
      const start = startTime || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const end = endTime || new Date();

      const searchXML = `<?xml version="1.0" encoding="UTF-8"?>
<AcsEventCond>
  <searchID>0</searchID>
  <searchResultPosition>0</searchResultPosition>
  <maxResults>500</maxResults>
  <major>5</major>
  <minor>75</minor>
  <startTime>${this.formatISAPITime(start)}</startTime>
  <endTime>${this.formatISAPITime(end)}</endTime>
</AcsEventCond>`;

      const response = await this.client.post(
        '/ISAPI/AccessControl/AcsEvent',
        searchXML
      );

      return this.parseAttendanceRecords(response.data);
    } catch (error) {
      console.error('Failed to get transaction logs:', error);
      return [];
    }
  }

  /**
   * Configure webhook/event notification
   * This enables the device to send real-time events to your server
   */
  async configureEventNotification(
    webhookUrl: string,
    protocolType: 'HTTP' | 'HTTPS' = 'HTTP'
  ): Promise<boolean> {
    try {
      const configXML = `<?xml version="1.0" encoding="UTF-8"?>
<HttpHostNotification>
  <id>1</id>
  <url>${webhookUrl}</url>
  <protocolType>${protocolType}</protocolType>
  <parameterFormatType>XML</parameterFormatType>
  <addressingFormatType>ipaddress</addressingFormatType>
  <ipAddress>${new URL(webhookUrl).hostname}</ipAddress>
  <portNo>${new URL(webhookUrl).port || 80}</portNo>
  <httpAuthenticationMethod>none</httpAuthenticationMethod>
</HttpHostNotification>`;

      const response = await this.client.put(
        '/ISAPI/Event/notification/httpHosts/1',
        configXML
      );

      return response.status === 200;
    } catch (error) {
      console.error('Failed to configure event notification:', error);
      return false;
    }
  }

  /**
   * Get list of employees/persons from device
   */
  async getEmployeeList(): Promise<Array<{ employeeNo: string; name: string }>> {
    try {
      const response = await this.client.post(
        '/ISAPI/AccessControl/UserInfo/Search?format=json',
        {
          UserInfoSearchCond: {
            searchID: '0',
            maxResults: 1000,
            searchResultPosition: 0,
          },
        }
      );

      const users = response.data?.UserInfoSearch?.UserInfo || [];
      return users.map((user: any) => ({
        employeeNo: user.employeeNo,
        name: user.name,
      }));
    } catch (error) {
      console.error('Failed to get employee list:', error);
      return [];
    }
  }

  /**
   * Sync employee to device (for fingerprint enrollment)
   */
  async syncEmployeeToDevice(
    employeeNo: string,
    name: string,
    cardNo?: string
  ): Promise<boolean> {
    try {
      const userXML = `<?xml version="1.0" encoding="UTF-8"?>
<UserInfo>
  <employeeNo>${employeeNo}</employeeNo>
  <name>${name}</name>
  <userType>normal</userType>
  ${cardNo ? `<cardNo>${cardNo}</cardNo>` : ''}
  <Valid>
    <enable>true</enable>
    <beginTime>2020-01-01T00:00:00</beginTime>
    <endTime>2030-12-31T23:59:59</endTime>
  </Valid>
</UserInfo>`;

      const response = await this.client.put(
        `/ISAPI/AccessControl/UserInfo/Record?format=json`,
        userXML
      );

      return response.status === 200;
    } catch (error) {
      console.error('Failed to sync employee to device:', error);
      return false;
    }
  }

  // Helper methods

  private buildAttendanceSearchXML(
    startTime: Date,
    endTime: Date,
    maxResults: number
  ): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<AcsEventCond>
  <searchID>0</searchID>
  <searchResultPosition>0</searchResultPosition>
  <maxResults>${maxResults}</maxResults>
  <major>5</major>
  <minor>75</minor>
  <startTime>${this.formatISAPITime(startTime)}</startTime>
  <endTime>${this.formatISAPITime(endTime)}</endTime>
</AcsEventCond>`;
  }

  private formatISAPITime(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, '+08:00');
  }

  private parseAttendanceRecords(data: any): AttendanceRecord[] {
    try {
      // Handle both XML and JSON responses
      let events: any[] = [];

      if (typeof data === 'string') {
        // Parse XML (simplified - consider using xml2js)
        events = this.parseXMLEvents(data);
      } else {
        // Handle JSON
        events = data?.AcsEvent?.InfoList || [];
      }

      return events.map((event: any) => ({
        employeeNo: event.employeeNoString || event.employeeNo || '',
        name: event.name || '',
        time: new Date(event.time || event.dateTime),
        verifyMode: parseInt(event.verifyMode || event.cardReaderVerifyMode || '0'),
        inOutType: parseInt(event.inOutType || event.attendanceStatus || '0'),
        deviceName: event.deviceName || '',
        deviceSerial: event.serialNo || '',
      }));
    } catch (error) {
      console.error('Failed to parse attendance records:', error);
      return [];
    }
  }

  private parseXMLEvents(xml: string): any[] {
    // Simple XML parsing - for production, use xml2js library
    const events: any[] = [];
    // Use global flag with manual looping instead of 's' flag for ES5 compatibility
    const regex = /<InfoList>([\s\S]*?)<\/InfoList>/g;
    let match;

    while ((match = regex.exec(xml)) !== null) {
      events.push({
        employeeNo: this.extractXMLValue(match[1], 'employeeNoString'),
        name: this.extractXMLValue(match[1], 'name'),
        time: this.extractXMLValue(match[1], 'time'),
        verifyMode: this.extractXMLValue(match[1], 'cardReaderVerifyMode'),
        inOutType: this.extractXMLValue(match[1], 'attendanceStatus'),
      });
    }

    return events;
  }

  private extractXMLValue(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}>(.*?)<\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : '';
  }
}

/**
 * Factory function to create Hikvision client from environment variables
 */
export function createHikvisionClient(): HikvisionClient {
  const config: HikvisionConfig = {
    host: process.env.HIKVISION_HOST || '192.168.1.200',
    port: parseInt(process.env.HIKVISION_PORT || '80'),
    username: process.env.HIKVISION_USERNAME || 'admin',
    password: process.env.HIKVISION_PASSWORD || '',
    protocol: (process.env.HIKVISION_PROTOCOL as 'http' | 'https') || 'http',
  };

  return new HikvisionClient(config);
}
