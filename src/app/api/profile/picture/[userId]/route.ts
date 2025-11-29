import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch user profile picture from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profilePicture: true
      } as any,
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.profilePicture) {
      return NextResponse.json({
        url: user.profilePicture,
      });
    } else {
      return NextResponse.json(
        { error: 'Profile picture not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error fetching profile picture:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile picture' },
      { status: 500 }
    );
  }
}
