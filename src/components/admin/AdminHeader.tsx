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
import { LogOut, Bell, Home, Menu, X } from 'lucide-react';
import { NotificationPanel } from '@/components/shared/NotificationPanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/lib/hooks/use-auth';
import { getProfilePicture } from '@/lib/api/profile';

export function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    if (pathname.includes('/duty-reassignment')) return 'duty-reassignment';
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
            <div className="flex items-center gap-2 sm:gap-3">
              <Image
                src="/images/logo-dark.png"
                alt="Unique Industrial Solutions"
                width={64}
                height={64}
                className="h-12 sm:h-16 w-auto"
                priority
              />
              <div className="hidden sm:block">
                <p className="text-lg font-bold text-gray-700">Admin Portal</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-4">
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

              <ThemeToggle />

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

            {/* Mobile Menu Button & Icons */}
            <div className="flex lg:hidden items-center gap-2">
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

              <Button
                variant="outline"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden pb-4 space-y-2">
              <div className="flex items-center gap-3 pb-3 border-b">
                <Avatar className="h-10 w-10">
                  {profilePictureUrl && (
                    <AvatarImage src={profilePictureUrl} alt={profile.name} />
                  )}
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-gray-700 font-medium">{profile.name}</p>
                  <p className="text-xs text-gray-600">{profile.email}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <ThemeToggle />
                <Button variant="outline" className="flex-1" onClick={() => router.push('/')}>
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white py-4 sm:py-6 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={getActiveTab()} className="w-full">
            <TabsList className="grid w-full grid-cols-7 h-10 sm:h-12 text-xs sm:text-sm min-w-[640px] sm:min-w-0">
              <TabsTrigger value="overview" asChild className="px-2 sm:px-4">
                <Link href="/admin/dashboard">
                  <span className="hidden sm:inline">Overview</span>
                  <span className="sm:hidden">Home</span>
                </Link>
              </TabsTrigger>
              <TabsTrigger value="employees" asChild className="px-2 sm:px-4">
                <Link href="/admin/employees">
                  <span className="hidden sm:inline">Employees</span>
                  <span className="sm:hidden">Emps</span>
                </Link>
              </TabsTrigger>
              <TabsTrigger value="profiles" asChild className="px-2 sm:px-4">
                <Link href="/admin/profiles">
                  <span className="hidden md:inline">Profiles</span>
                  <span className="md:hidden">Prof</span>
                </Link>
              </TabsTrigger>
              <TabsTrigger value="leaves" asChild className="px-2 sm:px-4">
                <Link href="/admin/leaves">
                  <span className="hidden md:inline">Leave Requests</span>
                  <span className="md:hidden">Leaves</span>
                </Link>
              </TabsTrigger>
              <TabsTrigger value="duty-reassignment" asChild className="px-2 sm:px-4">
                <Link href="/admin/duty-reassignment">
                  <span className="hidden lg:inline">Duty Reassignment</span>
                  <span className="lg:hidden">Duty</span>
                </Link>
              </TabsTrigger>
              <TabsTrigger value="attendance" asChild className="px-2 sm:px-4">
                <Link href="/admin/attendance">
                  <span className="hidden md:inline">Attendance</span>
                  <span className="md:hidden">Attend</span>
                </Link>
              </TabsTrigger>
              <TabsTrigger value="admins" asChild className="px-2 sm:px-4">
                <Link href="/admin/admins">Admins</Link>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </>
  );
}