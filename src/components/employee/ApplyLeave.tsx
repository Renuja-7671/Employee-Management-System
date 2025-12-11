'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Calendar, Upload, AlertCircle, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

interface ApplyLeaveProps {
  user: any;
  onSuccess: () => void;
}

export function ApplyLeave({ user, onSuccess }: ApplyLeaveProps) {
  const [leaveBalance, setLeaveBalance] = useState({
    annual: 0,
    casual: 0,
    medical: 0,
  });
  const [leaveCounts, setLeaveCounts] = useState({
    medicalLeaveTaken: 0,
    officialLeaveTaken: 0,
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: '',
    numberOfDays: 1,
    startDate: '',
    endDate: '',
    reason: '',
    coverEmployeeId: '',
    medicalCertUrl: '',
    isHalfDay: false,
  });
  const [medicalCertFile, setMedicalCertFile] = useState<File | null>(null);
  const [publicHolidays, setPublicHolidays] = useState<Date[]>([]);

  useEffect(() => {
    fetchData();
    fetchHolidays();
  }, []);

  const fetchData = async () => {
    try {
      const balanceResponse = await fetch(`/api/leaves/balance?userId=${user.id}`, {
        cache: 'no-store',
      });

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setLeaveBalance(balanceData.balance || { annual: 0, casual: 0, medical: 0 });
        setLeaveCounts(balanceData.counts || { medicalLeaveTaken: 0, officialLeaveTaken: 0 });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading data');
    }
  };

  const fetchHolidays = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const response = await fetch(`/api/holidays?year=${currentYear}`, {
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        const holidayDates = data.holidays.map((h: any) => new Date(h.date));
        setPublicHolidays(holidayDates);
        console.log('📅 Fetched', data.holidays.length, 'company holidays');
        console.log('Holiday dates as strings:', holidayDates.map((d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }));
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  // Fetch available employees based on selected dates
  const fetchAvailableEmployees = useCallback(async (startDate: string, endDate: string) => {
    try {
      const response = await fetch(
        `/api/employees/available?startDate=${startDate}&endDate=${endDate}&userId=${user.id}`,
        { cache: 'no-store' }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Available employees:', data.employees);
        setEmployees(data.employees || []);
      } else {
        console.error('Failed to fetch available employees');
        setEmployees([]);
      }
    } catch (error) {
      console.error('Error fetching available employees:', error);
      setEmployees([]);
    }
  }, [user.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMedicalCertFile(e.target.files[0]);
    }
  };

  const uploadMedicalCert = async () => {
    if (!medicalCertFile) return null;

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', medicalCertFile);
      formDataUpload.append('userId', user.id);

      const response = await fetch('/api/upload/medical-cert', {
        method: 'POST',
        body: formDataUpload,
      });

      if (response.ok) {
        const data = await response.json();
        return data.url;
      } else {
        throw new Error('Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload medical certificate');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Calculate end date based on start date and number of days
  useEffect(() => {
    if (formData.startDate && formData.numberOfDays > 0) {
      const start = new Date(formData.startDate);
      const end = new Date(start);

      // For half day or same day leave, end date = start date
      if (formData.numberOfDays === 0.5 || formData.numberOfDays === 1) {
        setFormData(prev => ({ ...prev, endDate: formData.startDate }));
      } else {
        end.setDate(start.getDate() + formData.numberOfDays - 1);
        const endDateStr = end.toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, endDate: endDateStr }));
      }
    }
  }, [formData.startDate, formData.numberOfDays]);

  // Fetch available employees when dates are selected
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      fetchAvailableEmployees(formData.startDate, formData.endDate);
    } else {
      // Reset employees list if dates are not selected
      setEmployees([]);
    }
  }, [formData.startDate, formData.endDate]);

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  // Get date range restrictions based on leave type
  const getDateRestrictions = () => {
    const today = new Date();

    if (formData.leaveType === 'official') {
      // Official leave: 3 days before and 3 days after current date
      const minDate = new Date(today);
      minDate.setDate(today.getDate() - 3);
      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + 3);

      return {
        min: minDate.toISOString().split('T')[0],
        max: maxDate.toISOString().split('T')[0],
      };
    }

    if (formData.leaveType === 'annual') {
      // Annual leave: must be planned 7 days in advance (7 days after today)
      const minDate = new Date(today);
      minDate.setDate(today.getDate() + 7);

      return {
        min: minDate.toISOString().split('T')[0],
        max: undefined, // No max date for annual leave
      };
    }

    if (formData.leaveType === 'casual') {
      // Casual leave: 2 days before current date and all future dates
      const minDate = new Date(today);
      minDate.setDate(today.getDate() - 2);

      return {
        min: minDate.toISOString().split('T')[0],
        max: undefined, // No max date for casual leave
      };
    }

    if (formData.leaveType === 'medical') {
      // Medical leave: 4 days before current date and all future dates
      const minDate = new Date(today);
      minDate.setDate(today.getDate() - 4);

      return {
        min: minDate.toISOString().split('T')[0],
        max: undefined, // No max date for medical leave
      };
    }

    // Other leave types: current date and future only
    return {
      min: new Date().toISOString().split('T')[0],
      max: undefined,
    };
  };

  // Get max number of days based on leave type
  const getMaxDays = () => {
    if (formData.leaveType === 'annual') return 7;
    if (formData.leaveType === 'official') return 3;
    if (formData.leaveType === 'casual') return 1; // Casual: 0.5 or 1 day only
    return 14; // Default max for other types
  };

  // Get available day options based on leave type
  const getDayOptions = () => {
    if (formData.leaveType === 'casual') {
      return [
        { value: 0.5, label: '0.5 day (Half day)' },
        { value: 1, label: '1 day' },
      ];
    }

    // For other leave types, return normal day options
    return Array.from({ length: getMaxDays() }, (_, i) => ({
      value: i + 1,
      label: `${i + 1} ${i + 1 === 1 ? 'day' : 'days'}`,
    }));
  };

  // Generate calendar preview (excluding Sundays and company holidays)
  const generateCalendarPreview = useMemo(() => {
    if (!formData.startDate || !formData.numberOfDays) return [];

    // Helper function to create a date from YYYY-MM-DD string in local timezone
    const createLocalDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    // Helper function to get date string in YYYY-MM-DD format
    const getDateString = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Helper function to check if a date is a Sunday
    const isSunday = (date: Date): boolean => {
      return date.getDay() === 0;
    };

    // Helper function to check if a date is a company holiday
    const isCompanyHoliday = (date: Date): boolean => {
      const dateStr = getDateString(date);
      const isHoliday = publicHolidays.some(holiday => {
        const holidayStr = getDateString(holiday);
        const matches = holidayStr === dateStr;
        if (matches) {
          console.log(`✅ ${dateStr} is a company holiday (matches ${holidayStr})`);
        }
        return matches;
      });
      console.log(`Checking ${dateStr}: isHoliday=${isHoliday}, total holidays=${publicHolidays.length}`);
      return isHoliday;
    };

    const dates: Date[] = [];
    const start = createLocalDate(formData.startDate);

    // For 0.5 or 1 day, only show the start date if it's a working day
    if (formData.numberOfDays <= 1) {
      if (!isSunday(start) && !isCompanyHoliday(start)) {
        dates.push(start);
      }
    } else {
      // For multiple days, collect all working days
      let daysToAdd = formData.numberOfDays;
      const currentDate = new Date(start);

      while (daysToAdd > 0) {
        const dateToCheck = new Date(currentDate);

        // Only add working days (not Sundays or holidays)
        if (!isSunday(dateToCheck) && !isCompanyHoliday(dateToCheck)) {
          dates.push(new Date(dateToCheck));
          daysToAdd--;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return dates;
  }, [formData.startDate, formData.numberOfDays, publicHolidays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.coverEmployeeId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const days = calculateDays();

    // Check if this will be a No Pay leave and warn user
    let isNoPayLeave = false;
    if (formData.leaveType === 'annual' && leaveBalance.annual < days) {
      isNoPayLeave = true;
      const confirmed = window.confirm(
        `⚠️ WARNING: You have insufficient annual leave balance (${leaveBalance.annual} days remaining).\n\nThis will be a NO PAY leave if approved.\n\nDo you want to continue?`
      );
      if (!confirmed) return;
    }

    if (formData.leaveType === 'casual' && leaveBalance.casual < formData.numberOfDays) {
      isNoPayLeave = true;
      const confirmed = window.confirm(
        `⚠️ WARNING: You have insufficient casual leave balance (${leaveBalance.casual} days remaining).\n\nThis will be a NO PAY leave if approved.\n\nDo you want to continue?`
      );
      if (!confirmed) return;
    }

    // Validate annual leave max 7 days
    if (formData.leaveType === 'annual' && days > 7) {
      toast.error('Annual leave cannot exceed 7 consecutive days per request');
      return;
    }

    // Validate casual leave: only 0.5 or 1 day
    if (formData.leaveType === 'casual' && formData.numberOfDays !== 0.5 && formData.numberOfDays !== 1) {
      toast.error('Casual leave can only be 0.5 day (half day) or 1 day');
      return;
    }

    // Validate official leave max 3 days
    if (formData.leaveType === 'official' && days > 3) {
      toast.error('Official leave cannot exceed 3 continuous days');
      return;
    }

    // Check if medical leave will be No Pay
    if (formData.leaveType === 'medical' && leaveBalance.medical < formData.numberOfDays) {
      isNoPayLeave = true;
      const confirmed = window.confirm(
        `⚠️ WARNING: You have insufficient medical leave balance (${leaveBalance.medical} days remaining).\n\nThis will be a NO PAY leave if approved.\n\nDo you want to continue?`
      );
      if (!confirmed) return;
    }

    // Validate medical leave allowed days
    if (formData.leaveType === 'medical') {
      const allowedDays = [0.5, 1, 1.5, 2, 2.5, 3];
      if (!allowedDays.includes(formData.numberOfDays)) {
        toast.error('Medical leave can only be 0.5, 1, 1.5, 2, 2.5, or 3 days');
        return;
      }
    }

    // Validate medical certificate (only required for more than 1 day)
    if (formData.leaveType === 'medical' && formData.numberOfDays > 1 && !medicalCertFile) {
      toast.error('Medical certificate is required for medical leave exceeding 1 day');
      return;
    }

    setLoading(true);

    try {
      // Upload medical certificate if needed
      let medicalCertUrl = formData.medicalCertUrl;
      if (formData.leaveType === 'medical' && medicalCertFile) {
        medicalCertUrl = await uploadMedicalCert();
        if (!medicalCertUrl) {
          setLoading(false);
          return;
        }
      }

      // Submit leave request
      const response = await fetch('/api/leaves/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userId: user.id,
          medicalCertUrl: medicalCertUrl || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Show success message with No Pay warning if applicable
        if (data.isNoPay) {
          toast.warning(
            '⚠️ Leave request submitted successfully. NOTE: This is a NO PAY leave due to insufficient balance. Waiting for cover employee approval.',
            { duration: 8000 }
          );
        } else {
          toast.success('Leave request submitted successfully. Waiting for cover employee approval.');
        }

        setFormData({
          leaveType: '',
          numberOfDays: 1,
          startDate: '',
          endDate: '',
          reason: '',
          coverEmployeeId: '',
          medicalCertUrl: '',
          isHalfDay: false,
        });
        setMedicalCertFile(null);
        onSuccess();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to submit leave request');
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast.error('Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Leave Balance Summary */}
      <Card>
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-sm sm:text-base">Your Leave Balance</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <div className={`text-center p-2 sm:p-4 rounded-lg ${leaveBalance.annual === 0 ? 'bg-red-100 border-2 border-red-300' : 'bg-blue-50'}`}>
              <p className="text-xs sm:text-sm text-gray-600">Annual Leave</p>
              <p className={`text-xl sm:text-2xl font-bold ${leaveBalance.annual === 0 ? 'text-red-600' : ''}`}>{leaveBalance.annual}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">days remaining</p>
              {leaveBalance.annual === 0 && (
                <p className="text-[10px] sm:text-xs text-red-600 mt-1 font-semibold">⚠️ No Pay if applied</p>
              )}
            </div>
            <div className={`text-center p-2 sm:p-4 rounded-lg ${leaveBalance.casual === 0 ? 'bg-red-100 border-2 border-red-300' : 'bg-green-50'}`}>
              <p className="text-xs sm:text-sm text-gray-600">Casual Leave</p>
              <p className={`text-xl sm:text-2xl font-bold ${leaveBalance.casual === 0 ? 'text-red-600' : ''}`}>{leaveBalance.casual}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">days remaining</p>
              {leaveBalance.casual === 0 && (
                <p className="text-[10px] sm:text-xs text-red-600 mt-1 font-semibold">⚠️ No Pay if applied</p>
              )}
            </div>
            <div className={`text-center p-2 sm:p-4 rounded-lg ${leaveBalance.medical === 0 ? 'bg-red-100 border-2 border-red-300' : 'bg-orange-50'}`}>
              <p className="text-xs sm:text-sm text-gray-600">Medical Leave</p>
              <p className={`text-xl sm:text-2xl font-bold ${leaveBalance.medical === 0 ? 'text-red-600' : ''}`}>{leaveBalance.medical}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">days remaining</p>
              {leaveBalance.medical === 0 && (
                <p className="text-[10px] sm:text-xs text-red-600 mt-1 font-semibold">⚠️ No Pay if applied</p>
              )}
            </div>
            <div className="text-center p-2 sm:p-4 bg-purple-50 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600">Official Leave</p>
              <p className="text-xl sm:text-2xl font-bold">{leaveCounts.officialLeaveTaken}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">leaves taken this year</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Apply Leave Form */}
      <Card>
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-sm sm:text-base">Apply for Leave</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Fill in the details below to submit your leave request
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="leaveType" className="text-xs sm:text-sm">Leave Type *</Label>
              <Select
                value={formData.leaveType}
                onValueChange={(value) => {
                  setFormData({
                    ...formData,
                    leaveType: value,
                    numberOfDays: 1,
                    startDate: '',
                    endDate: ''
                  });
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual Leave</SelectItem>
                  <SelectItem value="casual">Casual Leave</SelectItem>
                  <SelectItem value="medical">Medical Leave</SelectItem>
                  <SelectItem value="official">Official Leave</SelectItem>
                </SelectContent>
              </Select>
              {formData.leaveType === 'official' && (
                <p className="text-xs text-purple-600 mt-1">
                  Official leave can be applied for past 3 days or future 3 days, max 3 continuous days
                </p>
              )}
              {formData.leaveType === 'annual' && (
                <p className="text-xs text-blue-600 mt-1">
                  Annual leave: max 7 consecutive days per request, must be planned at least 7 days in advance
                </p>
              )}
              {formData.leaveType === 'casual' && (
                <p className="text-xs text-green-600 mt-1">
                  Casual leave: 0.5 day (half day) or 1 day only, can apply 2 days before today or any future date
                </p>
              )}
              {formData.leaveType === 'medical' && (
                <p className="text-xs text-orange-600 mt-1">
                  Medical leave: 0.5, 1, 1.5, 2, 2.5, or 3 days only. Certificate required if more than 1 day. Can apply 4 days before today or any future date.
                </p>
              )}
            </div>

            {formData.leaveType && formData.leaveType !== 'medical' && (
              <div className="space-y-2">
                <Label htmlFor="numberOfDays">Number of Days *</Label>
                <Select
                  value={formData.numberOfDays.toString()}
                  onValueChange={(value) => setFormData({ ...formData, numberOfDays: parseFloat(value) })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select number of days" />
                  </SelectTrigger>
                  <SelectContent>
                    {getDayOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.leaveType === 'medical' && (
              <div className="space-y-2">
                <Label htmlFor="numberOfDays">Number of Days *</Label>
                <Select
                  value={formData.numberOfDays.toString()}
                  onValueChange={(value) => setFormData({ ...formData, numberOfDays: parseFloat(value) })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select number of days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">0.5 day (Half day) - No certificate needed</SelectItem>
                    <SelectItem value="1">1 day - No certificate needed</SelectItem>
                    <SelectItem value="1.5">1.5 days - Certificate required</SelectItem>
                    <SelectItem value="2">2 days - Certificate required</SelectItem>
                    <SelectItem value="2.5">2.5 days - Certificate required</SelectItem>
                    <SelectItem value="3">3 days - Certificate required</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Medical certificate is only required for leave exceeding 1 day
                </p>
              </div>
            )}

            {formData.leaveType && formData.numberOfDays > 0 && (
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  min={getDateRestrictions().min}
                  max={getDateRestrictions().max}
                  required
                />
                {formData.leaveType === 'official' && (
                  <p className="text-xs text-gray-500">
                    You can select dates from {new Date(new Date().setDate(new Date().getDate() - 3)).toLocaleDateString()} to {new Date(new Date().setDate(new Date().getDate() + 3)).toLocaleDateString()}
                  </p>
                )}
                {formData.leaveType === 'annual' && (
                  <p className="text-xs text-gray-500">
                    You can select dates from {new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString()} onwards (7 days from today)
                  </p>
                )}
                {formData.leaveType === 'casual' && (
                  <p className="text-xs text-gray-500">
                    You can select dates from {new Date(new Date().setDate(new Date().getDate() - 2)).toLocaleDateString()} onwards
                  </p>
                )}
                {formData.leaveType === 'medical' && (
                  <p className="text-xs text-gray-500">
                    You can select dates from {new Date(new Date().setDate(new Date().getDate() - 4)).toLocaleDateString()} onwards
                  </p>
                )}
              </div>
            )}

            {formData.startDate && formData.numberOfDays > 0 && generateCalendarPreview.length > 0 && (
              <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-800">Leave Calendar Preview</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 mb-2">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                    <span>
                      Total: <span className="font-semibold">
                        {formData.numberOfDays === 0.5
                          ? '0.5 day (Half day)'
                          : `${formData.numberOfDays} day${formData.numberOfDays > 1 ? 's' : ''}`
                        }
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 sm:gap-2">
                    {generateCalendarPreview.map((date, index) => (
                      <div
                        key={index}
                        className={`text-center p-1 sm:p-2 bg-white rounded-lg border-2 shadow-sm ${
                          formData.numberOfDays === 0.5 ? 'border-green-400' : 'border-blue-400'
                        }`}
                      >
                        <div className="text-[10px] sm:text-xs text-gray-500 uppercase">
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className={`text-xs sm:text-sm font-bold ${
                          formData.numberOfDays === 0.5 ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {date.getDate()}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-600">
                          {date.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                        {formData.numberOfDays === 0.5 && (
                          <div className="text-[10px] sm:text-xs text-green-600 font-semibold mt-1">
                            Half
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {formData.endDate && formData.numberOfDays > 1 && (
                    <div className="mt-2 text-[10px] sm:text-xs text-gray-600 text-center">
                      From <span className="font-semibold">{new Date(formData.startDate).toLocaleDateString()}</span> to <span className="font-semibold">{new Date(formData.endDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {formData.numberOfDays === 0.5 && (
                    <div className="mt-2 text-[10px] sm:text-xs text-green-600 text-center font-semibold">
                      Half day leave on {new Date(formData.startDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-xs sm:text-sm">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Brief reason for leave..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
              />
            </div>

            {formData.leaveType === 'medical' && formData.numberOfDays > 1 && (
              <div className="space-y-2">
                <Label htmlFor="medicalCert" className="text-xs sm:text-sm">Medical Certificate *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="medicalCert"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    required
                    className="text-xs sm:text-sm"
                  />
                  <Upload className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                </div>
                {medicalCertFile && (
                  <p className="text-[10px] sm:text-xs text-green-600">
                    File selected: {medicalCertFile.name}
                  </p>
                )}
                <p className="text-[10px] sm:text-xs text-orange-600">
                  Medical certificate is required for leave exceeding 1 day
                </p>
              </div>
            )}

            {formData.leaveType === 'medical' && formData.numberOfDays <= 1 && (
              <div className="p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-[10px] sm:text-xs text-green-700">
                  ✓ No medical certificate required for {formData.numberOfDays === 0.5 ? 'half day' : '1 day'} medical leave
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="coverEmployee" className="text-xs sm:text-sm">Cover Employee *</Label>
              <Select
                value={formData.coverEmployeeId}
                onValueChange={(value) => setFormData({ ...formData, coverEmployeeId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={employees.length > 0 ? "Select cover employee" : "No employees available"} />
                </SelectTrigger>
                <SelectContent>
                  {employees.length > 0 ? (
                    employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeId})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500">No employees available</div>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {employees.length > 0
                  ? "The cover employee must approve your request within 12 hours"
                  : "There are no other employees in the system"}
              </p>
            </div>

            <div className="flex items-start gap-2 p-2 sm:p-3 bg-orange-50 rounded-lg">
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-[10px] sm:text-xs text-gray-700 min-w-0">
                <p className="font-semibold">Important: Your leave request will go through two approval stages:</p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Cover employee must approve within 12 hours</li>
                  <li>Admin will then review and approve/decline your request</li>
                </ol>
              </div>
            </div>

            <Button type="submit" className="w-full text-xs sm:text-sm" disabled={loading || uploading}>
              {loading ? 'Submitting...' : uploading ? 'Uploading...' : 'Submit Leave Request'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
