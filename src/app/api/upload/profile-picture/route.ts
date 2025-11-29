// src/app/api/upload/profile-picture/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const employeeId = formData.get('employeeId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${employeeId}_${Date.now()}.${fileExtension}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('profilePictures')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json(
        { error: `Failed to upload to storage: ${error.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profilePictures')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    return NextResponse.json({
      success: true,
      path: publicUrl,
      message: 'Profile picture uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return NextResponse.json(
      { error: 'Failed to upload profile picture' },
      { status: 500 }
    );
  }
}
