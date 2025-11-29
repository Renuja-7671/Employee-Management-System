// src/components/admin/EmployeeProfiles.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Cake,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Building2,
  AlertCircle,
  Send,
  Search,
  Calendar as CalendarIcon,
  Edit,
  Save,
  X,
  Gift,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { getEmployees, Employee as EmployeeAPI } from '@/lib/api/employees';
import { getProfilePicture } from '@/lib/api/profile';
import { Textarea } from '@/components/ui/textarea';
import { BirthdayEmails } from './BirthdayEmails';

interface Employee extends EmployeeAPI {
  name: string;
  nameWithInitials?: string | null;
  birthday?: string;
  address?: string;
  emergencyContact?: string;
  phone?: string;
}

export function EmployeeProfiles() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showBirthdayDialog, setShowBirthdayDialog] = useState(false);
  const [birthdayMessage, setBirthdayMessage] = useState('');
  const [profilePictures, setProfilePictures] = useState<
    Record<string, string>
  >({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    nameWithInitials: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    birthday: '',
    address: '',
    emergencyContact: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();
      // Transform employees data to include full name and map phone field
      const transformedEmployees = data.map(emp => ({
        ...emp,
        name: `${emp.firstName} ${emp.lastName}`,
        phone: emp.phoneNumber ?? undefined,
        birthday: emp.birthday ? new Date(emp.birthday).toISOString().split('T')[0] : undefined,
        address: emp.address ?? undefined,
        emergencyContact: emp.emergencyContact ?? undefined
      }));
      setEmployees(transformedEmployees);

      // Fetch profile pictures for employees
      const pictures: Record<string, string> = {};
      await Promise.all(
        transformedEmployees.map(async (emp) => {
          const url = await getProfilePicture(emp.id);
          if (url) pictures[emp.id] = url;
        })
      );
      setProfilePictures(pictures);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employee profiles');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const calculateAge = (birthday: string) => {
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const getUpcomingBirthdays = () => {
    const today = new Date();
    const upcomingDays = 30;

    return employees
      .filter((emp) => emp.birthday)
      .map((emp) => {
        const [year, month, day] = emp.birthday!.split('-');
        const birthdayThisYear = new Date(
          today.getFullYear(),
          parseInt(month) - 1,
          parseInt(day)
        );
        const birthdayNextYear = new Date(
          today.getFullYear() + 1,
          parseInt(month) - 1,
          parseInt(day)
        );

        let nextBirthday = birthdayThisYear;
        if (birthdayThisYear < today) {
          nextBirthday = birthdayNextYear;
        }

        const daysUntil = Math.ceil(
          (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          ...emp,
          nextBirthday,
          daysUntil,
        };
      })
      .filter((emp) => emp.daysUntil <= upcomingDays)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  };

  const sendBirthdayWish = async () => {
    if (!selectedEmployee || !birthdayMessage.trim()) {
      toast.error('Please enter a birthday message');
      return;
    }

    try {
      const response = await fetch('/api/employees/birthday-wish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          message: birthdayMessage,
        }),
      });

      if (response.ok) {
        toast.success('Birthday wish sent successfully! 🎉');
        setShowBirthdayDialog(false);
        setBirthdayMessage('');
      } else {
        toast.error('Failed to send birthday wish');
      }
    } catch (error) {
      console.error('Error sending birthday wish:', error);
      toast.error('Failed to send birthday wish');
    }
  };

  const handleEditClick = () => {
    if (selectedEmployee) {
      setEditFormData({
        firstName: selectedEmployee.firstName,
        lastName: selectedEmployee.lastName,
        nameWithInitials: selectedEmployee.nameWithInitials || '',
        email: selectedEmployee.email,
        phone: selectedEmployee.phone || '',
        position: selectedEmployee.position,
        department: selectedEmployee.department,
        birthday: selectedEmployee.birthday || '',
        address: selectedEmployee.address || '',
        emergencyContact: selectedEmployee.emergencyContact || '',
      });
      setIsEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditFormData({
      firstName: '',
      lastName: '',
      nameWithInitials: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      birthday: '',
      address: '',
      emergencyContact: '',
    });
  };

  const handleSaveEdit = async () => {
    if (!selectedEmployee) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: editFormData.firstName,
          lastName: editFormData.lastName,
          nameWithInitials: editFormData.nameWithInitials || null,
          email: editFormData.email,
          phoneNumber: editFormData.phone || null,
          position: editFormData.position,
          department: editFormData.department,
          birthday: editFormData.birthday || null,
          address: editFormData.address || null,
          emergencyContact: editFormData.emergencyContact || null,
        }),
      });

      if (response.ok) {
        toast.success('Employee details updated successfully');
        setIsEditMode(false);
        await fetchEmployees();
        setShowDetailsDialog(false);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update employee details');
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Failed to update employee details');
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const upcomingBirthdays = getUpcomingBirthdays();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="profiles" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profiles" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Employee Profiles
          </TabsTrigger>
          <TabsTrigger value="birthday-emails" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Birthday Emails
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="space-y-6 mt-6">
          {/* Upcoming Birthdays Section */}
          {upcomingBirthdays.length > 0 && (
        <Card className="bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-pink-700">
              <Cake className="h-5 w-5" />
              Upcoming Birthdays 🎉
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {upcomingBirthdays.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-pink-100"
                >
                  <Avatar className="h-12 w-12">
                    {profilePictures[emp.id] && (
                      <AvatarImage src={profilePictures[emp.id]} />
                    )}
                    <AvatarFallback className="bg-pink-100 text-pink-700">
                      {getInitials(emp.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{emp.name}</p>
                    <p className="text-sm text-gray-600">
                      {emp.daysUntil === 0
                        ? '🎂 Today!'
                        : `In ${emp.daysUntil} ${emp.daysUntil === 1 ? 'day' : 'days'}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setBirthdayMessage(
                        `Happy Birthday, ${emp.name.split(' ')[0]}! 🎉🎂 Wishing you a wonderful day filled with joy and happiness!`
                      );
                      setShowBirthdayDialog(true);
                    }}
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee Profiles */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Employee Profiles</CardTitle>
            <div className="w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-[300px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredEmployees.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-8">
                No employees found
              </div>
            ) : (
              filteredEmployees.map((employee) => (
                <Card
                  key={employee.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedEmployee(employee);
                    setShowDetailsDialog(true);
                  }}
                >
                  <CardContent className="pt-4 pb-3">
                    <div className="flex flex-col items-center text-center space-y-2">
                      <Avatar className="h-14 w-14">
                        {profilePictures[employee.id] && (
                          <AvatarImage src={profilePictures[employee.id]} />
                        )}
                        <AvatarFallback className="bg-teal-100 text-teal-700 text-sm">
                          {getInitials(employee.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="space-y-1 w-full">
                        <h3 className="font-semibold text-sm leading-tight">
                          {employee.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs">{employee.employeeId}</Badge>
                      </div>

                      <div className="w-full space-y-1.5 text-xs text-gray-600">
                        {employee.position && (
                          <div className="flex items-center gap-1.5 justify-center">
                            <Briefcase className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{employee.position}</span>
                          </div>
                        )}
                        {employee.department && (
                          <div className="flex items-center gap-1.5 justify-center">
                            <Building2 className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {employee.department}
                            </span>
                          </div>
                        )}
                        {employee.birthday && (
                          <div className="flex items-center gap-1.5 justify-center">
                            <Cake className="h-3 w-3 flex-shrink-0" />
                            <span className="text-xs">
                              {new Date(employee.birthday).toLocaleDateString(
                                'en-US',
                                { month: 'short', day: 'numeric' }
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(employee);
                          setShowDetailsDialog(true);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employee Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={(open) => {
        setShowDetailsDialog(open);
        if (!open) {
          setIsEditMode(false);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Employee Details' : 'Employee Details'}
            </DialogTitle>
          </DialogHeader>

          {selectedEmployee && (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-20 w-20">
                  {profilePictures[selectedEmployee.id] && (
                    <AvatarImage src={profilePictures[selectedEmployee.id]} />
                  )}
                  <AvatarFallback className="bg-teal-100 text-teal-700 text-xl">
                    {getInitials(selectedEmployee.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  {isEditMode ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="First Name"
                          value={editFormData.firstName}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              firstName: e.target.value,
                            })
                          }
                        />
                        <Input
                          placeholder="Last Name"
                          value={editFormData.lastName}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              lastName: e.target.value,
                            })
                          }
                        />
                      </div>
                      <Badge variant="secondary" className="mt-1">
                        {selectedEmployee.employeeId}
                      </Badge>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold">{selectedEmployee.name}</h3>
                      <Badge variant="secondary" className="mt-1">
                        {selectedEmployee.employeeId}
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              {/* Details Grid */}
              {isEditMode ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="edit-nameWithInitials">Name with Initials</Label>
                    <Input
                      id="edit-nameWithInitials"
                      placeholder="e.g., J.D. Smith"
                      value={editFormData.nameWithInitials}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, nameWithInitials: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editFormData.email}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, email: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, phone: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-position">Position</Label>
                    <Input
                      id="edit-position"
                      value={editFormData.position}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, position: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-department">Department</Label>
                    <Input
                      id="edit-department"
                      value={editFormData.department}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, department: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-birthday">Birthday</Label>
                    <Input
                      id="edit-birthday"
                      type="date"
                      value={editFormData.birthday}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, birthday: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-600">Joined Date</Label>
                    <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-gray-50">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <p className="text-sm">
                        {new Date(selectedEmployee.dateOfJoining).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="edit-address">Address</Label>
                    <Input
                      id="edit-address"
                      value={editFormData.address}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, address: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="edit-emergency">Emergency Contact</Label>
                    <Input
                      id="edit-emergency"
                      value={editFormData.emergencyContact}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          emergencyContact: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedEmployee.nameWithInitials && (
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-gray-600">Name with Initials</Label>
                      <p className="font-medium text-lg">{selectedEmployee.nameWithInitials}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-gray-600">Email</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <p>{selectedEmployee.email}</p>
                    </div>
                  </div>

                  {selectedEmployee.phone && (
                    <div className="space-y-2">
                      <Label className="text-gray-600">Phone</Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <p>{selectedEmployee.phone}</p>
                      </div>
                    </div>
                  )}

                  {selectedEmployee.position && (
                    <div className="space-y-2">
                      <Label className="text-gray-600">Position</Label>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-gray-400" />
                        <p>{selectedEmployee.position}</p>
                      </div>
                    </div>
                  )}

                  {selectedEmployee.department && (
                    <div className="space-y-2">
                      <Label className="text-gray-600">Department</Label>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <p>{selectedEmployee.department}</p>
                      </div>
                    </div>
                  )}

                  {selectedEmployee.birthday && (
                    <div className="space-y-2">
                      <Label className="text-gray-600">Birthday</Label>
                      <div className="flex items-center gap-2">
                        <Cake className="h-4 w-4 text-gray-400" />
                        <p>
                          {new Date(selectedEmployee.birthday).toLocaleDateString(
                            'en-US',
                            { year: 'numeric', month: 'long', day: 'numeric' }
                          )}{' '}
                          ({calculateAge(selectedEmployee.birthday)} years old)
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedEmployee.address && (
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-gray-600">Address</Label>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <p>{selectedEmployee.address}</p>
                      </div>
                    </div>
                  )}

                  {selectedEmployee.emergencyContact && (
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-gray-600">Emergency Contact</Label>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                        <p>{selectedEmployee.emergencyContact}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-gray-600">Joined Date</Label>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <p>
                        {new Date(selectedEmployee.dateOfJoining).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {isEditMode ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
                <Button onClick={handleEditClick}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Details
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Birthday Wish Dialog */}
      <Dialog open={showBirthdayDialog} onOpenChange={setShowBirthdayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cake className="h-5 w-5 text-pink-500" />
              Send Birthday Wishes 🎉
            </DialogTitle>
            <DialogDescription>
              {selectedEmployee && (
                <span>Send a birthday message to {selectedEmployee.name}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="birthday-message">Your Message</Label>
              <Textarea
                id="birthday-message"
                placeholder="Write your birthday message..."
                value={birthdayMessage}
                onChange={(e) => setBirthdayMessage(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBirthdayDialog(false);
                setBirthdayMessage('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={sendBirthdayWish}
              disabled={!birthdayMessage.trim()}
              className="bg-pink-600 hover:bg-pink-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Wish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="birthday-emails" className="mt-6">
          <BirthdayEmails />
        </TabsContent>
      </Tabs>
    </div>
  );
}