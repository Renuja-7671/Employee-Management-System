'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, getCurrentProfile, logoutUser as logoutUserApi } from '@/lib/api/auth';

interface User {
  id: string;
  email: string;
  role: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  isActive: boolean;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeId: string;
  department: string;
  position: string;
  phoneNumber?: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage on mount
    const loadUser = () => {
      const currentUser = getCurrentUser();
      const currentProfile = getCurrentProfile();

      setUser(currentUser);
      setProfile(currentProfile);
      setLoading(false);
    };

    loadUser();

    // Listen for storage changes (for multi-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'profile') {
        loadUser();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const logout = async () => {
    await logoutUserApi();
    setUser(null);
    setProfile(null);
  };

  const refreshAuth = () => {
    const currentUser = getCurrentUser();
    const currentProfile = getCurrentProfile();
    setUser(currentUser);
    setProfile(currentProfile);
  };

  return {
    user,
    profile,
    loading,
    logout,
    refreshAuth,
    isAuthenticated: !!user,
  };
}
