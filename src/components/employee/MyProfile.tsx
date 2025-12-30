'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { User, Mail, Phone, MapPin, Calendar, Briefcase, Building2, AlertCircle, Shield, Edit, Save, X, Lock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../ui/dialog';

interface MyProfileProps {
  user: any;
  profile: any;
}

export function MyProfile({ user, profile: initialProfile }: MyProfileProps) {
  const [profile, setProfile] = useState<any>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    address: '',
    birthday: '',
    emergencyContact: '',
    nic: '',
  });
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
      setFormData({
        phoneNumber: initialProfile.phoneNumber || '',
        address: initialProfile.address || '',
        birthday: initialProfile.birthday ? new Date(initialProfile.birthday).toISOString().split('T')[0] : '',
        emergencyContact: initialProfile.emergencyContact || '',
        nic: initialProfile.nic || '',
      });
    }
  }, [initialProfile]);

  useEffect(() => {
    const fetchProfilePicture = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/profile/picture/${user.id}`);

      if (response.ok) {
        const data = await response.json();
        setProfilePictureUrl(data.url);
      }
    } catch (error) {
      console.error('Error fetching profile picture:', error);
    }
   };

    fetchProfilePicture();
  }, [user?.id]);

  

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);

    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Password changed successfully');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setChangePasswordOpen(false);
      } else {
        toast.error(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Profile updated successfully');
        setProfile(data.profile);
        // Update localStorage to persist changes across page reloads
        const currentProfile = localStorage.getItem('profile');
        if (currentProfile) {
          const updatedProfile = { ...JSON.parse(currentProfile), ...data.profile };
          localStorage.setItem('profile', JSON.stringify(updatedProfile));
          // Manually dispatch storage event to trigger useAuth hook refresh
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'profile',
            newValue: JSON.stringify(updatedProfile),
            oldValue: currentProfile,
            storageArea: localStorage,
            url: window.location.href
          }));
        }
        setEditMode(false);
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      phoneNumber: profile.phoneNumber || '',
      address: profile.address || '',
      birthday: profile.birthday ? new Date(profile.birthday).toISOString().split('T')[0] : '',
      emergencyContact: profile.emergencyContact || '',
      nic: profile.nic || '',
    });
    setEditMode(false);
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatBirthday = (birthday: string) => {
    if (!birthday) return 'Not set';
    const date = new Date(birthday);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {profilePictureUrl && <AvatarImage src={profilePictureUrl} alt={profile.fullName || profile.callingName || 'Profile'} />}
                <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl">
                  {getInitials(profile.fullName || profile.callingName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim())}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-semibold">{profile.fullName || profile.callingName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim()}</h2>
                <p className="text-gray-600 flex items-center gap-2 mt-1">
                  <User className="h-4 w-4" />
                  {profile.employeeId}
                </p>
                <Badge variant="secondary" className="mt-2">
                  {profile.role}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Lock className="h-4 w-4" />
                    Change Password
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                      Enter your current password and new password below. Make sure it is at least 6 characters long.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        placeholder="Enter current password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        placeholder="Enter new password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm new password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setChangePasswordOpen(false);
                          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={changingPassword}>
                        {changingPassword ? 'Changing...' : 'Change Password'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              {!editMode ? (
                <Button onClick={() => setEditMode(true)} className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCancelEdit} className="gap-2">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateProfile} disabled={loading} className="gap-2">
                    <Save className="h-4 w-4" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Your basic personal details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-gray-500">Full Name</Label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'N/A'}</span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <Label className="text-gray-500">Email Address</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{profile.email}</span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <Label className="text-gray-500">NIC (National Identity Card)</Label>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <span>{profile.nic || 'Not set'}</span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <Label className="text-gray-500">Phone Number</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{profile.phoneNumber || 'Not set'}</span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <Label className="text-gray-500">Date of Birth</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{formatBirthday(profile.birthday)}</span>
                  </div>
                </div>
          </CardContent>
        </Card>

        {/* Work Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Work Information
            </CardTitle>
            <CardDescription>
              Your employment details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-gray-500">Employee ID</Label>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-400" />
                <span>{profile.employeeId}</span>
              </div>
            </div>
            <Separator />
            <div className="space-y-1">
              <Label className="text-gray-500">Position</Label>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-400" />
                <span>{profile.position || 'Not set'}</span>
              </div>
            </div>
            <Separator />
            <div className="space-y-1">
              <Label className="text-gray-500">Department</Label>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span>{profile.department || 'Not set'}</span>
              </div>
            </div>
            <Separator />
            <div className="space-y-1">
              <Label className="text-gray-500">Joined Date</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{formatDate(profile.dateOfJoining)}</span>
              </div>
            </div>
            {!profile.position || !profile.department ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-blue-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Contact admin to update your position and department
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address
            </CardTitle>
            <CardDescription>
              Your residential address
            </CardDescription>
          </CardHeader>
          <CardContent>
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                  <span className="text-gray-700">
                    {profile.address || 'No address on file'}
                  </span>
                </div>
              </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Emergency Contact
            </CardTitle>
            <CardDescription>
              Person to contact in case of emergency
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!editMode ? (
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-gray-400 mt-1" />
                  <span className="text-gray-700">
                    {profile.emergencyContact || 'No emergency contact on file'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  placeholder="Name and phone number"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                />
                <p className="text-xs text-gray-500">
                  Include name and phone number (e.g., Ashan - 077 123 4567)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons for Edit Mode */}
      {editMode && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700">
                <AlertCircle className="h-5 w-5" />
                <span>You are currently editing your profile</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancelEdit} className="gap-2">
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleUpdateProfile} disabled={loading} className="gap-2">
                  <Save className="h-4 w-4" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
