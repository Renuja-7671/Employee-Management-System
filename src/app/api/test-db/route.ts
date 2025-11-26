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

    // Test 4: Check email configuration
    const emailConfig = {
      EMAIL_HOST: process.env.EMAIL_HOST ? 'Set ✓' : 'Not set ✗',
      EMAIL_PORT: process.env.EMAIL_PORT ? 'Set ✓' : 'Not set ✗',
      EMAIL_SECURE: process.env.EMAIL_SECURE ? 'Set ✓' : 'Not set ✗',
      EMAIL_USER: process.env.EMAIL_USER ? 'Set ✓' : 'Not set ✗',
      EMAIL_PASS: process.env.EMAIL_PASS ? 'Set ✓' : 'Not set ✗',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL ? 'Set ✓' : 'Not set ✗',
    };

    const missingEmailVars = Object.entries(emailConfig)
      .filter(([_, value]) => value === 'Not set ✗')
      .map(([key, _]) => key);

    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      database: {
        userCount,
        prismaVersion,
        environment: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'Set ✓' : 'Not set ✗',
        directUrl: process.env.DIRECT_URL ? 'Set ✓' : 'Not set ✗',
      },
      email: {
        configured: missingEmailVars.length === 0,
        variables: emailConfig,
        missing: missingEmailVars.length > 0 ? missingEmailVars : undefined,
        warning: missingEmailVars.length > 0
          ? `Missing ${missingEmailVars.length} email variable(s). Emails will not send.`
          : undefined,
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
