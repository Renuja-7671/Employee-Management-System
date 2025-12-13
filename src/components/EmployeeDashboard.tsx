// src/components/EmployeeDashboard.tsx
'use client';

import { useState, useEffect } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import { Button } from "./ui/button";
import { LogOut, Bell, Home, Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { EmployeeOverview } from "./employee/EmployeeOverview";
import { ApplyLeave } from "./employee/ApplyLeave";
import { MyLeaves } from "./employee/MyLeaves";
import { MyAttendance } from "./employee/MyAttendance";
import { MyProfile } from "./employee/MyProfile";
import { CoverRequests } from "./employee/CoverRequests";
import { NotificationPanel } from "./NotificationPanel";
import { Badge } from "./ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./ui/avatar";
import { getProfilePicture } from "@/lib/api/profile";
import Image from "next/image";

interface EmployeeDashboardProps {
  user: any;
  profile: any;
  onLogout: () => void;
}

export function EmployeeDashboard({
  user,
  profile,
  onLogout,
}: EmployeeDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingCoverCount, setPendingCoverCount] = useState(0);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch profile picture on mount or when user changes
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const fetchProfilePicture = async () => {
      try {
        const url = await getProfilePicture(user.id);
        if (isMounted && url) {
          setProfilePictureUrl(url);
        }
      } catch (error) {
        console.error("Error fetching profile picture:", error);
      }
    };

    fetchProfilePicture();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Fetch pending cover count on mount or when user changes
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const fetchPendingCoverCount = async () => {
      try {
        const response = await fetch(`/api/cover-requests/pending?userId=${user.id}`);

        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();
          setPendingCoverCount(data.count || 0);
        }
      } catch (error) {
        console.error("Error fetching pending cover count:", error);
      }
    };

    fetchPendingCoverCount();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Fetch initial notification count on mount
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(`/api/notifications?userId=${user.id}`);

        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();
          const unread = data.notifications?.filter((n: any) => !n.isRead).length || 0;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error("Error fetching notification count:", error);
      }
    };

    fetchUnreadCount();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Refetch function for cover requests (used in callback)
  const refetchPendingCoverCount = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/cover-requests/pending?userId=${user.id}`);

      if (response.ok) {
        const data = await response.json();
        setPendingCoverCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching pending cover count:", error);
    }
  };


  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative h-12 w-36 sm:h-16 sm:w-48">
                <Image
                  src="/images/logo-dark.png"
                  alt="Unique Industrial Solutions"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="hidden sm:block">
                <p className="text-base sm:text-lg font-bold text-gray-700">
                  Employee Portal
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-3 xl:gap-4">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium">{profile?.name || `${profile?.firstName} ${profile?.lastName}`}</p>
                  <p className="text-xs text-gray-600">
                    {profile?.email}
                  </p>
                </div>
                <Avatar className="h-10 w-10">
                  {profilePictureUrl && (
                    <AvatarImage
                      src={profilePictureUrl}
                      alt={profile?.name || 'User'}
                    />
                  )}
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {getInitials(profile?.name || `${profile?.firstName} ${profile?.lastName}`)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <ThemeToggle />

              <div className="relative">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setShowNotifications(!showNotifications)
                  }
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
                {showNotifications && (
                  <NotificationPanel
                    userId={user?.id}
                    onClose={() => setShowNotifications(false)}
                    onUnreadCountChange={setUnreadCount}
                  />
                )}
              </div>
              <Button variant="outline" onClick={() => router.push('/')}>
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
              <Button variant="destructive" onClick={onLogout}>
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
                {showNotifications && (
                  <NotificationPanel
                    userId={user?.id}
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
            <div className="lg:hidden pb-4 space-y-2 border-t pt-3">
              <div className="flex items-center gap-3 pb-3 border-b">
                <Avatar className="h-10 w-10">
                  {profilePictureUrl && (
                    <AvatarImage
                      src={profilePictureUrl}
                      alt={profile?.name || 'User'}
                    />
                  )}
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {getInitials(profile?.name || `${profile?.firstName} ${profile?.lastName}`)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile?.name || `${profile?.firstName} ${profile?.lastName}`}</p>
                  <p className="text-xs text-gray-600 truncate">{profile?.email}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <ThemeToggle />
                <Button variant="outline" className="flex-1" onClick={() => { router.push('/'); setMobileMenuOpen(false); }}>
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
                <Button variant="destructive" className="flex-1" onClick={onLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-2 mb-6 sm:mb-8">
            <TabsList className="grid w-full grid-cols-6 h-10 sm:h-11 text-xs sm:text-sm min-w-[640px] sm:min-w-0">
              <TabsTrigger value="overview" className="px-2 sm:px-4">
                <span className="hidden md:inline">Overview</span>
                <span className="md:hidden">Home</span>
              </TabsTrigger>
              <TabsTrigger value="apply" className="px-2 sm:px-4">
                <span className="hidden sm:inline">Apply Leave</span>
                <span className="sm:hidden">Apply</span>
              </TabsTrigger>
              <TabsTrigger
                value="cover-requests"
                className="relative px-2 sm:px-4"
              >
                <span className="flex items-center gap-1">
                  <span className="hidden lg:inline">Cover Requests</span>
                  <span className="lg:hidden">Cover</span>
                  {pendingCoverCount > 0 && (
                    <Badge className="ml-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]">
                      {pendingCoverCount}
                    </Badge>
                  )}
                </span>
              </TabsTrigger>
              <TabsTrigger value="leaves" className="px-2 sm:px-4">
                <span className="hidden sm:inline">My Leaves</span>
                <span className="sm:hidden">Leaves</span>
              </TabsTrigger>
              <TabsTrigger value="attendance" className="px-2 sm:px-4">
                <span className="hidden md:inline">My Attendance</span>
                <span className="md:hidden">Attend</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="px-2 sm:px-4">
                <span className="hidden sm:inline">My Profile</span>
                <span className="sm:hidden">Profile</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <EmployeeOverview user={user} />
          </TabsContent>

          <TabsContent value="apply">
            <ApplyLeave
              user={user}
              onSuccess={() => setActiveTab("leaves")}
            />
          </TabsContent>

          <TabsContent value="cover-requests">
            <CoverRequests
              user={user}
              onUpdate={() => {
                refetchPendingCoverCount();
                setUnreadCount((prev) => Math.max(0, prev - 1));
              }}
            />
          </TabsContent>

          <TabsContent value="leaves">
            <MyLeaves user={user} />
          </TabsContent>

          <TabsContent value="attendance">
            <MyAttendance user={user} />
          </TabsContent>

          <TabsContent value="profile">
            <MyProfile user={user} profile={profile} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
