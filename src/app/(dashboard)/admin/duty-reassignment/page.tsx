'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertCircle, RefreshCw, UserCheck, Clock, Calendar, Users } from 'lucide-react';

interface Reassignment {
  id: string;
  status: string;
  createdAt: string;
  originalLeave: {
    id: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    employee: {
      id: string;
      firstName: string;
      lastName: string;
      employeeId: string;
    };
  };
  coverEmployeeLeave: {
    id: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    employee: {
      firstName: string;
      lastName: string;
    };
  };
}

interface AvailableEmployee {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  currentWorkload: number;
  onLeave: boolean;
  coveringCount: number;
  workloadScore: number;
  available: boolean;
}

export default function DutyReassignmentPage() {
  const { user } = useAuth();
  const [reassignments, setReassignments] = useState<Reassignment[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<Record<string, AvailableEmployee[]>>({});
  const [selectedEmployees, setSelectedEmployees] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user?.id) {
      fetchReassignments();
    }
  }, [user]);

  const fetchReassignments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/cover-reassignment/assign?hrHeadId=${user?.id}`);

      if (response.ok) {
        const data = await response.json();
        setReassignments(data.reassignments || []);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to fetch reassignments');
      }
    } catch (error) {
      console.error('Error fetching reassignments:', error);
      toast.error('Failed to fetch reassignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableEmployees = async (reassignmentId: string, startDate: string, endDate: string, excludeEmployeeId: string) => {
    try {
      const response = await fetch(
        `/api/admin/cover-reassignment/available-employees?startDate=${startDate}&endDate=${endDate}&excludeEmployeeId=${excludeEmployeeId}`
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableEmployees(prev => ({
          ...prev,
          [reassignmentId]: data.availableEmployees || []
        }));
      } else {
        toast.error('Failed to fetch available employees');
      }
    } catch (error) {
      console.error('Error fetching available employees:', error);
      toast.error('Failed to fetch available employees');
    }
  };

  const handleExpandReassignment = (reassignment: Reassignment) => {
    if (!availableEmployees[reassignment.id]) {
      fetchAvailableEmployees(
        reassignment.id,
        reassignment.originalLeave.startDate,
        reassignment.originalLeave.endDate,
        reassignment.coverEmployeeLeave.employee.firstName // Exclude the cover employee who is on leave
      );
    }
  };

  const handleAssign = async (reassignmentId: string) => {
    const newCoverEmployeeId = selectedEmployees[reassignmentId];

    if (!newCoverEmployeeId) {
      toast.error('Please select an employee');
      return;
    }

    setProcessing(prev => ({ ...prev, [reassignmentId]: true }));

    try {
      const response = await fetch('/api/admin/cover-reassignment/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reassignmentId,
          newCoverEmployeeId,
          hrHeadId: user?.id,
        }),
      });

      if (response.ok) {
        toast.success('Cover duty reassigned successfully');
        fetchReassignments(); // Refresh the list

        // Clear selection
        setSelectedEmployees(prev => {
          const newState = { ...prev };
          delete newState[reassignmentId];
          return newState;
        });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to reassign cover duty');
      }
    } catch (error) {
      console.error('Error reassigning cover duty:', error);
      toast.error('Failed to reassign cover duty');
    } finally {
      setProcessing(prev => ({ ...prev, [reassignmentId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Covering Duty Reassignment</h1>
        <p className="text-muted-foreground mt-2">
          Manage cover employee reassignments when conflicts occur (HR Head & Managing Director)
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reassignments</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reassignments.length}</div>
            <p className="text-xs text-muted-foreground">Requires immediate action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medical Leaves</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reassignments.filter(r => r.coverEmployeeLeave.leaveType === 'MEDICAL').length}
            </div>
            <p className="text-xs text-muted-foreground">Priority cases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">No data yet</p>
          </CardContent>
        </Card>
      </div>

      {/* Reassignment List */}
      {reassignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCheck className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900">No Pending Reassignments</p>
            <p className="text-sm text-gray-500 mt-2">All covering duties are currently assigned</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reassignments.map((reassignment) => (
            <Card key={reassignment.id} className="border-orange-200 bg-orange-50/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        Cover Reassignment Required
                      </CardTitle>
                      {reassignment.coverEmployeeLeave.leaveType === 'MEDICAL' && (
                        <Badge variant="destructive" className="text-xs">
                          Medical - Priority
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      Created {new Date(reassignment.createdAt).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Situation Summary */}
                <div className="bg-white rounded-lg p-4 space-y-3 border border-orange-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <p className="font-medium text-gray-900">Situation:</p>
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">
                          {reassignment.coverEmployeeLeave.employee.firstName}{' '}
                          {reassignment.coverEmployeeLeave.employee.lastName}
                        </span>{' '}
                        was assigned to cover for{' '}
                        <span className="font-semibold">
                          {reassignment.originalLeave.employee.firstName}{' '}
                          {reassignment.originalLeave.employee.lastName}
                        </span>
                        , but has now taken{' '}
                        <span className="font-semibold lowercase">{reassignment.coverEmployeeLeave.leaveType}</span> leave.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Leave Details */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Original Leave */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4 text-blue-600" />
                      <h4 className="font-semibold text-blue-900">Original Leave (Needs Cover)</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Employee:</span>{' '}
                        <span className="font-medium">
                          {reassignment.originalLeave.employee.firstName}{' '}
                          {reassignment.originalLeave.employee.lastName}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">ID:</span>{' '}
                        <span className="font-medium">{reassignment.originalLeave.employee.employeeId}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Type:</span>{' '}
                        <Badge variant="outline" className="ml-1">
                          {reassignment.originalLeave.leaveType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(reassignment.originalLeave.startDate).toLocaleDateString()} -{' '}
                          {new Date(reassignment.originalLeave.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Duration:</span>{' '}
                        <span className="font-medium">{reassignment.originalLeave.totalDays} days</span>
                      </div>
                    </div>
                  </div>

                  {/* Cover Employee Leave */}
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <h4 className="font-semibold text-red-900">Cover Employee Leave</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Employee:</span>{' '}
                        <span className="font-medium">
                          {reassignment.coverEmployeeLeave.employee.firstName}{' '}
                          {reassignment.coverEmployeeLeave.employee.lastName}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Type:</span>{' '}
                        <Badge
                          variant={reassignment.coverEmployeeLeave.leaveType === 'MEDICAL' ? 'destructive' : 'outline'}
                          className="ml-1"
                        >
                          {reassignment.coverEmployeeLeave.leaveType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(reassignment.coverEmployeeLeave.startDate).toLocaleDateString()} -{' '}
                          {new Date(reassignment.coverEmployeeLeave.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
                        ⚠️ Cannot fulfill covering duty
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assignment Section */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">Assign New Cover Employee</h4>

                  {!availableEmployees[reassignment.id] ? (
                    <Button
                      onClick={() => handleExpandReassignment(reassignment)}
                      variant="outline"
                      className="w-full"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View Available Employees
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Select New Cover Employee</Label>
                        <Select
                          value={selectedEmployees[reassignment.id] || ''}
                          onValueChange={(value) =>
                            setSelectedEmployees(prev => ({ ...prev, [reassignment.id]: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose an employee..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableEmployees[reassignment.id]?.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id} disabled={emp.onLeave}>
                                <div className="flex items-center justify-between w-full">
                                  <span>
                                    {emp.name} ({emp.employeeId})
                                  </span>
                                  {emp.onLeave ? (
                                    <Badge variant="destructive" className="ml-2 text-xs">On Leave</Badge>
                                  ) : (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      Workload: {emp.coveringCount}
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Available Employees Stats */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-green-50 p-2 rounded border border-green-200">
                          <span className="text-gray-600">Available:</span>{' '}
                          <span className="font-semibold text-green-700">
                            {availableEmployees[reassignment.id]?.filter(e => e.available).length || 0}
                          </span>
                        </div>
                        <div className="bg-red-50 p-2 rounded border border-red-200">
                          <span className="text-gray-600">On Leave:</span>{' '}
                          <span className="font-semibold text-red-700">
                            {availableEmployees[reassignment.id]?.filter(e => !e.available).length || 0}
                          </span>
                        </div>
                      </div>

                      {/* Assign Button */}
                      <Button
                        onClick={() => handleAssign(reassignment.id)}
                        disabled={!selectedEmployees[reassignment.id] || processing[reassignment.id]}
                        className="w-full"
                      >
                        {processing[reassignment.id] ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Assigning...
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Assign Cover Employee
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
