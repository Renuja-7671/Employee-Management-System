// src/app/api/leaves/[id]/decline/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.adminResponse) {
      return NextResponse.json(
        { error: 'Admin response is required for declining' },
        { status: 400 }
      );
    }

    const leave = await prisma.leave.update({
      where: { id },
      data: {
        status: 'DECLINED',
        adminResponse: body.adminResponse,
      },
    });

    return NextResponse.json({ success: true, leave });
  } catch (error: any) {
    console.error('Error declining leave:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to decline leave' },
      { status: 500 }
    );
  }
}
