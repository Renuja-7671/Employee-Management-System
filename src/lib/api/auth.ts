// src/lib/api/auth.ts

export interface LoginResult {
  success: boolean;
  user?: any;
  profile?: any;
  error?: string;
}

export interface CreateAdminResult {
  success: boolean;
  user?: any;
  error?: string;
}

// Login user
export async function loginUser(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Login failed',
      };
    }

    // Store user info in localStorage
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('profile', JSON.stringify(data.profile));
    localStorage.setItem('user_role', data.profile.role);
    localStorage.setItem('user_id', data.user.id);

    return {
      success: true,
      user: data.user,
      profile: data.profile,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Login failed',
    };
  }
}

// Create admin account
export async function createAdminAccount(data: {
  name: string;
  email: string;
  password: string;
}): Promise<CreateAdminResult> {
  try {
    const response = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || 'Failed to create admin account',
      };
    }

    return {
      success: true,
      user: result.user,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create admin account',
    };
  }
}

// Logout user
export async function logoutUser() {
  try {
    // Clear all stored user data
    localStorage.removeItem('user');
    localStorage.removeItem('profile');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_id');
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Get current user from localStorage
export function getCurrentUser() {
  if (typeof window === 'undefined') return null;

  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Get current user profile from localStorage
export function getCurrentProfile() {
  if (typeof window === 'undefined') return null;

  try {
    const profileStr = localStorage.getItem('profile');
    return profileStr ? JSON.parse(profileStr) : null;
  } catch (error) {
    console.error('Error getting current profile:', error);
    return null;
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;

  const user = getCurrentUser();
  return !!user;
}

export function isAdmin(): boolean {
  const profile = getCurrentProfile();
  return profile?.role === 'ADMIN';
}

// Check if user is employee
export function isEmployee(): boolean {
  const profile = getCurrentProfile();
  return profile?.role === 'EMPLOYEE';
}