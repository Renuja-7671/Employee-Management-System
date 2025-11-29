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
import { LogOut, Bell, Home } from "lucide-react";
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
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-48">
                <Image
                  src="/images/logo-dark.png"
                  alt="Unique Industrial Solutions"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-700">
                  Employee Portal
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="apply">Apply Leave</TabsTrigger>
            <TabsTrigger
              value="cover-requests"
              className="relative"
            >
              Cover Requests
              {pendingCoverCount > 0 && (
                <Badge className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {pendingCoverCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="leaves">My Leaves</TabsTrigger>
            <TabsTrigger value="attendance">
              My Attendance
            </TabsTrigger>
            <TabsTrigger value="profile">
              My Profile
            </TabsTrigger>
          </TabsList>

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
