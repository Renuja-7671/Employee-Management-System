// src/components/admin/AttendanceManagement.tsx

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Clock, Download, Plus, Fingerprint, Monitor, FileText, RefreshCw, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { getAttendance, Attendance } from '@/lib/api/attendance';
import { getEmployees, Employee as EmployeeAPI } from '@/lib/api/employees';
import { BiometricMappings } from './BiometricMappings';
import { BiometricDevices } from './BiometricDevices';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

interface Employee extends EmployeeAPI {
  name: string;
}

export function AttendanceManagement() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    checkIn: '08:30',
    checkOut: '17:00',
  });
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  const [leaves, setLeaves] = useState<any[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<any[]>([]);
  const [syncingHolidays, setSyncingHolidays] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Use date range if both dates are set, otherwise fetch all
      const shouldUseFilter = startDate && endDate;
      
      const [attendanceResponse, employeesData, leavesResponse, holidaysResponse] = await Promise.all([
        shouldUseFilter 
          ? getAttendance(startDate, endDate, 1, 10000) // Fetch up to 10,000 records with date filter
          : getAttendance(undefined, undefined, 1, 10000), // Fetch up to 10,000 records without filter
        getEmployees(),
        fetch('/api/leaves', { next: { revalidate: 30 } }),
        fetch('/api/admin/holidays', { next: { revalidate: 3600 } }), // Cache holidays for 1 hour
      ]);

      setAttendance(attendanceResponse.attendance);
      // Transform employees data to include calling name
      const transformedEmployees = employeesData.map(emp => ({
        ...emp,
        name: emp.callingName || emp.fullName
      }));
      setEmployees(transformedEmployees);

      if (leavesResponse.ok) {
        const leavesData = await leavesResponse.json();
        setLeaves(leavesData.leaves || []);
      }

      if (holidaysResponse.ok) {
        const holidaysData = await holidaysResponse.json();
        setPublicHolidays(holidaysData.holidays || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    return employee ? employee.name : 'Unknown';
  };

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Create attendance record via API
      const response = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          date: formData.date,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to mark attendance');
      }

      toast.success('Attendance marked successfully');
      setShowAddDialog(false);
      setFormData({
        employeeId: '',
        date: new Date().toISOString().split('T')[0],
        checkIn: '08:30',
        checkOut: '17:00',
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark attendance');
    }
  };

  const formatTime = (dateTime: string | Date | null | undefined): string => {
    if (!dateTime) return 'N/A';
    try {
      const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const calculateHours = (checkIn: string | Date | null | undefined, checkOut: string | Date | null | undefined) => {
    if (!checkIn || !checkOut) return 'N/A';
    try {
      const checkInDate = typeof checkIn === 'string' ? new Date(checkIn) : checkIn;
      const checkOutDate = typeof checkOut === 'string' ? new Date(checkOut) : checkOut;

      const diffMs = checkOutDate.getTime() - checkInDate.getTime();
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      return `${hours}h ${minutes}m`;
    } catch (error) {
      return 'N/A';
    }
  };

  const calculateLateMinutes = (checkIn: string | Date | null | undefined, attendanceDate: string | Date, isWeekend?: boolean): number => {
    if (!checkIn) return 0;

    try {
      const checkInDate = typeof checkIn === 'string' ? new Date(checkIn) : checkIn;
      const attDate = new Date(attendanceDate);

      // Check if it's a Sunday
      const isSunday = attDate.getDay() === 0 || isWeekend;

      // Check if it's a company holiday (Poya or Mercantile)
      const dateStr = attDate.toISOString().split('T')[0];
      const isHoliday = publicHolidays.some(holiday => {
        const holidayStr = new Date(holiday.date).toISOString().split('T')[0];
        return holidayStr === dateStr;
      });

      // Don't calculate late minutes for Sundays or holidays
      // (employee came for urgent work, company is closed)
      if (isSunday || isHoliday) {
        return 0;
      }

      const checkInHour = checkInDate.getHours();
      const checkInMinute = checkInDate.getMinutes();

      // Company start time is 8:30 AM
      const startTimeMinutes = 8 * 60 + 30; // 510 minutes (8:30 AM)
      const checkInTimeMinutes = checkInHour * 60 + checkInMinute;

      // Calculate late minutes
      const lateMinutes = checkInTimeMinutes - startTimeMinutes;

      // Return 0 if not late, otherwise return the late minutes
      return lateMinutes > 0 ? lateMinutes : 0;
    } catch (error) {
      return 0;
    }
  };

  // Filter attendance by date range and employee
  const filteredAttendance = attendance.filter((a) => {
    if (!startDate || !endDate) return false;
    const attDate = new Date(a.date).toISOString().split('T')[0];
    const dateMatch = attDate >= startDate && attDate <= endDate;
    const employeeMatch = selectedEmployeeFilter === 'all' || a.employeeId === selectedEmployeeFilter;
    return dateMatch && employeeMatch;
  });

  // Helper function to check if a date is a Sunday
  const isSunday = (date: Date): boolean => {
    return date.getDay() === 0;
  };

  // Helper function to check if a date is a public holiday
  const isPublicHoliday = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    return publicHolidays.some(holiday => {
      const holidayDateStr = new Date(holiday.date).toISOString().split('T')[0];
      return holidayDateStr === dateStr;
    });
  };

  // Calculate working days between two dates (excluding Sundays and public holidays)
  const calculateWorkingDays = (start: Date, end: Date): number => {
    let workingDays = 0;
    const currentDate = new Date(start);

    while (currentDate <= end) {
      if (!isSunday(currentDate) && !isPublicHoliday(currentDate)) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  };

  const exportToCSV = () => {
    const headers = ['Employee', 'Employee ID', 'Date', 'Check In', 'Check Out', 'Late Minutes', 'Total Hours'];
    const rows = filteredAttendance.map((att) => {
      const employee = employees.find(e => e.id === att.employeeId);
      return [
        `"${getEmployeeName(att.employeeId)}"`,
        employee?.employeeId || 'N/A',
        att.date,
        formatTime(att.checkIn),
        formatTime(att.checkOut),
        `${calculateLateMinutes(att.checkIn, att.date, att.isWeekend)} min`,
        calculateHours(att.checkIn, att.checkOut),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // Create filename with employee filter details
    const employeeName = selectedEmployeeFilter !== 'all'
      ? employees.find(e => e.id === selectedEmployeeFilter)?.name.replace(/\s+/g, '_')
      : 'All';
    const filename = `attendance_${employeeName}_${startDate}_to_${endDate}.csv`;

    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredAttendance.length} attendance records`);
  };

  const syncHolidays = async () => {
    setSyncingHolidays(true);
    try {
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;

      toast.info('Syncing holidays... This may take a moment.');

      const results = [];

      // Sync current year and next year
      for (const year of [currentYear, nextYear]) {
        const response = await fetch('/api/admin/holidays/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            year,
            source: 'github',
            clearExisting: false,
            filterTypes: ['POYA', 'MERCANTILE'], // Only Poya days and Mercantile holidays
          }),
        });

        const data = await response.json();

        if (response.ok) {
          results.push(`${year}: ${data.created} created, ${data.skipped} skipped`);
        } else {
          throw new Error(data.error || `Failed to sync ${year}`);
        }
      }

      toast.success(`Holidays synced successfully!\n${results.join('\n')}`);
    } catch (error: any) {
      console.error('Error syncing holidays:', error);
      toast.error(error.message || 'Failed to sync holidays');
    } finally {
      setSyncingHolidays(false);
    }
  };

  const generatePDFReport = () => {
    if (!startDate || !endDate) {
      toast.error('Please select start and end dates for the report');
      return;
    }

    if (filteredAttendance.length === 0) {
      toast.error('No attendance data found for the selected date range');
      return;
    }

    // Calculate total working days in the selected period
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const totalWorkingDays = calculateWorkingDays(startDateObj, endDateObj);

    // Calculate statistics per employee
    const employeeStats = new Map<string, {
      employeeId: string;
      name: string;
      workedDays: number;
      approvedLeaveDays: number;
      totalLateMinutes: number;
    }>();

    // Process attendance data
    filteredAttendance.forEach((att: Attendance) => {
      const empId = att.employeeId;
      const employee = employees.find(e => e.id === empId);

      if (!employee) return;

      if (!employeeStats.has(empId)) {
        employeeStats.set(empId, {
          employeeId: employee.employeeId,
          name: employee.name,
          workedDays: 0,
          approvedLeaveDays: 0,
          totalLateMinutes: 0,
        });
      }

      const stats = employeeStats.get(empId)!;
      stats.workedDays += 1;
      stats.totalLateMinutes += calculateLateMinutes(att.checkIn, att.date, att.isWeekend);
    });

    // Calculate approved leave days for each ACTIVE employee in the date range
    const activeEmployees = employees.filter(emp => emp.isActive);
    activeEmployees.forEach(emp => {
      const employeeLeaves = leaves.filter(leave =>
        leave.employeeId === emp.id &&
        leave.status === 'APPROVED' &&
        new Date(leave.startDate) <= endDateObj &&
        new Date(leave.endDate) >= startDateObj
      );

      let approvedDays = 0;
      employeeLeaves.forEach(leave => {
        const leaveStart = new Date(Math.max(new Date(leave.startDate).getTime(), startDateObj.getTime()));
        const leaveEnd = new Date(Math.min(new Date(leave.endDate).getTime(), endDateObj.getTime()));
        // Calculate working days excluding Sundays and holidays
        approvedDays += calculateWorkingDays(leaveStart, leaveEnd);
      });

      if (!employeeStats.has(emp.id)) {
        employeeStats.set(emp.id, {
          employeeId: emp.employeeId,
          name: emp.name,
          workedDays: 0,
          approvedLeaveDays: approvedDays,
          totalLateMinutes: 0,
        });
      } else {
        employeeStats.get(emp.id)!.approvedLeaveDays = approvedDays;
      }
    });

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Add logo
    const logoImg = new Image();
    logoImg.src = '/images/logo-dark.png';

    try {
      doc.addImage(logoImg, 'PNG', pageWidth / 2 - 25, 10, 50, 20);
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }

    // Add report title
    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246);
    doc.text('Attendance Report for Finance Department', pageWidth / 2, 42, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, pageWidth / 2, 50, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 57, { align: 'center' });

    // Add summary statistics
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.text('Summary Statistics', 14, 68);

    const totalActiveEmployees = employees.filter(emp => emp.isActive).length;
    const totalInactiveEmployees = employees.filter(emp => !emp.isActive).length;
    const totalLeaveDays = Array.from(employeeStats.values()).reduce((sum, emp) => sum + emp.approvedLeaveDays, 0);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Active Employees: ${totalActiveEmployees}`, 14, 76);
    doc.text(`Total Inactive Employees: ${totalInactiveEmployees}`, 14, 82);
    doc.text(`Working Days in Period: ${totalWorkingDays} (excluding Sundays & holidays)`, 14, 88);
    doc.text(`Total Approved Leave Days: ${totalLeaveDays}`, 14, 94);

    // Add employee details table
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.text('Employee Attendance Details', 14, 104);

    // Filter to only include active employees in the table
    const activeEmployeeIds = new Set(activeEmployees.map(emp => emp.id));
    const tableData = Array.from(employeeStats.values())
      .filter(emp => {
        // Find the employee and check if active
        const employee = employees.find(e => e.employeeId === emp.employeeId);
        return employee && activeEmployeeIds.has(employee.id);
      })
      .map(emp => [
        emp.employeeId,
        emp.name,
        emp.workedDays.toString(),
        emp.approvedLeaveDays.toString(),
        emp.totalLateMinutes.toString(),
        emp.totalLateMinutes > 60 ? `EXCEEDED (${emp.totalLateMinutes - 60} min)` : 'WITHIN LIMIT',
      ]);

    autoTable(doc, {
      startY: 111,
      head: [['EMP ID', 'Employee Name', 'Worked Days', 'Leave Days', 'Late Min', 'Status (60 min)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 50 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 30 },
      },
      didDrawPage: () => {
        // Add page numbers on each page as table is drawn
        const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
        const totalPages = doc.getNumberOfPages();
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${currentPage} of ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      },
    });

    // Add footer notes
    const finalY = (doc as any).lastAutoTable.finalY || 105;
    const pageHeight = doc.internal.pageSize.height;
    
    // Check if we need a new page (if less than 60 units from bottom)
    let currentY = finalY + 15;
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 20; // Start from top of new page
    }
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Notes:', 14, currentY);
    doc.setFontSize(9);
    doc.text('• Late minutes are calculated based on 8:30 AM start time', 14, currentY + 7);
    doc.text('• Sundays and company holidays (Poya & Mercantile) are excluded from late calculations', 14, currentY + 13);
    doc.text('• Each employee has 60 late minutes allowance per month', 14, currentY + 19);
    doc.text('• EXCEEDED indicates employee exceeded late minutes allowance', 14, currentY + 25);
    doc.text('• WITHIN LIMIT indicates employee within late minutes allowance', 14, currentY + 31);
    doc.text('• Only active employees are included in this report', 14, currentY + 37);

    // Update page numbers on all pages after table is complete
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(9);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Save PDF
    doc.save(`Attendance_Report_${startDate}_to_${endDate}.pdf`);
    toast.success('PDF report generated successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="records" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="records">
            <Clock className="w-4 h-4 mr-2" />
            Attendance Records
          </TabsTrigger>
          <TabsTrigger value="mappings">
            <Fingerprint className="w-4 h-4 mr-2" />
            Employee Mappings
          </TabsTrigger>
          <TabsTrigger value="devices">
            <Monitor className="w-4 h-4 mr-2" />
            Devices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate Attendance Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <Button onClick={generatePDFReport} className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate PDF Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sync Holidays</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Sync Poya days and Mercantile holidays (bank holidays) for the current and next year.
                    </p>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-700">
                        <strong>Automatic Sync:</strong> Holidays are automatically synced on the 1st of every month via cron job.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={syncHolidays}
                    disabled={syncingHolidays}
                    className="w-full"
                    variant="outline"
                  >
                    {syncingHolidays ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Manual Sync Now
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-5 w-5 text-gray-500" />
                  <h3 className="font-medium text-sm">Filter Options</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="viewStartDate" className="text-sm mb-2 block">Start Date</Label>
                    <Input
                      id="viewStartDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder="Start Date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="viewEndDate" className="text-sm mb-2 block">End Date</Label>
                    <Input
                      id="viewEndDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="End Date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="employeeFilter" className="text-sm mb-2 block">Employee</Label>
                    <Select
                      value={selectedEmployeeFilter}
                      onValueChange={setSelectedEmployeeFilter}
                    >
                      <SelectTrigger id="employeeFilter">
                        <SelectValue placeholder="All Employees" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} ({emp.employeeId})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button 
                    onClick={fetchData} 
                    variant="outline"
                    size="sm"
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Loading...' : 'Apply Filter'}
                  </Button>
                  <Button 
                    onClick={() => {
                      setStartDate(new Date().toISOString().split('T')[0]);
                      setEndDate(new Date().toISOString().split('T')[0]);
                      setSelectedEmployeeFilter('all');
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    Clear Filters
                  </Button>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Showing {filteredAttendance.length} record{filteredAttendance.length !== 1 ? 's' : ''}
                    {selectedEmployeeFilter !== 'all' && ` for ${employees.find(e => e.id === selectedEmployeeFilter)?.name}`}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportToCSV}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Mark Attendance
                        </Button>
                      </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Mark Employee Attendance</DialogTitle>
                    <DialogDescription>
                      Record check-in and check-out times for an employee.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleMarkAttendance} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="employee">Employee</Label>
                      <Select
                        value={formData.employeeId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, employeeId: value })
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name} ({emp.employeeId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) =>
                          setFormData({ ...formData, date: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="checkIn">Check In</Label>
                        <Input
                          id="checkIn"
                          type="time"
                          value={formData.checkIn}
                          onChange={(e) =>
                            setFormData({ ...formData, checkIn: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="checkOut">Check Out</Label>
                        <Input
                          id="checkOut"
                          type="time"
                          value={formData.checkOut}
                          onChange={(e) =>
                            setFormData({ ...formData, checkOut: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">
                      Mark Attendance
                    </Button>
                  </form>
                </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>

              <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Late Minutes</TableHead>
                  <TableHead>Total Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendance.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-gray-500 py-8"
                    >
                      No attendance records found for selected date range
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttendance.map((att) => {
                    const lateMinutes = calculateLateMinutes(att.checkIn, att.date, att.isWeekend);
                    return (
                      <TableRow key={att.id}>
                        <TableCell className="font-medium">
                          {getEmployeeName(att.employeeId)}
                        </TableCell>
                        <TableCell>
                          {new Date(att.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-500" />
                            {formatTime(att.checkIn)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-500" />
                            {formatTime(att.checkOut)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={lateMinutes > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                            {lateMinutes} min
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {calculateHours(att.checkIn, att.checkOut)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="mappings" className="mt-6">
          <BiometricMappings />
        </TabsContent>

        <TabsContent value="devices" className="mt-6">
          <BiometricDevices />
        </TabsContent>
      </Tabs>
    </div>
  );
}