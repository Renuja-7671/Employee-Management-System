'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, UserCheck, Fingerprint, ScanFace } from 'lucide-react';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  department: string;
}

interface BiometricMapping {
  id: string;
  employeeId: string;
  deviceEmployeeNo: string;
  cardNo: string | null;
  fingerprintEnrolled: boolean;
  faceEnrolled: boolean;
  syncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  employee: Employee;
}

interface FormData {
  employeeId: string;
  deviceEmployeeNo: string;
  cardNo: string;
  fingerprintEnrolled: boolean;
  faceEnrolled: boolean;
}

export function BiometricMappings() {
  const [mappings, setMappings] = useState<BiometricMapping[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    employeeId: '',
    deviceEmployeeNo: '',
    cardNo: '',
    fingerprintEnrolled: false,
    faceEnrolled: false,
  });

  useEffect(() => {
    fetchMappings();
    fetchEmployees();
  }, []);

  const fetchMappings = async () => {
    try {
      const response = await fetch('/api/admin/biometric-mappings', {
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setMappings(data.mappings || []);
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
      toast.error('Failed to fetch biometric mappings');
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees', {
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleOpenDialog = (mapping?: BiometricMapping) => {
    if (mapping) {
      setEditingId(mapping.id);
      setFormData({
        employeeId: mapping.employeeId,
        deviceEmployeeNo: mapping.deviceEmployeeNo,
        cardNo: mapping.cardNo || '',
        fingerprintEnrolled: mapping.fingerprintEnrolled,
        faceEnrolled: mapping.faceEnrolled,
      });
    } else {
      setEditingId(null);
      setFormData({
        employeeId: '',
        deviceEmployeeNo: '',
        cardNo: '',
        fingerprintEnrolled: false,
        faceEnrolled: false,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({
      employeeId: '',
      deviceEmployeeNo: '',
      cardNo: '',
      fingerprintEnrolled: false,
      faceEnrolled: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.deviceEmployeeNo) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const url = editingId
        ? `/api/admin/biometric-mappings/${editingId}`
        : '/api/admin/biometric-mappings';

      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          cardNo: formData.cardNo || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        handleCloseDialog();
        fetchMappings();
      } else {
        toast.error(data.error || 'Failed to save mapping');
      }
    } catch (error) {
      console.error('Error saving mapping:', error);
      toast.error('Failed to save mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this biometric mapping?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/biometric-mappings/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        fetchMappings();
      } else {
        toast.error(data.error || 'Failed to delete mapping');
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast.error('Failed to delete mapping');
    }
  };

  // Filter out employees who already have mappings (when creating new)
  const availableEmployees = editingId
    ? employees
    : employees.filter(
        (emp) => !mappings.some((mapping) => mapping.employeeId === emp.id)
      );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Biometric Mappings</CardTitle>
              <CardDescription>
                Map employees to their biometric device employee numbers
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Mapping
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Device Employee No</TableHead>
                  <TableHead>Card No</TableHead>
                  <TableHead>Fingerprint</TableHead>
                  <TableHead>Face</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No biometric mappings found
                    </TableCell>
                  </TableRow>
                ) : (
                  mappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-medium">
                        {mapping.employee.employeeId}
                      </TableCell>
                      <TableCell>
                        {mapping.employee.firstName} {mapping.employee.lastName}
                      </TableCell>
                      <TableCell>{mapping.employee.department}</TableCell>
                      <TableCell>
                        <span className="font-mono text-sm bg-blue-50 px-2 py-1 rounded">
                          {mapping.deviceEmployeeNo}
                        </span>
                      </TableCell>
                      <TableCell>
                        {mapping.cardNo ? (
                          <span className="font-mono text-sm">{mapping.cardNo}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {mapping.fingerprintEnrolled ? (
                          <div className="flex items-center text-green-600">
                            <Fingerprint className="w-4 h-4 mr-1" />
                            <span className="text-sm">Yes</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {mapping.faceEnrolled ? (
                          <div className="flex items-center text-green-600">
                            <ScanFace className="w-4 h-4 mr-1" />
                            <span className="text-sm">Yes</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(mapping)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(mapping.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Biometric Mapping' : 'Add Biometric Mapping'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the biometric mapping details'
                : 'Create a new biometric mapping for an employee'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee *</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(value) =>
                  setFormData({ ...formData, employeeId: value })
                }
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {availableEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.employeeId} - {employee.firstName} {employee.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingId && (
                <p className="text-xs text-muted-foreground">
                  Employee cannot be changed after creation
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceEmployeeNo">Device Employee Number *</Label>
              <Input
                id="deviceEmployeeNo"
                value={formData.deviceEmployeeNo}
                onChange={(e) =>
                  setFormData({ ...formData, deviceEmployeeNo: e.target.value })
                }
                placeholder="e.g., EMP001"
                required
              />
              <p className="text-xs text-muted-foreground">
                Must match the employee number configured on the biometric device
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardNo">Card Number (Optional)</Label>
              <Input
                id="cardNo"
                value={formData.cardNo}
                onChange={(e) =>
                  setFormData({ ...formData, cardNo: e.target.value })
                }
                placeholder="e.g., 1234567890"
              />
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fingerprintEnrolled"
                  checked={formData.fingerprintEnrolled}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      fingerprintEnrolled: checked as boolean,
                    })
                  }
                />
                <Label
                  htmlFor="fingerprintEnrolled"
                  className="text-sm font-normal flex items-center cursor-pointer"
                >
                  <Fingerprint className="w-4 h-4 mr-1" />
                  Fingerprint Enrolled
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="faceEnrolled"
                  checked={formData.faceEnrolled}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      faceEnrolled: checked as boolean,
                    })
                  }
                />
                <Label
                  htmlFor="faceEnrolled"
                  className="text-sm font-normal flex items-center cursor-pointer"
                >
                  <ScanFace className="w-4 h-4 mr-1" />
                  Face Enrolled
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
