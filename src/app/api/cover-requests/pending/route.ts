import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Count pending cover requests where the user is the cover employee
    const count = await prisma.coverRequest.count({
      where: {
        coverEmployeeId: userId,
        status: 'PENDING',
        expiresAt: {
          gte: new Date(), // Only count non-expired requests
        },
      },
    });

    return NextResponse.json({
      count,
    });
  } catch (error) {
    console.error('Error fetching pending cover count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending cover count' },
      { status: 500 }
    );
  }
}
