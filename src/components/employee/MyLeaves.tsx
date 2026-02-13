'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Calendar, CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';

interface MyLeavesProps {
  user: any;
}

export function MyLeaves({ user }: MyLeavesProps) {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCoverDialog, setShowCoverDialog] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [coverAction, setCoverAction] = useState<'approve' | 'decline'>('approve');
  const [coverReason, setCoverReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leavesResponse, employeesResponse] = await Promise.all([
        fetch('/api/leaves', {
          cache: 'no-store',
        }),
        fetch('/api/employees', {
          cache: 'no-store',
        }),
      ]);

      if (leavesResponse.ok) {
        const leavesData = await leavesResponse.json();
        setLeaves(leavesData.leaves || []);
      }

      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        setEmployees(employeesData.employees || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (userId: string | null | undefined) => {
    if (!userId) return 'Unknown';
    const employee = employees.find(e => e.id === userId);
    return employee ? (employee.callingName || employee.fullName || `${employee.firstName} ${employee.lastName}`) : 'Unknown';
  };

  const handleCancelLeave = async (leaveId: string) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;

    try {
      const response = await fetch('/api/leaves/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leaveId, userId: user.id }),
      });

      if (response.ok) {
        toast.success('Leave cancelled successfully');
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to cancel leave');
      }
    } catch (error) {
      console.error('Error cancelling leave:', error);
      toast.error('Failed to cancel leave');
    }
  };

  const handleCoverResponse = (leave: any, action: 'approve' | 'decline') => {
    setSelectedLeave(leave);
    setCoverAction(action);
    setShowCoverDialog(true);
  };

  const submitCoverResponse = async () => {
    if (!selectedLeave) return;

    try {
      const response = await fetch('/api/leaves/cover-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaveId: selectedLeave.id,
          userId: user.id,
          approved: coverAction === 'approve',
          reason: coverAction === 'decline' ? coverReason : '',
        }),
      });

      if (response.ok) {
        toast.success(`Cover request ${coverAction === 'approve' ? 'approved' : 'declined'} successfully`);
        setShowCoverDialog(false);
        setCoverReason('');
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to respond to cover request');
      }
    } catch (error) {
      console.error('Error responding to cover request:', error);
      toast.error('Failed to respond to cover request');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      'PENDING_COVER': { variant: 'secondary', label: 'Pending Cover' },
      'PENDING_ADMIN': { variant: 'default', label: 'Pending Admin' },
      'APPROVED': { variant: 'default', label: 'Approved', className: 'bg-green-500' },
      'DECLINED': { variant: 'destructive', label: 'Declined' },
      'COVER_DECLINED': { variant: 'secondary', label: 'Cover Declined' },
      'CANCELLED': { variant: 'secondary', label: 'Cancelled' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const exportToCSV = () => {
    const myLeaves = leaves.filter(l => l.employeeId === user.id);
    const headers = ['Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Applied Date'];
    const rows = myLeaves.map(leave => [
      leave.leaveType.toLowerCase(),
      new Date(leave.startDate).toLocaleDateString(),
      new Date(leave.endDate).toLocaleDateString(),
      leave.totalDays,
      leave.status,
      new Date(leave.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_leaves_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const myLeaves = leaves.filter(l => l.employeeId === user.id);
  const coverRequests = leaves.filter(l => l.coverEmployeeId === user.id && l.status === 'PENDING_COVER');

  return (
    <div className="space-y-6">
      {/* Cover Requests for Me */}
      {coverRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Cover Requests ({coverRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coverRequests.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell>{getEmployeeName(leave.employeeId)}</TableCell>
                    <TableCell className="capitalize">{leave.leaveType.toLowerCase()}</TableCell>
                    <TableCell>
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{leave.totalDays}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleCoverResponse(leave, 'approve')}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCoverResponse(leave, 'decline')}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* My Leave Requests */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>My Leave Requests</CardTitle>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Cover Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myLeaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No leave requests found. Apply for leave to get started.
                  </TableCell>
                </TableRow>
              ) : (
                myLeaves.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell className="capitalize">{leave.leaveType.toLowerCase()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>{leave.totalDays}</TableCell>
                    <TableCell>{getEmployeeName(leave.coverEmployeeId)}</TableCell>
                    <TableCell>{getStatusBadge(leave.status)}</TableCell>
                    <TableCell>
                      {(leave.status === 'PENDING_COVER' || leave.status === 'PENDING_ADMIN') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelLeave(leave.id)}
                        >
                          Cancel
                        </Button>
                      )}
                      {leave.status === 'DECLINED' && leave.adminResponse && (
                        <p className="text-xs text-red-600">
                          Reason: {leave.adminResponse}
                        </p>
                      )}
                      {leave.status === 'COVER_DECLINED' && leave.coverResponse && (
                        <p className="text-xs text-red-600">
                          Reason: {leave.coverResponse}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cover Response Dialog */}
      <Dialog open={showCoverDialog} onOpenChange={setShowCoverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {coverAction === 'approve' ? 'Approve' : 'Decline'} Cover Request
            </DialogTitle>
            <DialogDescription>
              {selectedLeave && (
                <>
                  {getEmployeeName(selectedLeave.employeeId)} requested you to cover their{' '}
                  {selectedLeave.leaveType.toLowerCase()} leave from{' '}
                  {new Date(selectedLeave.startDate).toLocaleDateString()} to{' '}
                  {new Date(selectedLeave.endDate).toLocaleDateString()} ({selectedLeave.totalDays} days)
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {coverAction === 'decline' && (
            <div className="space-y-2">
              <Label htmlFor="coverReason">Reason for Declining *</Label>
              <Textarea
                id="coverReason"
                placeholder="Please provide a reason..."
                value={coverReason}
                onChange={(e) => setCoverReason(e.target.value)}
                required
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCoverDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitCoverResponse}
              variant={coverAction === 'approve' ? 'default' : 'destructive'}
              disabled={coverAction === 'decline' && !coverReason}
            >
              {coverAction === 'approve' ? 'Approve' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
