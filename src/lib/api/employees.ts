// src/lib/api/employees.ts

export interface Employee {
  id: string;
  email: string;
  role: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  nameWithInitials?: string | null;
  nic?: string | null;
  department: string;
  position: string;
  phoneNumber?: string | null;
  dateOfJoining: string;
  isActive: boolean;
  name?: string; // For compatibility with backend
  phone?: string;
  address?: string;
  birthday?: string;
  emergencyContact?: string;
  profilePicture?: string;
  createdAt?: string;
}

export interface CreateEmployeeData {
  firstName: string;
  lastName: string;
  nameWithInitials?: string | null;
  nic?: string | null;
  email: string;
  password: string;
  employeeId: string;
  department: string;
  position: string;
  phoneNumber?: string | null;
  birthday?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  profilePicture?: string | null;
}

export async function getEmployees(): Promise<Employee[]> {
  try {
    const response = await fetch('/api/employees', {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to fetch employees:', response.status, errorData);
      return [];
    }

    const data = await response.json();
    return data.employees || [];
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
}

export async function getEmployee(id: string): Promise<Employee | null> {
  try {
    const response = await fetch(`/api/employees/${id}`);

    if (!response.ok) {
      throw new Error('Failed to fetch employee');
    }

    const data = await response.json();
    return data.employee;
  } catch (error) {
    console.error('Error fetching employee:', error);
    return null;
  }
}

export async function createEmployee(
  employeeData: CreateEmployeeData
): Promise<{ success: boolean; employee?: Employee; error?: string }> {
  try {
    const response = await fetch('/api/employees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(employeeData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to create employee',
      };
    }

    return {
      success: true,
      employee: data.employee,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create employee',
    };
  }
}

export async function updateEmployee(
  id: string,
  employeeData: Partial<Employee>
): Promise<{ success: boolean; employee?: Employee; error?: string }> {
  try {
    const response = await fetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(employeeData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to update employee',
      };
    }

    return {
      success: true,
      employee: data.employee,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update employee',
    };
  }
}

export async function deleteEmployee(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/employees/${id}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to delete employee',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete employee',
    };
  }
}

export async function updateEmployeeProfile(
  employeeId: string,
  profileData: {
    phone?: string;
    address?: string;
    birthday?: string;
    department?: string;
    position?: string;
    emergencyContact?: string;
    nic?: string;
  }
): Promise<{ success: boolean; employee?: Employee; error?: string }> {
  try {
    const response = await fetch(`/api/employees/${employeeId}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to update employee profile',
      };
    }

    return {
      success: true,
      employee: data.employee,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update employee profile',
    };
  }
}

export async function sendBirthdayWish(
  employeeId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/employees/birthday-wish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId,
        message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to send birthday wish',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send birthday wish',
    };
  }
}

export async function getUpcomingBirthdays(): Promise<{
  success: boolean;
  birthdays?: any[];
  error?: string;
}> {
  try {
    const response = await fetch('/api/employees/birthdays');

    if (!response.ok) {
      throw new Error('Failed to fetch birthdays');
    }

    const data = await response.json();

    return {
      success: true,
      birthdays: data.birthdays || [],
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch birthdays',
    };
  }
}