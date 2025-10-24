'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Calendar, Upload, AlertCircle } from 'lucide-react';
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
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    coverEmployeeId: '',
    medicalCertUrl: '',
  });
  const [medicalCertFile, setMedicalCertFile] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [balanceResponse, employeesResponse] = await Promise.all([
        fetch(`/api/leaves/balance?userId=${user.id}`, {
          cache: 'no-store',
        }),
        fetch('/api/employees', {
          cache: 'no-store',
        }),
      ]);

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setLeaveBalance(balanceData.balance || { annual: 0, casual: 0, medical: 0 });
      }

      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        console.log('All employees fetched:', employeesData.employees);
        // Filter out current user
        const filteredEmployees = (employeesData.employees || []).filter((e: any) => e.id !== user.id);
        console.log('Filtered employees (excluding current user):', filteredEmployees);
        setEmployees(filteredEmployees);
      } else {
        const errorData = await employeesResponse.json();
        console.error('Failed to fetch employees:', errorData);
        toast.error('Failed to load employees');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading data');
    }
  };

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

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.coverEmployeeId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const days = calculateDays();

    // Validate leave balance
    if (formData.leaveType === 'annual' && leaveBalance.annual < days) {
      toast.error('Insufficient annual leave balance');
      return;
    }

    if (formData.leaveType === 'casual' && leaveBalance.casual < days) {
      toast.error('Insufficient casual leave balance');
      return;
    }

    // Validate annual leave max 7 days
    if (formData.leaveType === 'annual' && days > 7) {
      toast.error('Annual leave cannot exceed 7 continuous days');
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
          startDate: '',
          endDate: '',
          reason: '',
          coverEmployeeId: '',
          medicalCertUrl: '',
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

  const days = calculateDays();

  return (
    <div className="space-y-6">
      {/* Leave Balance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Your Leave Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
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
              <p className="text-2xl">∞</p>
              <p className="text-xs text-gray-500">certificate required</p>
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
                onValueChange={(value) => setFormData({ ...formData, leaveType: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual Leave</SelectItem>
                  <SelectItem value="casual">Casual Leave</SelectItem>
                  <SelectItem value="medical">Medical Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            {days > 0 && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  Total days: <span className="font-semibold">{days} day{days > 1 ? 's' : ''}</span>
                </span>
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
