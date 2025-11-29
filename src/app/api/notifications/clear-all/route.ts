// src/app/api/notifications/clear-all/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Delete all notifications for the user
    await prisma.notification.deleteMany({
      where: {
        userId: userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'All notifications cleared successfully',
    });
  } catch (error: any) {
    console.error('Error clearing all notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear all notifications' },
      { status: 500 }
    );
  }
}
