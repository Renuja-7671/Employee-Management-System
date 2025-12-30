// src/components/admin/EmployeeManagement.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Download, UserX, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getEmployees, createEmployee, updateEmployee, Employee as EmployeeAPI } from '@/lib/api/employees';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Employee extends EmployeeAPI {
  name: string;
}

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [nextEmployeeId, setNextEmployeeId] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    callingName: '',
    fullName: '',
    nameWithInitials: '',
    nic: '',
    email: '',
    password: '',
    employeeId: '',
    phone: '',
    address: '',
    birthday: '',
    department: '',
    position: '',
    emergencyContact: '',
    dateOfJoining: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (showAddDialog) {
      fetchNextEmployeeId();
    }
  }, [showAddDialog]);

  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();
      // Transform employees data to include full name
      const transformedEmployees = data.map(emp => ({
        ...emp,
        name: `${emp.firstName} ${emp.lastName}`
      }));
      setEmployees(transformedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchNextEmployeeId = async () => {
    try {
      const response = await fetch('/api/employees/next-id', {
        cache: 'no-cache', // Always get fresh ID, but don't store
      });
      if (response.ok) {
        const data = await response.json();
        setNextEmployeeId(data.nextId);
        setFormData(prev => ({
          ...prev,
          employeeId: data.nextId,
        }));
      }
    } catch (error) {
      console.error('Error fetching next employee ID:', error);
      toast.error('Failed to generate employee ID');
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setProfilePicture(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Handle profile picture upload if present
      let profilePicturePath = null;
      if (profilePicture) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', profilePicture);
        formDataUpload.append('employeeId', formData.employeeId);

        try {
          const uploadResponse = await fetch('/api/upload/profile-picture', {
            method: 'POST',
            body: formDataUpload,
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            profilePicturePath = uploadData.path;
          } else {
            toast.error('Failed to upload profile picture');
          }
        } catch (uploadError) {
          console.error('Error uploading profile picture:', uploadError);
          toast.error('Failed to upload profile picture');
        }
      }

      // Prepare employee data for API
      const employeeData = {
        callingName: formData.callingName,
        fullName: formData.fullName,
        nameWithInitials: formData.nameWithInitials,
        nic: formData.nic || null,
        email: formData.email,
        password: formData.password,
        employeeId: formData.employeeId,
        department: formData.department,
        position: formData.position,
        phoneNumber: formData.phone || null,
        birthday: formData.birthday || null,
        address: formData.address || null,
        emergencyContact: formData.emergencyContact || null,
        dateOfJoining: formData.dateOfJoining || null,
        profilePicture: profilePicturePath,
      };

      const result = await createEmployee(employeeData);

      if (result.success) {
        toast.success('Employee created successfully');
        setShowAddDialog(false);
        setFormData({
          callingName: '',
          fullName: '',
          nameWithInitials: '',
          nic: '',
          email: '',
          password: '',
          employeeId: '',
          phone: '',
          address: '',
          birthday: '',
          department: '',
          position: '',
          emergencyContact: '',
          dateOfJoining: '',
        });
        setProfilePicture(null);
        setProfilePicturePreview('');
        fetchEmployees();
      } else {
        // Check if error is about duplicate employeeId
        if (result.error?.includes('employeeId') || result.error?.includes('Unique constraint')) {
          toast.error(`Employee ID "${formData.employeeId}" already exists. Please use a different ID.`);
        } else {
          toast.error(result.error || 'Failed to create employee');
        }
      }
    } catch (error: any) {
      // Check if error is about duplicate employeeId
      if (error.message?.includes('employeeId') || error.message?.includes('Unique constraint')) {
        toast.error(`Employee ID "${formData.employeeId}" already exists. Please use a different ID.`);
      } else {
        toast.error(error.message || 'Failed to create employee');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateEmployee = async () => {
    if (!selectedEmployee) return;

    setSubmitting(true);
    try {
      const result = await updateEmployee(selectedEmployee.id, {
        isActive: false,
      });

      if (result.success) {
        toast.success(`Employee ${selectedEmployee.name} has been deactivated`);
        setShowDeactivateDialog(false);
        setSelectedEmployee(null);
        fetchEmployees();
      } else {
        toast.error(result.error || 'Failed to deactivate employee');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivateEmployee = async (employee: Employee) => {
    setSubmitting(true);
    try {
      const result = await updateEmployee(employee.id, {
        isActive: true,
      });

      if (result.success) {
        toast.success(`Employee ${employee.name} has been reactivated`);
        fetchEmployees();
      } else {
        toast.error(result.error || 'Failed to reactivate employee');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reactivate employee');
    } finally {
      setSubmitting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Employee ID', 'Name', 'Email', 'Joined Date'];
    const rows = employees.map((emp) => [
      emp.employeeId,
      emp.name,
      emp.email,
      new Date(emp.dateOfJoining).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Employee list exported');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Filter employees based on active status
  const filteredEmployees = showInactive
    ? employees
    : employees.filter(emp => emp.isActive);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Employee Management</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={showInactive ? 'default' : 'outline'}
                onClick={() => setShowInactive(!showInactive)}
              >
                {showInactive ? 'Hide' : 'Show'} Inactive Employees
              </Button>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Employee
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Employee</DialogTitle>
                    <DialogDescription>
                      Create a new employee account with initial leave balances.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddEmployee} className="space-y-4">
                    {/* Profile Picture Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="profilePicture">Profile Picture</Label>
                      <div className="flex items-center gap-4">
                        {profilePicturePreview && (
                          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
                            <img
                              src={profilePicturePreview}
                              alt="Profile preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <Input
                            id="profilePicture"
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePictureChange}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Upload employee profile picture (Max 5MB, JPG/PNG)
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="employeeId">
                          Employee ID <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="employeeId"
                          placeholder="Loading..."
                          value={formData.employeeId}
                          readOnly
                          disabled
                          className="bg-gray-50 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500">
                          Auto-generated employee ID
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="callingName">
                          Calling Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="callingName"
                          placeholder="e.g., Malinda"
                          value={formData.callingName}
                          onChange={(e) =>
                            setFormData({ ...formData, callingName: e.target.value })
                          }
                          required
                        />
                        <p className="text-xs text-gray-500">
                          The name used in daily communication
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">
                          Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="fullName"
                          placeholder="e.g., Don Malinda Perera"
                          value={formData.fullName}
                          onChange={(e) =>
                            setFormData({ ...formData, fullName: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nameWithInitials">
                          Name with Initials <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="nameWithInitials"
                          placeholder="e.g., D.M. Perera"
                          value={formData.nameWithInitials}
                          onChange={(e) =>
                            setFormData({ ...formData, nameWithInitials: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nic">
                          NIC (National Identity Card)
                        </Label>
                        <Input
                          id="nic"
                          placeholder="e.g., 199512345678 or 951234567V"
                          value={formData.nic}
                          onChange={(e) =>
                            setFormData({ ...formData, nic: e.target.value })
                          }
                          maxLength={12}
                        />
                        <p className="text-xs text-gray-500">
                          New NIC format (12 digits) or Old NIC format (9 digits + V/X)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">
                          Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="malinda@example.com"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">
                          Initial Password <span className="text-red-500">*</span>
                        </Label>
                        <PasswordInput
                          id="password"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              password: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="position">Position</Label>
                        <Input
                          id="position"
                          placeholder="e.g., Software Engineer"
                          value={formData.position}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              position: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">
                          Department <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.department}
                          onValueChange={(value: string) =>
                            setFormData({
                              ...formData,
                              department: value,
                            })
                          }
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MANAGEMENT">Management</SelectItem>
                            <SelectItem value="SALES_AND_MARKETING">Sales & Marketing</SelectItem>
                            <SelectItem value="FINANCE">Finance</SelectItem>
                            <SelectItem value="STORES">Stores</SelectItem>
                            <SelectItem value="PROCUREMENT">Procurement</SelectItem>
                            <SelectItem value="HR">Human Resources</SelectItem>
                            <SelectItem value="IT">IT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1 234 567 8900"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birthday">Birthday</Label>
                        <Input
                          id="birthday"
                          type="date"
                          value={formData.birthday}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              birthday: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dateOfJoining">
                          Joined Date <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="dateOfJoining"
                          type="date"
                          value={formData.dateOfJoining}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              dateOfJoining: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        placeholder="Full address"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContact">
                        Emergency Contact
                      </Label>
                      <Input
                        id="emergencyContact"
                        placeholder="Name and phone number"
                        value={formData.emergencyContact}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            emergencyContact: e.target.value,
                          })
                        }
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={submitting}
                    >
                      {submitting ? 'Creating...' : 'Create Employee'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>NIC</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-gray-500 py-8"
                    >
                      {showInactive
                        ? 'No employees found.'
                        : 'No active employees found. Add your first employee to get started.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} className={!employee.isActive ? 'bg-gray-50' : ''}>
                      <TableCell className="font-medium">
                        {employee.employeeId}
                      </TableCell>
                      <TableCell>{employee.name}</TableCell>
                      <TableCell className="text-gray-600">
                        {employee.nic || '-'}
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>
                        {new Date(employee.dateOfJoining).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {employee.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {employee.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setShowDeactivateDialog(true);
                            }}
                            disabled={submitting}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReactivateEmployee(employee)}
                            disabled={submitting}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Reactivate
                          </Button>
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

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{selectedEmployee?.name}</strong>?
              <br />
              <br />
              This employee will no longer be able to access their account, but all their data will be preserved.
              You can reactivate this employee at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateEmployee}
              className="bg-red-600 hover:bg-red-700"
              disabled={submitting}
            >
              {submitting ? 'Deactivating...' : 'Deactivate Employee'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}