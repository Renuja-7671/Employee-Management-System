// src/lib/api/notifications.ts

const API_URL = `https://${process.env.NEXT_PUBLIC_PROJECT_ID}.supabase.co/functions/v1/make-server-a9521f7f`;

export async function getNotifications() {
  const token = localStorage.getItem('access_token');
  
  const response = await fetch(`${API_URL}/notifications`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }

  const data = await response.json();
  return data.notifications;
}

export async function markNotificationAsRead(notificationId: string) {
  const token = localStorage.getItem('access_token');
  
  const response = await fetch(`${API_URL}/notifications/read`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ notificationId }),
  });

  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }

  return await response.json();
}