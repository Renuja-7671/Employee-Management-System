// src/app/api/test-db/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Test 1: Check if Prisma client is initialized
    console.log('Testing database connection...');

    // Test 2: Simple query to check database connectivity
    const userCount = await prisma.user.count();

    // Test 3: Get Prisma client version and runtime info
    const prismaVersion = process.env.npm_package_dependencies_prisma || 'unknown';

    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      data: {
        userCount,
        prismaVersion,
        environment: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'Set ✓' : 'Not set ✗',
        directUrl: process.env.DIRECT_URL ? 'Set ✓' : 'Not set ✗',
      },
    });
  } catch (error: any) {
    console.error('Database connection test failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        errorType: error.constructor.name,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
