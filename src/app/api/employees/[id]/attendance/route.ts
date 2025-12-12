import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM

    // Build where clause
    const where: any = {
      employeeId,
    };

    // If month is provided, filter by that month (default to current month)
    const filterMonth = month || new Date().toISOString().substring(0, 7);
    const [year, monthNum] = filterMonth.split('-').map(Number);

    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    where.date = {
      gte: startDate,
      lte: endDate,
    };

    // Fetch attendance records for the specified month only
    const attendance = await prisma.attendance.findMany({
      where,
      orderBy: {
        date: 'desc',
      },
      select: {
        id: true,
        date: true,
        checkIn: true,
        checkOut: true,
        employeeId: true,
      },
    });

    return NextResponse.json({ attendance, month: filterMonth });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}
