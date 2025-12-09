// src/app/api/admin/holidays/route.ts
// API endpoint to fetch public holidays from the database

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/holidays
 * Fetch all public holidays from the database
 */
export async function GET() {
  try {
    const holidays = await prisma.publicHoliday.findMany({
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({
      success: true,
      count: holidays.length,
      holidays,
    });
  } catch (error: any) {
    console.error('[HOLIDAYS] Fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch holidays' },
      { status: 500 }
    );
  }
}
