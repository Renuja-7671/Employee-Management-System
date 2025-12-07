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
  const [medicalDaysInput, setMedicalDaysInput] = useState<string>('');

  useEffect(() => {
    fetchData();
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
    if (formData.leaveType === 'annual') return 3;
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

  // Generate calendar preview
  const generateCalendarPreview = useMemo(() => {
    if (!formData.startDate || !formData.numberOfDays) return [];

    const dates: Date[] = [];
    const start = new Date(formData.startDate);

    // For 0.5 or 1 day, only show the start date
    if (formData.numberOfDays <= 1) {
      dates.push(new Date(start));
    } else {
      // For multiple days
      for (let i = 0; i < formData.numberOfDays; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date);
      }
    }

    return dates;
  }, [formData.startDate, formData.numberOfDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.coverEmployeeId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const days = calculateDays();

    // Validate leave balance (not applicable for official leave)
    if (formData.leaveType === 'annual' && leaveBalance.annual < days) {
      toast.error('Insufficient annual leave balance');
      return;
    }

    if (formData.leaveType === 'casual' && leaveBalance.casual < formData.numberOfDays) {
      toast.error('Insufficient casual leave balance');
      return;
    }

    // Validate annual leave max 3 days
    if (formData.leaveType === 'annual' && days > 3) {
      toast.error('Annual leave cannot exceed 3 continuous days per request');
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

    // Validate medical certificate
    if (formData.leaveType === 'medical' && !medicalCertFile) {
      toast.error('Medical certificate is required for medical leave');
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
        toast.success('Leave request submitted successfully. Waiting for cover employee approval.');
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
        setMedicalDaysInput(''); // Reset medical days input
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
    <div className="space-y-6">
      {/* Leave Balance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Your Leave Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Annual Leave</p>
              <p className="text-2xl">{leaveBalance.annual}</p>
              <p className="text-xs text-gray-500">days remaining</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Casual Leave</p>
              <p className="text-2xl">{leaveBalance.casual}</p>
              <p className="text-xs text-gray-500">days remaining</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600">Medical Leave</p>
              <p className="text-2xl">{leaveCounts.medicalLeaveTaken}</p>
              <p className="text-xs text-gray-500">leaves taken this year</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">Official Leave</p>
              <p className="text-2xl">{leaveCounts.officialLeaveTaken}</p>
              <p className="text-xs text-gray-500">leaves taken this year</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Apply Leave Form */}
      <Card>
        <CardHeader>
          <CardTitle>Apply for Leave</CardTitle>
          <CardDescription>
            Fill in the details below to submit your leave request
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="leaveType">Leave Type *</Label>
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
                  setMedicalDaysInput(''); // Reset medical days input when changing leave type
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
                  Annual leave: max 3 consecutive days per request, must be planned at least 7 days in advance
                </p>
              )}
              {formData.leaveType === 'casual' && (
                <p className="text-xs text-green-600 mt-1">
                  Casual leave: 0.5 day (half day) or 1 day only, can apply 2 days before today or any future date
                </p>
              )}
              {formData.leaveType === 'medical' && (
                <p className="text-xs text-orange-600 mt-1">
                  Medical leave: can apply 4 days before today or any future date, medical certificate required
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
                <Input
                  id="numberOfDays"
                  type="number"
                  min="1"
                  max="365"
                  step="1"
                  value={medicalDaysInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setMedicalDaysInput(value);
                    setFormData({ ...formData, numberOfDays: parseInt(value) || 0 });
                  }}
                  placeholder="e.g., 5"
                  required
                />
                <p className="text-xs text-gray-500">Enter the number of days needed for medical leave</p>
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
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-gray-800">Leave Calendar Preview</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>
                      Total: <span className="font-semibold">
                        {formData.numberOfDays === 0.5
                          ? '0.5 day (Half day)'
                          : `${formData.numberOfDays} day${formData.numberOfDays > 1 ? 's' : ''}`
                        }
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {generateCalendarPreview.map((date, index) => (
                      <div
                        key={index}
                        className={`text-center p-2 bg-white rounded-lg border-2 shadow-sm ${
                          formData.numberOfDays === 0.5 ? 'border-green-400' : 'border-blue-400'
                        }`}
                      >
                        <div className="text-xs text-gray-500 uppercase">
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className={`text-sm font-bold ${
                          formData.numberOfDays === 0.5 ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {date.getDate()}
                        </div>
                        <div className="text-xs text-gray-600">
                          {date.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                        {formData.numberOfDays === 0.5 && (
                          <div className="text-xs text-green-600 font-semibold mt-1">
                            Half
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {formData.endDate && formData.numberOfDays > 1 && (
                    <div className="mt-2 text-xs text-gray-600 text-center">
                      From <span className="font-semibold">{new Date(formData.startDate).toLocaleDateString()}</span> to <span className="font-semibold">{new Date(formData.endDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {formData.numberOfDays === 0.5 && (
                    <div className="mt-2 text-xs text-green-600 text-center font-semibold">
                      Half day leave on {new Date(formData.startDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Brief reason for leave..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
              />
            </div>

            {formData.leaveType === 'medical' && (
              <div className="space-y-2">
                <Label htmlFor="medicalCert">Medical Certificate *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="medicalCert"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    required
                  />
                  <Upload className="h-4 w-4 text-gray-400" />
                </div>
                {medicalCertFile && (
                  <p className="text-xs text-green-600">
                    File selected: {medicalCertFile.name}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="coverEmployee">Cover Employee *</Label>
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

            <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="text-xs text-gray-700">
                <p className="font-semibold">Important: Your leave request will go through two approval stages:</p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Cover employee must approve within 12 hours</li>
                  <li>Admin will then review and approve/decline your request</li>
                </ol>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading || uploading}>
              {loading ? 'Submitting...' : uploading ? 'Uploading...' : 'Submit Leave Request'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
