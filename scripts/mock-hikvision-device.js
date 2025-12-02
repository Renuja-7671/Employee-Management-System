#!/usr/bin/env node

/**
 * Mock Hikvision Device Server
 *
 * This simulates a Hikvision DS-K1A8503EF-B fingerprint reader
 * for testing purposes without physical hardware.
 *
 * Usage:
 *   node scripts/mock-hikvision-device.js
 *
 * Then update HIKVISION_HOST=localhost in .env
 */

const http = require('http');
const url = require('url');

const PORT = 8064;
const USERNAME = 'admin';
const PASSWORD = 'admin123';

// Mock data
const mockEmployees = [
  { employeeNo: 'EMP001', name: 'John Doe' },
  { employeeNo: 'EMP002', name: 'Jane Smith' },
  { employeeNo: 'EMP003', name: 'Bob Johnson' },
  { employeeNo: 'EMP004', name: 'Alice Williams' },
  { employeeNo: 'EMP005', name: 'Charlie Brown' },
];

const mockAttendanceRecords = [];

// Generate some sample attendance records
function generateMockRecords() {
  const now = new Date();
  const records = [];

  // Generate records for last 3 days
  for (let day = 0; day < 3; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);

    mockEmployees.forEach((emp, idx) => {
      // Check-in (8:00 AM - 9:00 AM)
      const checkIn = new Date(date);
      checkIn.setHours(8, Math.floor(Math.random() * 60), 0);

      records.push({
        employeeNo: emp.employeeNo,
        name: emp.name,
        time: checkIn.toISOString(),
        verifyMode: 1, // Fingerprint
        inOutType: 0, // Check in
      });

      // Check-out (5:00 PM - 6:00 PM)
      const checkOut = new Date(date);
      checkOut.setHours(17, Math.floor(Math.random() * 60), 0);

      records.push({
        employeeNo: emp.employeeNo,
        name: emp.name,
        time: checkOut.toISOString(),
        verifyMode: 1, // Fingerprint
        inOutType: 1, // Check out
      });
    });
  }

  return records;
}

mockAttendanceRecords.push(...generateMockRecords());

// Basic auth check
function checkAuth(req) {
  const auth = req.headers.authorization;
  if (!auth) return false;

  const [type, credentials] = auth.split(' ');
  if (type !== 'Basic') return false;

  const decoded = Buffer.from(credentials, 'base64').toString();
  const [user, pass] = decoded.split(':');

  return user === USERNAME && pass === PASSWORD;
}

// XML response builders
function buildDeviceInfoXML() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<DeviceInfo>
  <deviceName>Mock Hikvision Device</deviceName>
  <deviceID>MOCK-DEVICE-001</deviceID>
  <model>DS-K1A8503EF-B</model>
  <serialNumber>MOCK-12345678</serialNumber>
  <macAddress>00:11:22:33:44:55</macAddress>
  <firmwareVersion>V4.2.0 build 230101</firmwareVersion>
  <firmwareReleasedDate>2023-01-01</firmwareReleasedDate>
  <deviceType>Access Control Terminal</deviceType>
</DeviceInfo>`;
}

function buildEmployeeListXML() {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<UserInfoSearch>
  <searchID>1</searchID>
  <responseStatusStrg>OK</responseStatusStrg>
  <numOfMatches>${mockEmployees.length}</numOfMatches>
  <totalMatches>${mockEmployees.length}</totalMatches>`;

  mockEmployees.forEach(emp => {
    xml += `
  <UserInfo>
    <employeeNo>${emp.employeeNo}</employeeNo>
    <name>${emp.name}</name>
    <userType>normal</userType>
    <Valid>
      <enable>true</enable>
      <beginTime>2020-01-01T00:00:00</beginTime>
      <endTime>2030-12-31T23:59:59</endTime>
    </Valid>
  </UserInfo>`;
  });

  xml += `
</UserInfoSearch>`;

  return xml;
}

function buildAttendanceRecordsXML(startTime, endTime, maxResults = 500) {
  // Filter records by time range
  let filtered = mockAttendanceRecords.filter(record => {
    const recordTime = new Date(record.time);
    return recordTime >= startTime && recordTime <= endTime;
  });

  filtered = filtered.slice(0, maxResults);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<AcsEvent>
  <searchID>1</searchID>
  <responseStatusStrg>OK</responseStatusStrg>
  <numOfMatches>${filtered.length}</numOfMatches>
  <totalMatches>${filtered.length}</totalMatches>`;

  filtered.forEach(record => {
    xml += `
  <InfoList>
    <employeeNoString>${record.employeeNo}</employeeNoString>
    <name>${record.name}</name>
    <time>${record.time}</time>
    <cardReaderVerifyMode>${record.verifyMode}</cardReaderVerifyMode>
    <attendanceStatus>${record.inOutType}</attendanceStatus>
    <deviceName>Mock Device</deviceName>
    <serialNo>MOCK-12345678</serialNo>
  </InfoList>`;
  });

  xml += `
</AcsEvent>`;

  return xml;
}

function buildAttendanceRecordsJSON(startTime, endTime, maxResults = 500) {
  let filtered = mockAttendanceRecords.filter(record => {
    const recordTime = new Date(record.time);
    return recordTime >= startTime && recordTime <= endTime;
  });

  filtered = filtered.slice(0, maxResults);

  return {
    AcsEvent: {
      searchID: '1',
      responseStatusStrg: 'OK',
      numOfMatches: filtered.length,
      totalMatches: filtered.length,
      InfoList: filtered.map(record => ({
        employeeNoString: record.employeeNo,
        name: record.name,
        time: record.time,
        cardReaderVerifyMode: record.verifyMode,
        attendanceStatus: record.inOutType,
        deviceName: 'Mock Device',
        serialNo: 'MOCK-12345678',
      })),
    },
  };
}

// HTTP Server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const query = parsedUrl.query;

  console.log(`${new Date().toISOString()} - ${req.method} ${path}`);

  // Check authentication
  if (!checkAuth(req)) {
    res.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="Mock Hikvision Device"',
      'Content-Type': 'text/plain',
    });
    res.end('Unauthorized');
    return;
  }

  // Handle different endpoints
  if (path === '/ISAPI/System/deviceInfo') {
    // Device information
    res.writeHead(200, { 'Content-Type': 'application/xml' });
    res.end(buildDeviceInfoXML());
  }
  else if (path === '/ISAPI/AccessControl/UserInfo/Search') {
    // Employee list
    if (query.format === 'json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        UserInfoSearch: {
          searchID: '1',
          responseStatusStrg: 'OK',
          numOfMatches: mockEmployees.length,
          totalMatches: mockEmployees.length,
          UserInfo: mockEmployees.map(emp => ({
            employeeNo: emp.employeeNo,
            name: emp.name,
            userType: 'normal',
          })),
        },
      }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end(buildEmployeeListXML());
    }
  }
  else if (path === '/ISAPI/AccessControl/AcsEvent') {
    // Attendance records
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      // Parse request to get time range
      let startTime = new Date();
      startTime.setDate(startTime.getDate() - 7); // Default: last 7 days
      let endTime = new Date();
      let maxResults = 500;

      // Try to parse XML body (simplified)
      if (body) {
        const startMatch = body.match(/<startTime>(.*?)<\/startTime>/);
        const endMatch = body.match(/<endTime>(.*?)<\/endTime>/);
        const maxMatch = body.match(/<maxResults>(.*?)<\/maxResults>/);

        if (startMatch) startTime = new Date(startMatch[1]);
        if (endMatch) endTime = new Date(endMatch[1]);
        if (maxMatch) maxResults = parseInt(maxMatch[1]);
      }

      console.log(`  Fetching records: ${startTime.toISOString()} to ${endTime.toISOString()}`);

      if (query.format === 'json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(buildAttendanceRecordsJSON(startTime, endTime, maxResults)));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/xml' });
        res.end(buildAttendanceRecordsXML(startTime, endTime, maxResults));
      }
    });
  }
  else if (path === '/ISAPI/Event/notification/httpHosts/1') {
    // Webhook configuration
    res.writeHead(200, { 'Content-Type': 'application/xml' });
    res.end('<?xml version="1.0"?><ResponseStatus><statusString>OK</statusString></ResponseStatus>');
  }
  else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('====================================');
  console.log('Mock Hikvision Device Server');
  console.log('====================================');
  console.log('');
  console.log(`Server running at: http://localhost:${PORT}`);
  console.log(`Username: ${USERNAME}`);
  console.log(`Password: ${PASSWORD}`);
  console.log('');
  console.log('Update your .env file:');
  console.log(`  HIKVISION_HOST=localhost`);
  console.log(`  HIKVISION_PORT=${PORT}`);
  console.log(`  HIKVISION_USERNAME=${USERNAME}`);
  console.log(`  HIKVISION_PASSWORD=${PASSWORD}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /ISAPI/System/deviceInfo');
  console.log('  POST /ISAPI/AccessControl/UserInfo/Search');
  console.log('  POST /ISAPI/AccessControl/AcsEvent');
  console.log('');
  console.log(`Mock data: ${mockEmployees.length} employees, ${mockAttendanceRecords.length} attendance records`);
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('====================================');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down mock device server...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});
