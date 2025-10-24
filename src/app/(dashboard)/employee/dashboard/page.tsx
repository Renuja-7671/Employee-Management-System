// src/app/(dashboard)/employee/dashboard/page.tsx

'use client';

import { EmployeeDashboard } from '@/components/EmployeeDashboard';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const { profile, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <EmployeeDashboard
      user={{ id: profile.id, email: profile.email }}
      profile={profile}
      onLogout={handleLogout}
    />
  );
}
