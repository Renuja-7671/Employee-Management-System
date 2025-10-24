// src/components/admin/AdminOverview.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Clock, AlertCircle } from 'lucide-react';
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
} from 'recharts';
import { getEmployees } from '@/lib/api/employees';
import { getLeaves } from '@/lib/api/leaves';
import { getAttendance } from '@/lib/api/attendance';

interface Stats {
  totalEmployees: number;
  pendingLeaves: number;
  approvedLeaves: number;
  todayAttendance: number;
}

interface LeaveChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

export function AdminOverview() {
  const [stats, setStats] = useState<Stats>({
    totalEmployees: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
    todayAttendance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [leaveData, setLeaveData] = useState<LeaveChartData[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch all data in parallel
      const [employeesData, leavesData, attendanceData] = await Promise.all([
        getEmployees(),
        getLeaves(),
        getAttendance(),
      ]);

      // Calculate today's attendance
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = attendanceData.filter(
        (a: any) => a.date === today
      ).length;

      // Count active employees only
      const activeEmployees = employeesData.filter(
        (e: any) => e.isActive === true
      ).length;

      // Count pending and approved leaves
      const pendingLeaves = leavesData.filter(
        (l: any) => l.status === 'PENDING_ADMIN'
      ).length;

      const approvedLeaves = leavesData.filter(
        (l: any) => l.status === 'APPROVED'
      ).length;

      setStats({
        totalEmployees: activeEmployees,
        pendingLeaves,
        approvedLeaves,
        todayAttendance,
      });

      // Prepare chart data for leave types
      const leaveTypes = leavesData.reduce((acc: any, leave: any) => {
        if (leave.status === 'APPROVED') {
          const type = leave.leaveType || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
        }
        return acc;
      }, {});

      const chartData: LeaveChartData[] = Object.entries(leaveTypes).map(
        ([type, count]) => ({
          name: type.charAt(0).toUpperCase() + type.slice(1),
          value: count as number,
        })
      );

      setLeaveData(chartData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-700 font-medium">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-700 font-medium">
              Pending Leaves
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingLeaves}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-700 font-medium">
              Approved Leaves
            </CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedLeaves}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-700 font-medium">
              Today's Attendance
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAttendance}</div>
            <p className="text-xs">
              Out of {stats.totalEmployees} employees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leave Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {leaveData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={leaveData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) =>
                      `${props.name}: ${(props.percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {leaveData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No leave data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-700 font-medium">Common Tasks</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="text-sm">Review pending leave requests</span>
                  <span className="text-sm bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">
                    {stats.pendingLeaves}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="text-sm">Mark today's attendance</span>
                  <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                    {stats.todayAttendance}/{stats.totalEmployees}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="text-sm">Manage employees</span>
                  <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                    {stats.totalEmployees}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}