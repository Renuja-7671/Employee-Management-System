// src/components/admin/LeaveManagement.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  CheckCircle,
  XCircle,
  Download,
  Calendar,
  FileText,
  Filter,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { getLeaves, approveLeave, declineLeave, Leave as LeaveAPI } from '@/lib/api/leaves';
import { getEmployees, Employee as EmployeeAPI } from '@/lib/api/employees';

interface Leave extends LeaveAPI {
  userId: string;
  days: number;
  medicalCertUrl?: string | null;
}

interface Employee extends EmployeeAPI {
  name: string;
}

export function LeaveManagement() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [action, setAction] = useState<'approve' | 'decline'>('approve');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leavesData, employeesData] = await Promise.all([
        getLeaves(),
        getEmployees(),
      ]);

      // Transform leaves data to add userId, days, and medicalCertUrl aliases
      const transformedLeaves = leavesData.map(leave => ({
        ...leave,
        userId: leave.employeeId,
        days: leave.totalDays,
        medicalCertUrl: leave.medicalCertPath
      }));
      setLeaves(transformedLeaves);

      // Transform employees data to include full name
      const transformedEmployees = employeesData.map(emp => ({
        ...emp,
        name: `${emp.firstName} ${emp.lastName}`
      }));
      setEmployees(transformedEmployees);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (userId: string | null | undefined) => {
    if (!userId) return 'Unknown';
    const employee = employees.find((e) => e.id === userId);
    return employee ? employee.name : 'Unknown';
  };

  const handleAction = (leave: Leave, actionType: 'approve' | 'decline') => {
    setSelectedLeave(leave);
    setAction(actionType);
    setReason('');
    setShowDialog(true);
  };

  const submitAction = async () => {
    if (!selectedLeave) return;

    if (action === 'decline' && !reason.trim()) {
      toast.error('Please provide a reason for declining');
      return;
    }

    setSubmitting(true);

    try {
      let result;
      if (action === 'approve') {
        result = await approveLeave(selectedLeave.id);
      } else {
        result = await declineLeave(selectedLeave.id, reason);
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to process leave');
      }

      toast.success(
        `Leave ${action === 'approve' ? 'approved' : 'declined'} successfully`
      );
      setShowDialog(false);
      setReason('');
      setSelectedLeave(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process leave');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { variant: any; label: string; className?: string }
    > = {
      PENDING_COVER: { variant: 'secondary', label: 'Pending Cover' },
      PENDING_ADMIN: {
        variant: 'default',
        label: 'Pending Approval',
        className: 'bg-orange-500 hover:bg-orange-600',
      },
      APPROVED: {
        variant: 'default',
        label: 'Approved',
        className: 'bg-green-500 hover:bg-green-600',
      },
      DECLINED: { variant: 'destructive', label: 'Declined' },
      CANCELLED: { variant: 'secondary', label: 'Cancelled' },
    };

    const config = statusConfig[status] || {
      variant: 'secondary',
      label: status,
    };

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const exportToCSV = () => {
    const headers = [
      'Employee',
      'Leave Type',
      'Start Date',
      'End Date',
      'Days',
      'Status',
      'Applied Date',
    ];
    const rows = filteredLeaves.map((leave) => [
      getEmployeeName(leave.userId),
      leave.leaveType,
      leave.startDate,
      leave.endDate,
      leave.days,
      leave.status,
      new Date(leave.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave_requests_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Leave requests exported');
  };

  const filteredLeaves =
    statusFilter === 'all'
      ? leaves
      : leaves.filter((leave) => leave.status === statusFilter);

  const pendingCount = leaves.filter(
    (l) => l.status === 'PENDING_ADMIN'
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      {pendingCount > 0 && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">
                  Pending Approvals
                </p>
                <p className="text-2xl font-bold text-orange-700">
                  {pendingCount} {pendingCount === 1 ? 'request' : 'requests'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Leave Requests</CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING_ADMIN">Pending Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="DECLINED">Declined</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Cover Employee</TableHead>
                  <TableHead>Certificate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeaves.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-gray-500 py-8"
                    >
                      No leave requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium">
                        {getEmployeeName(leave.userId)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {leave.leaveType}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-gray-500" />
                          {new Date(leave.startDate).toLocaleDateString()} -{' '}
                          {new Date(leave.endDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>{leave.days}</TableCell>
                      <TableCell>
                        {leave.coverEmployeeId
                          ? getEmployeeName(leave.coverEmployeeId)
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {leave.leaveType === 'medical' &&
                        leave.medicalCertUrl ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              leave.medicalCertUrl && window.open(leave.medicalCertUrl, '_blank')
                            }
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(leave.status)}</TableCell>
                      <TableCell>
                        {leave.status === 'PENDING_ADMIN' ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleAction(leave, 'approve')}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(leave, 'decline')}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Decline
                            </Button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve' : 'Decline'} Leave Request
            </DialogTitle>
            <DialogDescription>
              {selectedLeave && (
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Employee:</span>{' '}
                    {getEmployeeName(selectedLeave.userId)}
                  </p>
                  <p>
                    <span className="font-medium">Leave Type:</span>{' '}
                    <span className="capitalize">{selectedLeave.leaveType}</span>
                  </p>
                  <p>
                    <span className="font-medium">Period:</span>{' '}
                    {new Date(selectedLeave.startDate).toLocaleDateString()} to{' '}
                    {new Date(selectedLeave.endDate).toLocaleDateString()}
                  </p>
                  <p>
                    <span className="font-medium">Days:</span>{' '}
                    {selectedLeave.days} days
                  </p>
                  {selectedLeave.reason && (
                    <p>
                      <span className="font-medium">Reason:</span>{' '}
                      {selectedLeave.reason}
                    </p>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {action === 'decline' && (
            <div className="space-y-2 mt-4">
              <Label htmlFor="reason">
                Reason for Declining <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Please provide a reason for declining this request..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setReason('');
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitAction}
              variant={action === 'approve' ? 'default' : 'destructive'}
              disabled={
                submitting || (action === 'decline' && !reason.trim())
              }
              className={
                action === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : ''
              }
            >
              {submitting
                ? 'Processing...'
                : action === 'approve'
                ? 'Approve Leave'
                : 'Decline Leave'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}