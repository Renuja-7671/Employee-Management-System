// src/app/api/notifications/[id]/pin/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
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

    // Only allow pinning read notifications
    if (!existingNotification.isRead) {
      return NextResponse.json(
        { error: 'Only read notifications can be pinned' },
        { status: 400 }
      );
    }

    // Toggle pin status
    const notification = await prisma.notification.update({
      where: { id },
      data: {
        isPinned: !existingNotification.isPinned,
      },
    });

    return NextResponse.json({ notification });
  } catch (error: any) {
    console.error('Error toggling notification pin:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to toggle notification pin' },
      { status: 500 }
    );
  }
}
