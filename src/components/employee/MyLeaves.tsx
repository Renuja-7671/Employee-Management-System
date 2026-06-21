'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';
import { Calendar, CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { getDisplayName } from '@/lib/user-utils';

const PAGE_LIMIT = 10;

interface MyLeavesProps {
  user: any;
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export function MyLeaves({ user }: MyLeavesProps) {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [coverRequests, setCoverRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: PAGE_LIMIT,
    totalCount: 0,
    totalPages: 1,
  });
  const [showCoverDialog, setShowCoverDialog] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [coverAction, setCoverAction] = useState<'approve' | 'decline'>('approve');
  const [coverReason, setCoverReason] = useState('');

  const fetchEmployees = useCallback(async () => {
    try {
      const employeesResponse = await fetch('/api/employees', {
        cache: 'no-store',
      });

      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        setEmployees(employeesData.employees || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }, []);

  const fetchCoverRequests = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/leaves?coverEmployeeId=${user.id}&status=PENDING_COVER`,
        { cache: 'no-store' }
      );

      if (response.ok) {
        const data = await response.json();
        setCoverRequests(data.leaves || []);
      }
    } catch (error) {
      console.error('Error fetching cover requests:', error);
    }
  }, [user.id]);

  const fetchMyLeaves = useCallback(async (pageNum: number) => {
    setLeavesLoading(true);
    try {
      const response = await fetch(
        `/api/leaves?employeeId=${user.id}&page=${pageNum}&limit=${PAGE_LIMIT}`,
        { cache: 'no-store' }
      );

      if (response.ok) {
        const data = await response.json();
        setLeaves(data.leaves || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLeavesLoading(false);
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchEmployees();
    fetchCoverRequests();
  }, [fetchEmployees, fetchCoverRequests]);

  useEffect(() => {
    fetchMyLeaves(page);
  }, [fetchMyLeaves, page]);

  const refreshData = async () => {
    await Promise.all([fetchMyLeaves(page), fetchCoverRequests()]);
  };

  const getEmployeeName = (userId: string | null | undefined) => {
    if (!userId) return 'Unknown';
    const employee = employees.find(e => e.id === userId);
    return employee ? getDisplayName(employee) : 'Unknown';
  };

  const getLeaveEmployeeName = (leave: any) => {
    if (leave.employeeName) return leave.employeeName;
    if (leave.employee) return getDisplayName(leave.employee);
    return getEmployeeName(leave.employeeId);
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
        if (leaves.length === 1 && page > 1) {
          setPage(page - 1);
        } else {
          refreshData();
        }
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
        refreshData();
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

  const exportToCSV = async () => {
    try {
      const response = await fetch(`/api/leaves?employeeId=${user.id}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        toast.error('Failed to export leaves');
        return;
      }

      const data = await response.json();
      const allLeaves = data.leaves || [];
      const headers = ['Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Applied Date'];
      const rows = allLeaves.map((leave: any) => [
        leave.leaveType.toLowerCase(),
        new Date(leave.startDate).toLocaleDateString(),
        new Date(leave.endDate).toLocaleDateString(),
        leave.totalDays,
        leave.status,
        new Date(leave.createdAt).toLocaleDateString(),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row: string[]) => row.join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my_leaves_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting leaves:', error);
      toast.error('Failed to export leaves');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

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
                    <TableCell>{getLeaveEmployeeName(leave)}</TableCell>
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
              {leavesLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : leaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No leave requests found. Apply for leave to get started.
                  </TableCell>
                </TableRow>
              ) : (
                leaves.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell className="capitalize">{leave.leaveType.toLowerCase()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>{leave.totalDays}</TableCell>
                    <TableCell>{leave.coverEmployeeName ?? '—'}</TableCell>
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

          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
                {pagination.totalCount} leave requests
              </p>
              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) setPage(page - 1);
                      }}
                      className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-3 text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < pagination.totalPages) setPage(page + 1);
                      }}
                      className={
                        page >= pagination.totalPages
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
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
                  {getLeaveEmployeeName(selectedLeave)} requested you to cover their{' '}
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
