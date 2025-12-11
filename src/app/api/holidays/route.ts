import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const showAll = searchParams.get('all'); // For debugging

    // Build where clause
    const where: any = {};

    // If year is provided, filter by that year
    if (year) {
      const yearNum = parseInt(year);
      const startOfYear = new Date(yearNum, 0, 1);
      const endOfYear = new Date(yearNum, 11, 31, 23, 59, 59);

      where.date = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    // Only fetch company holidays (Mercantile and Poya) unless showAll is true
    if (!showAll) {
      where.OR = [
        { description: { contains: 'Mercantile', mode: 'insensitive' } },
        { description: { contains: 'Poya', mode: 'insensitive' } },
        { name: { contains: 'Poya', mode: 'insensitive' } }
      ];
    }

    const holidays = await prisma.publicHoliday.findMany({
      where,
      orderBy: {
        date: 'asc',
      },
    });

    return NextResponse.json({ holidays });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holidays' },
      { status: 500 }
    );
  }
}
