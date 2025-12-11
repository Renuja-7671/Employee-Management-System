// src/lib/api/attendance.ts

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string | Date | null;
  checkOut?: string | Date | null;
  status: string;
  workHours?: number | null;
  isWeekend: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceResponse {
  attendance: Attendance[];
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export async function getAttendance(
  startDate?: string,
  endDate?: string,
  page?: number,
  pageSize?: number
): Promise<AttendanceResponse> {
  try {
    let url = '/api/attendance';
    const params = new URLSearchParams();

    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (page) params.append('page', page.toString());
    if (pageSize) params.append('pageSize', pageSize.toString());

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      next: { revalidate: 30 }, // Cache for 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to fetch attendance:', response.status, errorData);
      return { attendance: [] };
    }

    const data = await response.json();
    return {
      attendance: data.attendance || [],
      pagination: data.pagination,
    };
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return { attendance: [] };
  }
}

export async function getAttendanceById(id: string): Promise<Attendance | null> {
  try {
    const response = await fetch(`/api/attendance/${id}`);

    if (!response.ok) {
      throw new Error('Failed to fetch attendance');
    }

    const data = await response.json();
    return data.attendance;
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return null;
  }
}

export async function checkIn(): Promise<{
  success: boolean;
  attendance?: Attendance;
  error?: string;
}> {
  try {
    const response = await fetch('/api/attendance/check-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to check in',
      };
    }

    return {
      success: true,
      attendance: data.attendance,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to check in',
    };
  }
}

export async function checkOut(): Promise<{
  success: boolean;
  attendance?: Attendance;
  error?: string;
}> {
  try {
    const response = await fetch('/api/attendance/check-out', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to check out',
      };
    }

    return {
      success: true,
      attendance: data.attendance,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to check out',
    };
  }
}

export async function updateAttendance(
  id: string,
  attendanceData: Partial<Attendance>
): Promise<{ success: boolean; attendance?: Attendance; error?: string }> {
  try {
    const response = await fetch(`/api/attendance/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(attendanceData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to update attendance',
      };
    }

    return {
      success: true,
      attendance: data.attendance,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update attendance',
    };
  }
}

export async function getTodayAttendance(): Promise<Attendance | null> {
  try {
    const response = await fetch('/api/attendance/today');

    if (!response.ok) {
      throw new Error('Failed to fetch today\'s attendance');
    }

    const data = await response.json();
    return data.attendance;
  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    return null;
  }
}

export async function getAttendanceSummary(
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<{
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
  holiday: number;
} | null> {
  try {
    const response = await fetch(
      `/api/attendance/summary?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch attendance summary');
    }

    const data = await response.json();
    return data.summary;
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    return null;
  }
}
