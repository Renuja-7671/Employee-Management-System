'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Calendar, Clock, Umbrella, AlertCircle } from 'lucide-react';
import { Progress } from '../ui/progress';

interface EmployeeOverviewProps {
  user: any;
}

export function EmployeeOverview({ user }: EmployeeOverviewProps) {
  const [leaveBalance, setLeaveBalance] = useState({
    annual: 0,
    casual: 0,
    medical: 0,
  });
  const [leaveCounts, setLeaveCounts] = useState({
    medicalLeaveTaken: 0,
    officialLeaveTaken: 0,
  });
  const [stats, setStats] = useState({
    pendingLeaves: 0,
    approvedLeaves: 0,
    attendanceThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [balanceResponse, leavesResponse, attendanceResponse] = await Promise.all([
        fetch(`/api/leaves/balance?userId=${user.id}`, {
          cache: 'no-store',
        }),
        fetch('/api/leaves', {
          cache: 'no-store',
        }),
        fetch('/api/attendance', {
          cache: 'no-store',
        }),
      ]);

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setLeaveBalance(balanceData.balance || { annual: 0, casual: 0, medical: 0 });
        setLeaveCounts(balanceData.counts || { medicalLeaveTaken: 0, officialLeaveTaken: 0 });
      }

      if (leavesResponse.ok) {
        const leavesData = await leavesResponse.json();
        const myLeaves = (leavesData.leaves || []).filter((l: any) => l.employeeId === user.id);
        const pendingLeaves = myLeaves.filter(
          (l: any) => l.status === 'PENDING_COVER' || l.status === 'PENDING_ADMIN'
        ).length;
        const approvedLeaves = myLeaves.filter((l: any) => l.status === 'APPROVED').length;

        setStats(prev => ({
          ...prev,
          pendingLeaves,
          approvedLeaves,
        }));
      }

      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json();
        const currentMonth = new Date().getMonth();
        const thisMonthAttendance = (attendanceData.attendance || []).filter((a: any) => {
          return new Date(a.date).getMonth() === currentMonth;
        }).length;

        setStats(prev => ({
          ...prev,
          attendanceThisMonth: thisMonthAttendance,
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Leave Balance Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Annual Leave</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{leaveBalance.annual} days</div>
            <Progress value={(leaveBalance.annual / 14) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {leaveBalance.annual} of 14 days remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Casual Leave</CardTitle>
            <Umbrella className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{leaveBalance.casual} days</div>
            <Progress value={(leaveBalance.casual / 7) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {leaveBalance.casual} of 7 days remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Medical Leave</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{leaveCounts.medicalLeaveTaken}</div>
            <p className="text-xs text-muted-foreground mt-2">
              leaves taken this year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Official Leave</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{leaveCounts.officialLeaveTaken}</div>
            <p className="text-xs text-muted-foreground mt-2">
              leaves taken this year
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.pendingLeaves}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Attendance This Month</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.attendanceThisMonth} days</div>
            <p className="text-xs text-muted-foreground">Present days</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Info */}
      <Card>
        <CardHeader>
          <CardTitle>Important Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm">Annual Leave Limit</p>
              <p className="text-xs text-gray-600">Maximum 3 continuous days per request</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <Clock className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm">Working Hours</p>
              <p className="text-xs text-gray-600">
                Weekdays: 8:30 AM - 5:00 PM | Weekends: 8:30 AM - 1:30 PM
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <p className="text-sm">Cover Employee Required</p>
              <p className="text-xs text-gray-600">
                You must get approval from a cover employee before submitting leave requests
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
