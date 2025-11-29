'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { Download, Calendar, TrendingUp, Users, FileText, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

interface EmployeeLeaveSummary {
  employee: {
    id: string;
    employeeId: string;
    name: string;
    firstName: string;
    lastName: string;
    department: string;
    position: string;
    dateOfJoining: string;
  };
  leaveTaken: {
    ANNUAL: { approved: number; pending: number; declined: number };
    CASUAL: { approved: number; pending: number; declined: number };
    MEDICAL: { approved: number; pending: number; declined: number };
    OFFICIAL: { approved: number; pending: number; declined: number };
  };
  totalApprovedLeaves: number;
  leaveFrequency: number;
  remainingBalance: {
    annual: number;
    casual: number;
    medical: number;
    official: number;
  };
  monthlyDistribution: number[];
}

interface CompanyStats {
  totalEmployees: number;
  totalLeavesApproved: number;
  averageLeavesPerEmployee: number;
  leaveTypeDistribution: {
    ANNUAL: number;
    CASUAL: number;
    MEDICAL: number;
    OFFICIAL: number;
  };
}

interface TodayAttendance {
  totalEmployees: number;
  presentCount: number;
  absentCount: number;
  onLeaveCount: number;
  attendancePercentage: number;
  date: string;
}

const COLORS = ['#14b8a6', '#3b82f6', '#f59e0b', '#8b5cf6'];
const LEAVE_TYPE_COLORS = {
  ANNUAL: '#14b8a6',
  CASUAL: '#3b82f6',
  MEDICAL: '#f59e0b',
  OFFICIAL: '#8b5cf6',
};

export default function LeaveSummary() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [employees, setEmployees] = useState<EmployeeLeaveSummary[]>([]);
  const [companyStats, setCompanyStats] = useState<CompanyStats | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaveSummary();
    fetchTodayAttendance();
  }, [year]);

  const fetchLeaveSummary = async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        toast.error('Please log in again');
        return;
      }

      const user = JSON.parse(userStr);
      const response = await fetch(`/api/leaves/summary?year=${year}&adminId=${user.id}`);
      const data = await response.json();

      if (data.success) {
        setEmployees(data.employees);
        setCompanyStats(data.companyStats);
      } else {
        toast.error(data.error || 'Failed to fetch leave summary');
      }
    } catch (error) {
      console.error('Error fetching leave summary:', error);
      toast.error('Failed to fetch leave summary');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const user = JSON.parse(userStr);
      const response = await fetch(`/api/attendance/today?adminId=${user.id}`);
      const data = await response.json();

      if (data.success) {
        setTodayAttendance(data);
      }
    } catch (error) {
      console.error('Error fetching today\'s attendance:', error);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Add title
    doc.setFontSize(18);
    doc.setTextColor(20, 184, 166);
    doc.text('Employee Leave Summary Report', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Year: ${year}`, pageWidth / 2, 30, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 37, { align: 'center' });

    // Add company statistics
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.text('Company Statistics', 14, 50);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Employees: ${companyStats?.totalEmployees || 0}`, 14, 58);
    doc.text(`Total Leaves Approved: ${companyStats?.totalLeavesApproved || 0} days`, 14, 64);
    doc.text(`Average Leaves Per Employee: ${companyStats?.averageLeavesPerEmployee || 0} days`, 14, 70);

    // Add leave type distribution
    doc.text('Leave Distribution by Type:', 14, 80);
    doc.text(`Annual: ${companyStats?.leaveTypeDistribution.ANNUAL || 0} days`, 20, 86);
    doc.text(`Casual: ${companyStats?.leaveTypeDistribution.CASUAL || 0} days`, 20, 92);
    doc.text(`Medical: ${companyStats?.leaveTypeDistribution.MEDICAL || 0} days`, 20, 98);
    doc.text(`Official: ${companyStats?.leaveTypeDistribution.OFFICIAL || 0} days`, 20, 104);

    // Add employee details table
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.text('Employee Leave Details', 14, 118);

    const tableData = employees.map(emp => [
      emp.employee.employeeId,
      emp.employee.name,
      emp.employee.department || 'N/A',
      emp.leaveTaken.ANNUAL.approved.toString(),
      emp.leaveTaken.CASUAL.approved.toString(),
      emp.leaveTaken.MEDICAL.approved.toString(),
      emp.leaveTaken.OFFICIAL.approved.toString(),
      emp.totalApprovedLeaves.toString(),
    ]);

    autoTable(doc, {
      startY: 125,
      head: [['EMP ID', 'Name', 'Department', 'Annual', 'Casual', 'Medical', 'Official', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [20, 184, 166], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30 },
        3: { cellWidth: 18 },
        4: { cellWidth: 18 },
        5: { cellWidth: 18 },
        6: { cellWidth: 18 },
        7: { cellWidth: 18 },
      },
    });

    // Save PDF
    doc.save(`Leave_Summary_Report_${year}.pdf`);
    toast.success('PDF exported successfully');
  };

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading leave summary...</div>
      </div>
    );
  }

  const selectedEmployeeData = selectedEmployee
    ? employees.find(e => e.employee.id === selectedEmployee)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employee Leave Summary</h2>
          <p className="text-sm text-gray-600 mt-1">
            Comprehensive overview of employee leave patterns and statistics
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportToPDF} className="bg-teal-600 hover:bg-teal-700">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Company Statistics */}
      {companyStats && todayAttendance && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Today's Attendance Card */}
          <Card className="md:col-span-1 border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Today&apos;s Attendance</p>
                  <p className="text-3xl font-bold text-green-600">{todayAttendance.presentCount}/{todayAttendance.totalEmployees}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Present:</span>
                      <span className="font-semibold text-green-700">{todayAttendance.presentCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">On Leave:</span>
                      <span className="font-semibold text-blue-600">{todayAttendance.onLeaveCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Absent:</span>
                      <span className="font-semibold text-red-600">{todayAttendance.absentCount}</span>
                    </div>
                  </div>
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${todayAttendance.attendancePercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">{todayAttendance.attendancePercentage}% attendance</p>
                </div>
                <UserCheck className="h-10 w-10 text-green-600 ml-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold text-gray-900">{companyStats.totalEmployees}</p>
                </div>
                <Users className="h-8 w-8 text-teal-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Leaves</p>
                  <p className="text-2xl font-bold text-gray-900">{companyStats.totalLeavesApproved}</p>
                  <p className="text-xs text-gray-500">days approved</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Per Employee</p>
                  <p className="text-2xl font-bold text-gray-900">{companyStats.averageLeavesPerEmployee}</p>
                  <p className="text-xs text-gray-500">days/employee</p>
                </div>
                <TrendingUp className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Most Common Type</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.entries(companyStats.leaveTypeDistribution).reduce((a, b) =>
                      b[1] > a[1] ? b : a
                    )[0]}
                  </p>
                  <p className="text-xs text-gray-500">
                    {Object.entries(companyStats.leaveTypeDistribution).reduce((a, b) =>
                      b[1] > a[1] ? b : a
                    )[1]} days
                  </p>
                </div>
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Company-wide Leave Distribution */}
      {companyStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Leave Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Annual', value: companyStats.leaveTypeDistribution.ANNUAL },
                      { name: 'Casual', value: companyStats.leaveTypeDistribution.CASUAL },
                      { name: 'Medical', value: companyStats.leaveTypeDistribution.MEDICAL },
                      { name: 'Official', value: companyStats.leaveTypeDistribution.OFFICIAL },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 10 Employees by Leave Days</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={employees.slice(0, 10).sort((a, b) => b.totalApprovedLeaves - a.totalApprovedLeaves)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="employee.firstName"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalApprovedLeaves" fill="#14b8a6" name="Total Days" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Employee Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map(emp => {
          const leaveData = [
            { type: 'Annual', value: emp.leaveTaken.ANNUAL.approved, color: LEAVE_TYPE_COLORS.ANNUAL },
            { type: 'Casual', value: emp.leaveTaken.CASUAL.approved, color: LEAVE_TYPE_COLORS.CASUAL },
            { type: 'Medical', value: emp.leaveTaken.MEDICAL.approved, color: LEAVE_TYPE_COLORS.MEDICAL },
            { type: 'Official', value: emp.leaveTaken.OFFICIAL.approved, color: LEAVE_TYPE_COLORS.OFFICIAL },
          ];

          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthlyData = emp.monthlyDistribution.map((days, index) => ({
            month: monthNames[index],
            days,
          }));

          return (
            <Card key={emp.employee.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{emp.employee.name}</CardTitle>
                    <p className="text-sm text-gray-600">{emp.employee.employeeId}</p>
                    <p className="text-xs text-gray-500">{emp.employee.department} • {emp.employee.position}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-teal-600">{emp.totalApprovedLeaves}</p>
                    <p className="text-xs text-gray-500">days taken</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Leave Type Breakdown */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Leave Breakdown</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {leaveData.map(item => (
                      <div key={item.type} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                          {item.type}
                        </span>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monthly Chart */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Monthly Distribution</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="days" stroke="#14b8a6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Leave Frequency */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Leave Frequency:</span>
                    <span className="font-semibold">{emp.leaveFrequency} days/month</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {employees.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No employee data available for {year}</p>
        </div>
      )}
    </div>
  );
}
