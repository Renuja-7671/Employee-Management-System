// src/app/api/employees/birthdays/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const employees = await prisma.user.findMany({
      where: {
        role: 'EMPLOYEE',
        isActive: true,
        // Add birthday field filter if you have it
      },
    });

    // Calculate upcoming birthdays (next 30 days)
    const today = new Date();
    const upcomingBirthdays = employees
      .filter((emp: any) => emp.birthday) // Assuming you have a birthday field
      .map((emp: any) => {
        // Calculate days until next birthday
        const birthday = new Date(emp.birthday);
        const thisYear = new Date(
          today.getFullYear(),
          birthday.getMonth(),
          birthday.getDate()
        );
        const nextYear = new Date(
          today.getFullYear() + 1,
          birthday.getMonth(),
          birthday.getDate()
        );

        let nextBirthday = thisYear;
        if (thisYear < today) {
          nextBirthday = nextYear;
        }

        const daysUntil = Math.ceil(
          (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          ...emp,
          nextBirthday,
          daysUntil,
        };
      })
      .filter((emp) => emp.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    return NextResponse.json({ birthdays: upcomingBirthdays });
  } catch (error: any) {
    console.error('Error fetching birthdays:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch birthdays' },
      { status: 500 }
    );
  }
}