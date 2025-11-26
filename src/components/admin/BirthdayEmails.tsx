// src/components/admin/BirthdayEmails.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Calendar, Mail, Send, Users, Loader2, Gift, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  birthday: string | null;
  department: string;
}

export function BirthdayEmails() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [birthdayEmployees, setBirthdayEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sendResults, setSendResults] = useState<any>(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);

  useEffect(() => {
    fetchEmployeesWithBirthdays();
  }, []);

  const fetchEmployeesWithBirthdays = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/employees');
      const data = await response.json();

      if (response.ok) {
        const employeesData = data.employees || [];
        setEmployees(employeesData);

        // Filter employees with birthdays today
        const today = new Date();
        const todayMonth = today.getMonth() + 1;
        const todayDay = today.getDate();

        const todayBirthdays = employeesData.filter((emp: Employee) => {
          if (!emp.birthday) return false;
          const birthday = new Date(emp.birthday);
          return (
            birthday.getMonth() + 1 === todayMonth &&
            birthday.getDate() === todayDay
          );
        });

        setBirthdayEmployees(todayBirthdays);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const isToday = (dateString: string | null) => {
    if (!dateString) return false;
    const birthday = new Date(dateString);
    const today = new Date();
    return (
      birthday.getMonth() === today.getMonth() &&
      birthday.getDate() === today.getDate()
    );
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const selectAllBirthdayEmployees = () => {
    const birthdayIds = birthdayEmployees.map((emp) => emp.id);
    setSelectedEmployees(birthdayIds);
  };

  const handleSendEmails = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    setShowConfirmDialog(false);
    setSending(true);

    try {
      const response = await fetch('/api/emails/birthday/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeIds: selectedEmployees,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSendResults(data);
        setShowResultsDialog(true);
        setSelectedEmployees([]);

        if (data.successCount > 0) {
          toast.success(`Birthday emails sent to ${data.successCount} employee(s)!`);
        }
        if (data.failureCount > 0) {
          toast.warning(`${data.failureCount} email(s) failed to send`);
        }
      } else {
        toast.error(data.error || 'Failed to send birthday emails');
      }
    } catch (error) {
      console.error('Error sending birthday emails:', error);
      toast.error('Failed to send birthday emails');
    } finally {
      setSending(false);
    }
  };

  const employeesWithBirthdays = employees.filter((emp) => emp.birthday);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Birthdays Today</p>
                <p className="text-3xl font-bold text-blue-600">
                  {birthdayEmployees.length}
                </p>
              </div>
              <Gift className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Selected</p>
                <p className="text-3xl font-bold text-purple-600">
                  {selectedEmployees.length}
                </p>
              </div>
              <Users className="h-10 w-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total with Birthdays</p>
                <p className="text-3xl font-bold text-green-600">
                  {employeesWithBirthdays.length}
                </p>
              </div>
              <Calendar className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Birthday Email Management
              </CardTitle>
              <CardDescription>
                Send birthday wishes to employees manually or view upcoming birthdays
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {birthdayEmployees.length > 0 && (
                <Button
                  variant="outline"
                  onClick={selectAllBirthdayEmployees}
                  disabled={sending}
                >
                  Select Today's Birthdays
                </Button>
              )}
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={selectedEmployees.length === 0 || sending}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Emails ({selectedEmployees.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : birthdayEmployees.length > 0 ? (
            <>
              {/* Today's Birthdays Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-blue-600" />
                  Today's Birthdays ({birthdayEmployees.length})
                </h3>
                <div className="space-y-2">
                  {birthdayEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedEmployees.includes(employee.id)}
                          onCheckedChange={() => toggleEmployee(employee.id)}
                        />
                        <div>
                          <p className="font-medium">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <p className="text-sm text-gray-600">{employee.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-blue-600">
                          {employee.department}
                        </Badge>
                        <Badge variant="secondary">
                          <Gift className="h-3 w-3 mr-1" />
                          Today
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="my-6" />
            </>
          ) : null}

          {/* All Employees with Birthdays */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              All Employees with Birthdays ({employeesWithBirthdays.length})
            </h3>
            {employeesWithBirthdays.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No employees have birthdays set</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {employeesWithBirthdays.map((employee) => (
                  <div
                    key={employee.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      isToday(employee.birthday)
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedEmployees.includes(employee.id)}
                        onCheckedChange={() => toggleEmployee(employee.id)}
                      />
                      <div>
                        <p className="font-medium">
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className="text-sm text-gray-600">{employee.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {employee.department}
                      </Badge>
                      <Badge variant={isToday(employee.birthday) ? 'default' : 'secondary'}>
                        {formatDate(employee.birthday)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Send Birthday Emails</DialogTitle>
            <DialogDescription>
              Are you sure you want to send birthday emails to {selectedEmployees.length} employee(s)?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Birthday emails will be sent to the following employees:
            </p>
            <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {employees
                .filter((emp) => selectedEmployees.includes(emp.id))
                .map((emp) => (
                  <li key={emp.id} className="text-sm">
                    • {emp.firstName} {emp.lastName} ({emp.email})
                  </li>
                ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmails} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Emails
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Send Results</DialogTitle>
            <DialogDescription>
              Summary of birthday email sending operation
            </DialogDescription>
          </DialogHeader>
          {sendResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Successful</p>
                        <p className="text-2xl font-bold text-green-600">
                          {sendResults.successCount}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm text-gray-600">Failed</p>
                        <p className="text-2xl font-bold text-red-600">
                          {sendResults.failureCount}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {sendResults.sent && sendResults.sent.length > 0 && (
                <div>
                  <h4 className="font-semibold text-green-600 mb-2">Successfully Sent:</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {sendResults.sent.map((result: any) => (
                      <div key={result.employeeId} className="text-sm p-2 bg-green-50 rounded">
                        ✓ {result.name} - {result.email}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sendResults.failed && sendResults.failed.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">Failed:</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {sendResults.failed.map((result: any) => (
                      <div key={result.employeeId} className="text-sm p-2 bg-red-50 rounded">
                        ✗ {result.name} - {result.email}
                        <p className="text-xs text-gray-600 mt-1">{result.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowResultsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
