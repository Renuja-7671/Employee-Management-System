'use client';

import { useEffect, useState, memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Calendar, Clock, Umbrella, AlertCircle } from 'lucide-react';
import { Progress } from '../ui/progress';

interface EmployeeOverviewProps {
  user: any;
}

export const EmployeeOverview = memo(function EmployeeOverview({ user }: EmployeeOverviewProps) {
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

  const fetchData = useCallback(async () => {
    try {
      // Use optimized endpoint that fetches all data in one call
      const response = await fetch(`/api/employees/${user.id}/stats`, {
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setLeaveBalance(data.balance || { annual: 0, casual: 0, medical: 0 });
        setLeaveCounts(data.counts || { medicalLeaveTaken: 0, officialLeaveTaken: 0 });
        setStats(data.stats || { pendingLeaves: 0, approvedLeaves: 0, attendanceThisMonth: 0 });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Leave Balance Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm">Annual Leave</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold">{leaveBalance.annual} <span className="text-sm sm:text-base font-normal">days</span></div>
            <Progress value={(leaveBalance.annual / 14) * 100} className="mt-2" />
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
              {leaveBalance.annual} of 14 remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm">Casual Leave</CardTitle>
            <Umbrella className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold">{leaveBalance.casual} <span className="text-sm sm:text-base font-normal">days</span></div>
            <Progress value={(leaveBalance.casual / 7) * 100} className="mt-2" />
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
              {leaveBalance.casual} of 7 remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm">Medical Leave</CardTitle>
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold">{leaveBalance.medical} <span className="text-sm sm:text-base font-normal">days</span></div>
            <Progress value={(leaveBalance.medical / 7) * 100} className="mt-2" />
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
              {leaveBalance.medical} of 7 remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm">Official Leave</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold">{leaveCounts.officialLeaveTaken}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
              leaves taken this year
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm">Pending Requests</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold">{stats.pendingLeaves}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm">Attendance This Month</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold">{stats.attendanceThisMonth} <span className="text-sm sm:text-base font-normal">days</span></div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Present days</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Info */}
      <Card>
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-sm sm:text-base">Important Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3 px-4 sm:px-6">
          <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-50 rounded-lg">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium">Annual Leave Limit</p>
              <p className="text-[10px] sm:text-xs text-gray-600">Maximum 3 continuous days per request</p>
            </div>
          </div>
          <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-green-50 rounded-lg">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium">Working Hours</p>
              <p className="text-[10px] sm:text-xs text-gray-600">
                Weekdays: 8:30 AM - 5:00 PM<br className="sm:hidden" /><span className="hidden sm:inline"> | </span>Weekends: 8:30 AM - 1:30 PM
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-orange-50 rounded-lg">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium">Cover Employee Required</p>
              <p className="text-[10px] sm:text-xs text-gray-600">
                You must get approval from a cover employee before submitting leave requests
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
