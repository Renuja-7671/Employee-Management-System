import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
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

    // Check if profile picture exists in the uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profile-pictures');

    // Check for various image extensions
    const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    let foundFile = null;

    for (const ext of extensions) {
      const filePath = path.join(uploadsDir, `${userId}.${ext}`);
      if (existsSync(filePath)) {
        foundFile = `/uploads/profile-pictures/${userId}.${ext}`;
        break;
      }
    }

    if (foundFile) {
      return NextResponse.json({
        url: foundFile,
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
