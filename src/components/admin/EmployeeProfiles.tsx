// src/components/admin/EmployeeProfiles.tsx

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Upload,
  Camera,
  Shield,
  FileText,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { getEmployees, Employee as EmployeeAPI } from '@/lib/api/employees';
import { Textarea } from '@/components/ui/textarea';
import { BirthdayEmails } from './BirthdayEmails';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

interface Employee extends EmployeeAPI {
  name: string;
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
    callingName: '',
    fullName: '',
    nameWithInitials: '',
    email: '',
    phone: '',
    nic: '',
    position: '',
    department: '',
    birthday: '',
    address: '',
    emergencyContact: '',
    dateOfJoining: '',
    isProbation: true,
    confirmedAt: '',
  });
  const [saving, setSaving] = useState(false);
  const [editProfilePicture, setEditProfilePicture] = useState<File | null>(null);
  const [editProfilePicturePreview, setEditProfilePicturePreview] = useState<string>('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();
      // Transform employees data to include full name and map phone field
      const transformedEmployees = data.map(emp => ({
        ...emp,
        name: emp.fullName || emp.callingName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'N/A',
        phone: emp.phoneNumber ?? undefined,
        birthday: emp.birthday ? new Date(emp.birthday).toISOString().split('T')[0] : undefined,
        address: emp.address ?? undefined,
        emergencyContact: emp.emergencyContact ?? undefined
      }));
      setEmployees(transformedEmployees);

      // Build profile pictures object from employee data (no API calls needed)
      const pictures: Record<string, string> = {};
      transformedEmployees.forEach((emp) => {
        if (emp.profilePicture) {
          pictures[emp.id] = emp.profilePicture;
        }
      });
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

  // Memoize the birthday calculation function
  const getUpcomingBirthdays = useCallback(() => {
    const today = new Date();
    const upcomingDays = 30;

    return employees
      .filter((emp) => emp.birthday && emp.isActive !== false) // Only include active employees
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
  }, [employees]);

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
        callingName: selectedEmployee.callingName || '',
        fullName: selectedEmployee.fullName || '',
        nameWithInitials: selectedEmployee.nameWithInitials || '',
        email: selectedEmployee.email,
        phone: selectedEmployee.phone || '',
        nic: selectedEmployee.nic || '',
        position: selectedEmployee.position,
        department: selectedEmployee.department,
        birthday: selectedEmployee.birthday || '',
        address: selectedEmployee.address || '',
        emergencyContact: selectedEmployee.emergencyContact || '',
        dateOfJoining: selectedEmployee.dateOfJoining ? new Date(selectedEmployee.dateOfJoining).toISOString().split('T')[0] : '',
        isProbation: (selectedEmployee as any).isProbation ?? true,
        confirmedAt: (selectedEmployee as any).confirmedAt ? new Date((selectedEmployee as any).confirmedAt).toISOString().split('T')[0] : '',
      });
      setIsEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditProfilePicture(null);
    setEditProfilePicturePreview('');
    setEditFormData({
      callingName: '',
      fullName: '',
      nameWithInitials: '',
      email: '',
      phone: '',
      nic: '',
      position: '',
      department: '',
      birthday: '',
      address: '',
      emergencyContact: '',
      dateOfJoining: '',
      isProbation: true,
      confirmedAt: '',
    });
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
      setEditProfilePicture(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedEmployee) return;

    setSaving(true);
    try {
      let profilePicturePath = selectedEmployee.profilePicture;

      // Upload profile picture if one was selected
      if (editProfilePicture) {
        const formData = new FormData();
        formData.append('file', editProfilePicture);
        formData.append('employeeId', selectedEmployee.employeeId);

        const uploadResponse = await fetch('/api/upload/profile-picture', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Failed to upload profile picture');
        }

        const uploadData = await uploadResponse.json();
        profilePicturePath = uploadData.path;
      }

      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callingName: editFormData.callingName,
          fullName: editFormData.fullName,
          nameWithInitials: editFormData.nameWithInitials || null,
          email: editFormData.email,
          phoneNumber: editFormData.phone || null,
          nic: editFormData.nic || null,
          position: editFormData.position,
          department: editFormData.department,
          birthday: editFormData.birthday || null,
          address: editFormData.address || null,
          emergencyContact: editFormData.emergencyContact || null,
          dateOfJoining: editFormData.dateOfJoining || null,
          profilePicture: profilePicturePath,
          isProbation: editFormData.isProbation,
          confirmedAt: editFormData.confirmedAt || null,
        }),
      });

      if (response.ok) {
        toast.success('Employee details updated successfully');
        setIsEditMode(false);
        setEditProfilePicture(null);
        setEditProfilePicturePreview('');
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

  const exportActiveEmployeesPDF = () => {
    const activeEmployees = employees.filter(emp => emp.isActive);

    if (activeEmployees.length === 0) {
      toast.error('No active employees to export');
      return;
    }

    // Use landscape orientation for wider table
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    const pageWidth = doc.internal.pageSize.width;

    // Add logo with better proportions (taller)
    const logoImg = new Image();
    logoImg.src = '/images/logo-dark.png';

    try {
      doc.addImage(logoImg, 'PNG', pageWidth / 2 - 25, 8, 50, 25);
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }

    // Add report title
    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246);
    doc.text('Active Employees Report', pageWidth / 2, 40, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, 48, { align: 'center' });
    doc.text(`Total Active Employees: ${activeEmployees.length}`, pageWidth / 2, 54, { align: 'center' });

    // Prepare table data with all employee attributes
    const tableData = activeEmployees.map(emp => [
      emp.employeeId,
      emp.name,
      emp.nameWithInitials || 'N/A',
      emp.nic || 'N/A',
      emp.email,
      emp.phone || 'N/A',
      emp.position,
      emp.department,
      (emp as any).isProbation ? 'Probation' : 'Confirmed',
      emp.address || 'N/A',
      emp.emergencyContact || 'N/A',
      emp.birthday ? new Date(emp.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
      new Date(emp.dateOfJoining).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    ]);

    // Add employee details table - optimized for landscape A4 (297mm width)
    autoTable(doc, {
      startY: 60,
      head: [['EMP ID', 'Full Name', 'Name w/ Initials', 'NIC', 'Email', 'Phone', 'Position', 'Department', 'Status', 'Address', 'Emergency Contact', 'Birthday', 'Joined']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
      },
      styles: {
        fontSize: 6.5,
        cellPadding: 1.5,
        overflow: 'linebreak',
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 16, halign: 'center' },   // EMP ID
        1: { cellWidth: 26 },                      // Full Name
        2: { cellWidth: 20 },                      // Name with Initials
        3: { cellWidth: 18, halign: 'center' },   // NIC
        4: { cellWidth: 32 },                      // Email
        5: { cellWidth: 18, halign: 'center' },   // Phone
        6: { cellWidth: 22 },                      // Position
        7: { cellWidth: 18 },                      // Department
        8: { cellWidth: 16, halign: 'center' },   // Status (Probation/Confirmed)
        9: { cellWidth: 38 },                      // Address
        10: { cellWidth: 20 },                     // Emergency Contact
        11: { cellWidth: 18, halign: 'center' },  // Birthday
        12: { cellWidth: 18, halign: 'center' },  // Joined
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      margin: { top: 60, left: 5, right: 5 },
      didDrawPage: () => {
        // Add page numbers on each page as table is drawn
        const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
        const totalPages = doc.getNumberOfPages();
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${currentPage} of ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      },
    });

    // Add footer with additional information
    const finalY = (doc as any).lastAutoTable.finalY || 65;
    const pageHeight = doc.internal.pageSize.height;
    
    // Check if we need a new page (if less than 40 units from bottom)
    let currentY = finalY + 10;
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 20; // Start from top of new page
    }
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Notes:', 14, currentY);
    doc.setFontSize(8);
    doc.text('• This report contains comprehensive details of all active employees including personal, contact, and employment information', 14, currentY + 6);
    doc.text('• Includes full name, name with initials, NIC, email, phone, position, department, residential address, emergency contact, birthday, and joining date', 14, currentY + 11);
    doc.text('• This is a confidential document - please handle with care and follow data protection guidelines', 14, currentY + 16);

    // Update page numbers on all pages after table is complete
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(9);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Save PDF
    doc.save(`Active_Employees_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Active employees report generated successfully');
  };

  // Memoize filtered employees to avoid recalculating on every render
  const filteredEmployees = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(query) ||
        emp.employeeId.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query)
    );
  }, [employees, searchQuery]);

  // Memoize upcoming birthdays calculation
  const upcomingBirthdays = useMemo(() => getUpcomingBirthdays(), [employees]);

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
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-[300px]"
                />
              </div>
              <Button
                onClick={exportActiveEmployeesPDF}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Active Employees
              </Button>
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
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    {editProfilePicturePreview ? (
                      <AvatarImage src={editProfilePicturePreview} />
                    ) : profilePictures[selectedEmployee.id] ? (
                      <AvatarImage src={profilePictures[selectedEmployee.id]} />
                    ) : null}
                    <AvatarFallback className="bg-teal-100 text-teal-700 text-xl">
                      {getInitials(selectedEmployee.name)}
                    </AvatarFallback>
                  </Avatar>
                  {isEditMode && (
                    <label
                      htmlFor="profile-picture-upload"
                      className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded-full cursor-pointer shadow-lg transition-colors"
                      title="Upload profile picture"
                    >
                      <Camera className="h-4 w-4" />
                      <input
                        id="profile-picture-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <div className="flex-1">
                  {isEditMode ? (
                    <div className="space-y-2">
                      <Input
                        placeholder="Calling Name (e.g., Malinda)"
                        value={editFormData.callingName}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            callingName: e.target.value,
                          })
                        }
                      />
                      <Input
                        placeholder="Full Name (e.g., Don Malinda Perera)"
                        value={editFormData.fullName}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            fullName: e.target.value,
                          })
                        }
                      />
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
                    <Label htmlFor="edit-nic">NIC (National Identity Card)</Label>
                    <Input
                      id="edit-nic"
                      placeholder="e.g., 199512345678 or 951234567V"
                      value={editFormData.nic}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, nic: e.target.value })
                      }
                      maxLength={12}
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
                    <Select
                      value={editFormData.department}
                      onValueChange={(value: string) =>
                        setEditFormData({ ...editFormData, department: value })
                      }
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
                    <Label htmlFor="edit-dateOfJoining">Joined Date</Label>
                    <Input
                      id="edit-dateOfJoining"
                      type="date"
                      value={editFormData.dateOfJoining}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, dateOfJoining: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-isProbation">Probation Status</Label>
                    <Select
                      value={editFormData.isProbation ? 'true' : 'false'}
                      onValueChange={(value: string) =>
                        setEditFormData({
                          ...editFormData,
                          isProbation: value === 'true',
                        })
                      }
                    >
                      <SelectTrigger id="edit-isProbation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">On Probation</SelectItem>
                        <SelectItem value="false">Confirmed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-confirmedAt">Confirmation Date</Label>
                    <Input
                      id="edit-confirmedAt"
                      type="date"
                      value={editFormData.confirmedAt}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, confirmedAt: e.target.value })
                      }
                      placeholder="Leave empty for auto-update"
                    />
                    <p className="text-xs text-muted-foreground">
                      This date is automatically set when probation status changes to confirmed. 
                      You can manually override it here if needed.
                    </p>
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

                  {selectedEmployee.nic && (
                    <div className="space-y-2">
                      <Label className="text-gray-600">NIC (National Identity Card)</Label>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-gray-400" />
                        <p>{selectedEmployee.nic}</p>
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

                  <div className="space-y-2">
                    <Label className="text-gray-600">Employment Status</Label>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-400" />
                      <Badge variant={(selectedEmployee as any).isProbation ? 'secondary' : 'default'}>
                        {(selectedEmployee as any).isProbation ? 'On Probation' : 'Confirmed'}
                      </Badge>
                    </div>
                  </div>

                  {(selectedEmployee as any).confirmedAt && !(selectedEmployee as any).isProbation && (
                    <div className="space-y-2">
                      <Label className="text-gray-600">Confirmation Date</Label>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <p>
                          {(selectedEmployee as any).confirmedAt 
                            ? new Date((selectedEmployee as any).confirmedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : 'Not confirmed yet'}
                        </p>
                      </div>
                    </div>
                  )}
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