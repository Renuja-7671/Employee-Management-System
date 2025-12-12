'use client';

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
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

export const MyAttendance = memo(function MyAttendance({ user }: MyAttendanceProps) {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7));

  // Fetch attendance data for selected month only
  const fetchAttendance = useCallback(async (month: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/employees/${user.id}/attendance?month=${month}`, {
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
  }, [user.id]);

  useEffect(() => {
    fetchAttendance(filterMonth);
  }, [filterMonth, fetchAttendance]);

  // Handle month change
  const handleMonthChange = useCallback((newMonth: string) => {
    setFilterMonth(newMonth);
  }, []);

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

  const calculateLateMinutes = (checkIn: string | Date | null | undefined): number => {
    if (!checkIn) return 0;

    try {
      const checkInDate = typeof checkIn === 'string' ? new Date(checkIn) : checkIn;
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

  // Memoize stats calculation for performance
  const stats = useMemo(() => {
    const totalHours = attendance.reduce((sum, a) => sum + calculateHours(a.checkIn, a.checkOut), 0);
    return {
      totalDays: attendance.length,
      totalHours,
      avgHours: attendance.length > 0 ? totalHours / attendance.length : 0,
      totalLateMinutes: attendance.reduce((sum, a) => sum + calculateLateMinutes(a.checkIn), 0),
    };
  }, [attendance]);

  // Memoize chart data (last 7 days)
  const chartData = useMemo(() =>
    attendance
      .slice(0, 7)
      .reverse()
      .map(a => ({
        date: new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hours: calculateHours(a.checkIn, a.checkOut),
      }))
  , [attendance]);

  const exportToCSV = () => {
    const headers = ['Date', 'Check In', 'Check Out', 'Late Minutes', 'Total Hours'];
    const rows = attendance.map((att: any) => [
      new Date(att.date).toLocaleDateString(),
      formatTime(att.checkIn),
      formatTime(att.checkOut),
      `${calculateLateMinutes(att.checkIn)} min`,
      formatHours(calculateHours(att.checkIn, att.checkOut)),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any) => row.join(',')),
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
      <div className="grid gap-4 md:grid-cols-4">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Late Minutes</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl ${stats.totalLateMinutes > 60 ? 'text-red-600' : ''}`}>
              {stats.totalLateMinutes} min
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalLateMinutes > 60
                ? `Exceeded by ${stats.totalLateMinutes - 60} min`
                : `${60 - stats.totalLateMinutes} min remaining`}
            </p>
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
              onChange={(e) => handleMonthChange(e.target.value)}
              className="max-w-xs"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Late Minutes</TableHead>
                <TableHead>Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    No attendance records found for selected month
                  </TableCell>
                </TableRow>
              ) : (
                attendance.map((att: any) => {
                  const lateMinutes = calculateLateMinutes(att.checkIn);
                  return (
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
                      <TableCell>
                        <span className={lateMinutes > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                          {lateMinutes} min
                        </span>
                      </TableCell>
                      <TableCell>{formatHours(calculateHours(att.checkIn, att.checkOut))}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
});
