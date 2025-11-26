// src/components/admin/AdminHeader.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Bell, Home } from 'lucide-react';
import { NotificationPanel } from '@/components/shared/NotificationPanel';
import { useAuth } from '@/lib/hooks/use-auth';
import { getProfilePicture } from '@/lib/api/profile';

export function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    null
  );

  useEffect(() => {
    const fetchProfilePicture = async () => {
      if (!user) return;

      try {
        const url = await getProfilePicture(user.id);
        setProfilePictureUrl(url);
      } catch (error) {
        console.error('Error fetching profile picture:', error);
      }
    };

    if (user) {
      fetchProfilePicture();
    }
  }, [user]);

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getActiveTab = () => {
    if (pathname.includes('/admins')) return 'admins';
    if (pathname.includes('/employees')) return 'employees';
    if (pathname.includes('/profiles')) return 'profiles';
    if (pathname.includes('/leaves')) return 'leaves';
    if (pathname.includes('/attendance')) return 'attendance';
    return 'overview';
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!profile) return null;

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Image
                src="/images/logo.jpg"
                alt="Unique Industrial Solutions"
                width={64}
                height={64}
                className="h-16 w-auto"
                priority
              />
              <div>
                <p className="text-lg font-bold text-gray-700">Admin Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-gray-700 font-medium">{profile.name}</p>
                  <p className="text-xs text-gray-600">{profile.email}</p>
                </div>
                <Avatar className="h-10 w-10">
                  {profilePictureUrl && (
                    <AvatarImage src={profilePictureUrl} alt={profile.name} />
                  )}
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="relative">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
                {showNotifications && user && (
                  <NotificationPanel
                    userId={user.id}
                    onClose={() => setShowNotifications(false)}
                    onUnreadCountChange={setUnreadCount}
                  />
                )}
              </div>

              <Button variant="outline" onClick={() => router.push('/')}>
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>

              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={getActiveTab()} className="w-full">
            <TabsList className="grid w-full grid-cols-6 h-12">
              <TabsTrigger value="overview" asChild>
                <Link href="/admin/dashboard">Overview</Link>
              </TabsTrigger>
              <TabsTrigger value="employees" asChild>
                <Link href="/admin/employees">Employees</Link>
              </TabsTrigger>
              <TabsTrigger value="profiles" asChild>
                <Link href="/admin/profiles">Profiles</Link>
              </TabsTrigger>
              <TabsTrigger value="leaves" asChild>
                <Link href="/admin/leaves">Leave Requests</Link>
              </TabsTrigger>
              <TabsTrigger value="attendance" asChild>
                <Link href="/admin/attendance">Attendance</Link>
              </TabsTrigger>
              <TabsTrigger value="admins" asChild>
                <Link href="/admin/admins">Admins</Link>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </>
  );
}