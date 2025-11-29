'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Calendar, Clock, CheckCircle, XCircle, User } from 'lucide-react';
import { toast } from 'sonner';

interface CoverRequestsProps {
  user: any;
  onUpdate: () => void;
}

export function CoverRequests({ user, onUpdate }: CoverRequestsProps) {
  const [coverRequests, setCoverRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchCoverRequests();
  }, []);

  const fetchCoverRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/leaves/cover-requests?userId=${user.id}`, {
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setCoverRequests(data.coverRequests || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch cover requests:', errorData);
        toast.error('Failed to load cover requests');
      }
    } catch (error) {
      console.error('Error fetching cover requests:', error);
      toast.error('Error loading cover requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (request: any) => {
    setProcessing(true);
    try {
      const response = await fetch('/api/leaves/cover-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaveId: request.id,
          userId: user.id,
          approved: true,
        }),
      });

      if (response.ok) {
        toast.success('Cover request accepted successfully');
        fetchCoverRequests();
        onUpdate();
      } else {
        const errorData = await response.json();
        console.error('Failed to accept cover request:', errorData);
        toast.error('Failed to accept cover request');
      }
    } catch (error) {
      console.error('Error accepting cover request:', error);
      toast.error('Error accepting cover request');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      toast.error('Please provide a reason for declining');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/leaves/cover-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaveId: selectedRequest.id,
          userId: user.id,
          approved: false,
          reason: declineReason,
        }),
      });

      if (response.ok) {
        toast.success('Cover request declined');
        setShowDeclineDialog(false);
        setDeclineReason('');
        setSelectedRequest(null);
        fetchCoverRequests();
        onUpdate();
      } else {
        const errorData = await response.json();
        console.error('Failed to decline cover request:', errorData);
        toast.error('Failed to decline cover request');
      }
    } catch (error) {
      console.error('Error declining cover request:', error);
      toast.error('Error declining cover request');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      annual: 'Annual Leave',
      casual: 'Casual Leave',
      medical: 'Medical Leave',
    };
    return labels[type] || type;
  };

  const getLeaveTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      annual: 'default',
      casual: 'secondary',
      medical: 'destructive',
    };
    return variants[type] || 'outline';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cover Requests</CardTitle>
          <CardDescription>Loading cover requests...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Cover Requests</CardTitle>
          <CardDescription>
            Review and respond to cover requests from your colleagues
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coverRequests.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No pending cover requests</p>
              <p className="text-sm text-gray-400 mt-1">
                You will see requests here when colleagues ask you to cover their leave
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {coverRequests.map((request) => (
                <Card key={request.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Requester Avatar */}
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={request.requesterProfilePictureUrl || undefined} />
                        <AvatarFallback>
                          {request.requesterName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      {/* Request Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{request.requesterName}</h4>
                            <p className="text-sm text-gray-500">
                              Employee ID: {request.requesterEmployeeId}
                            </p>
                          </div>
                          <Badge variant={getLeaveTypeBadge(request.leaveType)}>
                            {getLeaveTypeLabel(request.leaveType)}
                          </Badge>
                        </div>

                        {/* Leave Details */}
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>
                              {formatDate(request.startDate)} - {formatDate(request.endDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>{request.days} day{request.days > 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* Reason */}
                        {request.reason && (
                          <div className="mb-3 p-2 bg-gray-50 rounded">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Reason:</span> {request.reason}
                            </p>
                          </div>
                        )}

                        {/* Requested Time */}
                        <p className="text-xs text-gray-400 mb-3">
                          Requested {formatDate(request.createdAt)}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAccept(request)}
                            disabled={processing}
                            className="flex items-center gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDeclineDialog(true);
                            }}
                            disabled={processing}
                            className="flex items-center gap-2"
                          >
                            <XCircle className="h-4 w-4" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Cover Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this cover request.
              {selectedRequest && (
                <span className="block mt-2">
                  Request from <span className="font-medium">{selectedRequest.requesterName}</span> for{' '}
                  {formatDate(selectedRequest.startDate)} - {formatDate(selectedRequest.endDate)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="declineReason">Reason *</Label>
              <Textarea
                id="declineReason"
                placeholder="e.g., I have another commitment during this period..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeclineDialog(false);
                setDeclineReason('');
                setSelectedRequest(null);
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={processing || !declineReason.trim()}
            >
              {processing ? 'Declining...' : 'Decline Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
