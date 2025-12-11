// src/lib/api/leaves.ts

export interface Leave {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  adminResponse?: string | null;
  coverEmployeeId?: string | null;
  medicalCertPath?: string | null;
  isCancelled: boolean;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getLeaves(): Promise<Leave[]> {
  try {
    const response = await fetch('/api/leaves', {
      next: { revalidate: 30 }, // Cache for 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to fetch leaves:', response.status, errorData);
      return [];
    }

    const data = await response.json();
    return data.leaves || [];
  } catch (error) {
    console.error('Error fetching leaves:', error);
    return [];
  }
}

export async function getLeave(id: string): Promise<Leave | null> {
  try {
    const response = await fetch(`/api/leaves/${id}`);

    if (!response.ok) {
      throw new Error('Failed to fetch leave');
    }

    const data = await response.json();
    return data.leave;
  } catch (error) {
    console.error('Error fetching leave:', error);
    return null;
  }
}

export async function createLeave(
  leaveData: Partial<Leave>
): Promise<{ success: boolean; leave?: Leave; error?: string }> {
  try {
    const response = await fetch('/api/leaves', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(leaveData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to create leave request',
      };
    }

    return {
      success: true,
      leave: data.leave,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create leave request',
    };
  }
}

export async function updateLeave(
  id: string,
  leaveData: Partial<Leave>
): Promise<{ success: boolean; leave?: Leave; error?: string }> {
  try {
    const response = await fetch(`/api/leaves/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(leaveData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to update leave request',
      };
    }

    return {
      success: true,
      leave: data.leave,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update leave request',
    };
  }
}

export async function approveLeave(
  id: string,
  adminId: string,
  adminResponse?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/leaves/${id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ adminId, adminResponse }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to approve leave request',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to approve leave request',
    };
  }
}

export async function declineLeave(
  id: string,
  adminId: string,
  adminResponse: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/leaves/${id}/decline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ adminId, adminResponse }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to decline leave request',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to decline leave request',
    };
  }
}

export async function cancelLeave(
  id: string,
  cancellationReason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/leaves/${id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancellationReason }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to cancel leave request',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to cancel leave request',
    };
  }
}
