// src/app/(dashboard)/admin/layout.tsx

'use client';

import { AdminHeader } from '@/components/admin/AdminHeader';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && profile?.role !== 'ADMIN') {
      router.push('/employee/dashboard');
    }
  }, [profile, loading, router]);

  if (loading) {
    return null;
  }

  if (profile?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}