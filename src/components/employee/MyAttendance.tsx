'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Clock, Download, Calendar as CalendarIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MyAttendanceProps {
  user: any;
}

export function MyAttendance({ user }: MyAttendanceProps) {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7));

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const response = await fetch(`/api/attendance?employeeId=${user.id}`, {
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setAttendance(data.attendance || []);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
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

  const calculateHours = (checkIn: string | Date | null | undefined, checkOut: string | Date | null | undefined): number => {
    if (!checkIn || !checkOut) return 0;

    try {
      const checkInDate = typeof checkIn === 'string' ? new Date(checkIn) : checkIn;
      const checkOutDate = typeof checkOut === 'string' ? new Date(checkOut) : checkOut;

      const diffMs = checkOutDate.getTime() - checkInDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      return diffHours;
    } catch (error) {
      return 0;
    }
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const filteredAttendance = filterMonth
    ? attendance.filter(a => {
        const attDate = new Date(a.date);
        const filterDate = new Date(filterMonth);
        return attDate.getFullYear() === filterDate.getFullYear() &&
               attDate.getMonth() === filterDate.getMonth();
      })
    : attendance;

  const stats = {
    totalDays: filteredAttendance.length,
    totalHours: filteredAttendance.reduce((sum, a) => sum + calculateHours(a.checkIn, a.checkOut), 0),
    avgHours: filteredAttendance.length > 0
      ? filteredAttendance.reduce((sum, a) => sum + calculateHours(a.checkIn, a.checkOut), 0) / filteredAttendance.length
      : 0,
  };

  // Prepare chart data (last 7 days)
  const chartData = filteredAttendance
    .slice(0, 7)
    .reverse()
    .map(a => ({
      date: new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      hours: calculateHours(a.checkIn, a.checkOut),
    }));

  const exportToCSV = () => {
    const headers = ['Date', 'Check In', 'Check Out', 'Total Hours'];
    const rows = filteredAttendance.map(att => [
      new Date(att.date).toLocaleDateString(),
      formatTime(att.checkIn),
      formatTime(att.checkOut),
      formatHours(calculateHours(att.checkIn, att.checkOut)),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_attendance_${filterMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Days</CardTitle>
            <CalendarIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.totalDays}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatHours(stats.totalHours)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Average Hours/Day</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatHours(stats.avgHours)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Work Hours (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: any) => formatHours(value)} />
                <Legend />
                <Bar dataKey="hours" fill="#3b82f6" name="Work Hours" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No attendance data available for chart
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Attendance Records</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="filterMonth">Filter by Month</Label>
            <Input
              id="filterMonth"
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="max-w-xs"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">
                    No attendance records found for selected month
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttendance.map((att) => (
                  <TableRow key={att.id}>
                    <TableCell>{new Date(att.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(att.checkIn)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(att.checkOut)}
                      </div>
                    </TableCell>
                    <TableCell>{formatHours(calculateHours(att.checkIn, att.checkOut))}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
