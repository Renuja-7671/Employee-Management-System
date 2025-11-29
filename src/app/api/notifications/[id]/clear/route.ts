// src/app/api/notifications/[id]/clear/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if notification exists
    const existingNotification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!existingNotification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Delete the notification
    await prisma.notification.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Notification cleared successfully' });
  } catch (error: any) {
    console.error('Error clearing notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear notification' },
      { status: 500 }
    );
  }
}
