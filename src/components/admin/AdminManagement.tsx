// src/components/admin/AdminManagement.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Shield, Mail, Calendar, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface Admin {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  adminType: string | null;
  department: string;
  position: string;
  isActive: boolean;
  createdAt: string;
  canDelete: boolean;
}

export function AdminManagement() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<Admin | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    // Get current user from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUserId(user.id);
    }

    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const user = JSON.parse(userStr);
      const response = await fetch(`/api/admin/list?adminId=${user.id}`);

      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins);

        // Set current admin data
        const current = data.admins.find((admin: Admin) => admin.id === user.id);
        if (current) {
          setCurrentAdmin(current);
        }
      } else {
        toast.error('Failed to fetch admin list');
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('An error occurred while fetching admins');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = async (admin: Admin) => {
    try {
      // Fetch full user data from API
      const response = await fetch(`/api/employees/${admin.id}`);

      if (response.ok) {
        const data = await response.json();
        const employee = data.employee;

        setEditFormData({
          firstName: employee.firstName || '',
          lastName: employee.lastName || '',
          email: employee.email || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setShowEditDialog(true);
      } else {
        toast.error('Failed to load profile data');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('An error occurred while loading profile');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password fields if changing password
    if (editFormData.newPassword || editFormData.confirmPassword || editFormData.currentPassword) {
      if (!editFormData.currentPassword) {
        toast.error('Current password is required to change password');
        return;
      }

      if (!editFormData.newPassword) {
        toast.error('New password is required');
        return;
      }

      if (editFormData.newPassword !== editFormData.confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }

      if (editFormData.newPassword.length < 6) {
        toast.error('New password must be at least 6 characters');
        return;
      }
    }

    setUpdating(true);

    try {
      const updateData: any = {
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        email: editFormData.email,
      };

      // Add password fields only if changing password
      if (editFormData.currentPassword && editFormData.newPassword) {
        updateData.currentPassword = editFormData.currentPassword;
        updateData.newPassword = editFormData.newPassword;
      }

      const response = await fetch(`/api/admin/${currentUserId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(updateData.newPassword ? 'Profile and password updated successfully' : 'Profile updated successfully');
        setShowEditDialog(false);

        // Update localStorage with new user data
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const updatedUser = {
            ...user,
            firstName: editFormData.firstName,
            lastName: editFormData.lastName,
            email: editFormData.email,
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }

        // Reset form
        setEditFormData({
          firstName: '',
          lastName: '',
          email: '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });

        fetchAdmins();
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('An error occurred while updating profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setCreating(true);

    try {
      const response = await fetch('/api/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          currentAdminId: currentUserId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Admin ${data.admin.name} created successfully`);
        setShowCreateDialog(false);
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
        fetchAdmins();
      } else {
        toast.error(data.error || 'Failed to create admin');
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      toast.error('An error occurred while creating admin');
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!adminToRemove) return;

    setRemoving(true);

    try {
      const response = await fetch(`/api/admin/${adminToRemove.id}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentAdminId: currentUserId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setAdminToRemove(null);
        fetchAdmins();
      } else {
        toast.error(data.error || 'Failed to remove admin');
      }
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error('An error occurred while removing admin');
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading admins...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Admin Management
              </CardTitle>
              <CardDescription>
                Manage system administrators ({admins.length} admin{admins.length !== 1 ? 's' : ''}).
                Managing Director can manage all admins. HR Head can only manage Reserved Admin.
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add New Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Admin</DialogTitle>
                  <DialogDescription>
                    Add a new Reserved Admin to the system. Only Managing Director and HR Head can create new admins.
                    Reserved admins have full access but cannot remove other administrators.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAdmin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? 'Creating...' : 'Create Admin'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Admin Type</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No admins found
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.employeeId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {admin.name}
                        {admin.id === currentUserId && (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {admin.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {admin.adminType === 'MANAGING_DIRECTOR' && (
                        <Badge className="bg-amber-500 hover:bg-amber-600">
                          Managing Director
                        </Badge>
                      )}
                      {admin.adminType === 'HR_HEAD' && (
                        <Badge className="bg-blue-500 hover:bg-blue-600">
                          HR Head
                        </Badge>
                      )}
                      {admin.adminType === 'RESERVED' && (
                        <Badge variant="secondary">
                          Reserved Admin
                        </Badge>
                      )}
                      {!admin.adminType && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Not Set
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{admin.position}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {admin.isActive ? (
                        <Badge variant="default" className="bg-green-500">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {admin.id === currentUserId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProfile(admin)}
                            title="Edit your profile"
                          >
                            <Edit className="h-4 w-4 text-blue-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAdminToRemove(admin)}
                          disabled={!admin.canDelete || admins.length <= 1}
                          title={
                            admins.length <= 1
                              ? 'Cannot remove the last admin'
                              : !admin.canDelete
                              ? admin.id === currentUserId
                                ? 'Cannot remove yourself'
                                : 'You do not have permission to remove this admin'
                              : 'Remove admin privileges'
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!adminToRemove} onOpenChange={() => setAdminToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Admin Privileges?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Are you sure you want to remove admin privileges from{' '}
                  <strong>{adminToRemove?.name}</strong>
                  {adminToRemove?.adminType && (
                    <span className="text-muted-foreground">
                      {' '}({adminToRemove.adminType === 'MANAGING_DIRECTOR' ? 'Managing Director' :
                         adminToRemove.adminType === 'HR_HEAD' ? 'HR Head' : 'Reserved Admin'})
                    </span>
                  )}?
                </p>
                <p className="text-yellow-600 font-medium">
                  This will convert their account to a regular employee account. They will lose access
                  to the admin dashboard and all admin privileges.
                </p>
                {adminToRemove?.adminType === 'RESERVED' && (
                  <p className="text-sm text-muted-foreground">
                    Note: This will free up the Reserved Admin position for a new admin to be created.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAdmin}
              disabled={removing}
              className="bg-red-500 hover:bg-red-600"
            >
              {removing ? 'Removing...' : 'Remove Admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Your Profile</DialogTitle>
            <DialogDescription>
              Update your personal information. Changes will be reflected across the system.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input
                  id="edit-firstName"
                  placeholder="First Name"
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input
                  id="edit-lastName"
                  placeholder="Last Name"
                  value={editFormData.lastName}
                  onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="admin@example.com"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                required
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium mb-3">Change Password (Optional)</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-currentPassword">Current Password</Label>
                  <Input
                    id="edit-currentPassword"
                    type="password"
                    placeholder="Enter current password"
                    value={editFormData.currentPassword}
                    onChange={(e) => setEditFormData({ ...editFormData, currentPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-newPassword">New Password</Label>
                  <Input
                    id="edit-newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={editFormData.newPassword}
                    onChange={(e) => setEditFormData({ ...editFormData, newPassword: e.target.value })}
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-confirmPassword">Confirm New Password</Label>
                  <Input
                    id="edit-confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={editFormData.confirmPassword}
                    onChange={(e) => setEditFormData({ ...editFormData, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updating}>
                {updating ? 'Updating...' : 'Update Profile'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
