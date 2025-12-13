// src/components/NotificationPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { X, Bell, CheckCheck, Pin, Trash2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  isPinned: boolean;
  createdAt: string;
  relatedId?: string | null;
}

interface NotificationPanelProps {
  userId: string;
  onClose: () => void;
  onUnreadCountChange: (count: number) => void;
}

export function NotificationPanel({
  userId,
  onClose,
  onUnreadCountChange,
}: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications?userId=${userId}`);

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        const unreadCount = data.notifications?.filter((n: Notification) => !n.isRead).length || 0;
        onUnreadCountChange(unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        const unreadCount = notifications.filter((n) => !n.isRead && n.id !== notificationId).length;
        onUnreadCountChange(unreadCount);
        toast.success('Notification marked as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const togglePin = async (notificationId: string) => {
    try {
      const notification = notifications.find(n => n.id === notificationId);

      // Ensure notification is read before pinning
      if (notification && !notification.isRead) {
        toast.error('Please mark as read before pinning');
        return;
      }

      const response = await fetch(`/api/notifications/${notificationId}/pin`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isPinned: data.notification.isPinned } : n
          )
        );
        toast.success(data.notification.isPinned ? 'Notification pinned' : 'Notification unpinned');
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to toggle pin');
    }
  };

  const clearNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/clear`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        toast.success('Notification cleared');

        // Update unread count
        const unreadCount = notifications.filter(
          (n) => !n.isRead && n.id !== notificationId
        ).length;
        onUnreadCountChange(unreadCount);
      }
    } catch (error) {
      console.error('Error clearing notification:', error);
      toast.error('Failed to clear notification');
    }
  };

  const clearAllNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications/clear-all?userId=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotifications([]);
        onUnreadCountChange(0);
        toast.success('All notifications cleared');
      }
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      toast.error('Failed to clear all notifications');
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case 'COVER_REQUEST':
        return <Bell className={iconClass + " text-blue-600"} />;
      case 'COVER_ACCEPTED':
        return <CheckCheck className={iconClass + " text-green-600"} />;
      case 'COVER_DECLINED':
        return <X className={iconClass + " text-red-600"} />;
      case 'LEAVE_APPROVED':
        return <CheckCheck className={iconClass + " text-green-600"} />;
      case 'LEAVE_DECLINED':
        return <X className={iconClass + " text-red-600"} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const pinnedNotifications = notifications.filter(n => n.isPinned);
  const unpinnedNotifications = notifications.filter(n => !n.isPinned);

  const renderNotificationItem = (notification: Notification, showPinIcon: boolean = true) => (
    <div
      key={notification.id}
      className={`p-3 sm:p-4 hover:bg-gray-50 transition-colors ${
        !notification.isRead ? 'bg-blue-50 border-l-4 border-blue-500' : ''
      }`}
    >
      <div className="flex gap-2 sm:gap-3">
        <div className="mt-1 flex-shrink-0">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <p className="text-xs sm:text-sm font-medium text-gray-900">
                {notification.title}
              </p>
              {!notification.isRead && (
                <Badge className="h-2 w-2 p-0 bg-blue-600 flex-shrink-0" />
              )}
              {notification.isPinned && showPinIcon && (
                <Pin className="h-3 w-3 text-amber-600 fill-amber-600 flex-shrink-0" />
              )}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
            {notification.message}
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3">
            <p className="text-[10px] sm:text-xs text-gray-400 flex-shrink-0">
              {formatTime(notification.createdAt)}
            </p>
            <div className="flex gap-1 flex-wrap">
              {!notification.isRead ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markAsRead(notification.id)}
                  className="h-6 sm:h-7 text-[10px] sm:text-xs px-2"
                >
                  <CheckCheck className="h-3 w-3 sm:mr-1" />
                  <span className="hidden xs:inline">Mark as read</span>
                  <span className="xs:hidden">Read</span>
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePin(notification.id)}
                    className="h-6 sm:h-7 text-[10px] sm:text-xs px-2"
                  >
                    <Pin className={`h-3 w-3 ${notification.isPinned ? 'fill-amber-600 text-amber-600' : ''}`} />
                    <span className="hidden sm:inline ml-1">{notification.isPinned ? 'Unpin' : 'Pin'}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => clearNotification(notification.id)}
                    className="h-6 sm:h-7 text-[10px] sm:text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="hidden sm:inline ml-1">Clear</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="fixed left-2 right-2 sm:absolute sm:left-auto sm:right-0 top-12 sm:w-[450px] max-w-full shadow-lg z-50 max-h-[85vh] sm:max-h-[600px] flex flex-col overflow-hidden">
      <CardHeader className="p-3 sm:p-4 border-b flex-shrink-0">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm sm:text-base">Notifications</CardTitle>
          <div className="flex items-center gap-1 sm:gap-2">
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
                className="h-7 sm:h-8 text-[10px] sm:text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
              >
                <Trash2 className="h-3 w-3 sm:mr-1" />
                <span className="hidden sm:inline">Clear All</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 sm:h-8 sm:w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 overflow-y-auto">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No notifications</p>
            </div>
          ) : (
            <>
              {/* Pinned Notifications Section */}
              {pinnedNotifications.length > 0 && (
                <div>
                  <div className="bg-amber-50 px-3 sm:px-4 py-2 border-b border-amber-100">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Pin className="h-3 w-3 sm:h-4 sm:w-4 text-amber-700 fill-amber-700 flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-semibold text-amber-900">
                        Pinned
                      </span>
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] sm:text-xs h-4 sm:h-5">
                        {pinnedNotifications.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="divide-y">
                    {pinnedNotifications.map((notification) => renderNotificationItem(notification, false))}
                  </div>
                  <Separator className="my-1 sm:my-2" />
                </div>
              )}

              {/* Regular Notifications Section */}
              {unpinnedNotifications.length > 0 && (
                <div>
                  {pinnedNotifications.length > 0 && (
                    <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b">
                      <span className="text-xs sm:text-sm font-semibold text-gray-700">
                        Recent
                      </span>
                    </div>
                  )}
                  <div className="divide-y">
                    {unpinnedNotifications.map((notification) => renderNotificationItem(notification))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
