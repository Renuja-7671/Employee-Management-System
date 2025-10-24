// src/app/api/employees/birthday-wish/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, message } = body;

    if (!employeeId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create a notification for the employee
    const notification = await prisma.notification.create({
      data: {
        userId: employeeId,
        type: 'SYSTEM_ALERT',
        title: '🎉 Birthday Wishes!',
        message: message,
        isRead: false,
      },
    });

    return NextResponse.json({ success: true, notification });
  } catch (error: any) {
    console.error('Error sending birthday wish:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send birthday wish' },
      { status: 500 }
    );
  }
}