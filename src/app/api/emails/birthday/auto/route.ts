// src/app/api/emails/birthday/auto/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBirthdayEmail } from '@/lib/nodemailer';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get today's date (month and day only)
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
    const todayDay = today.getDate();

    // Find all employees with birthdays today
    const employees = await prisma.user.findMany({
      where: {
        isActive: true,
        birthday: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        birthday: true,
      },
    });

    // Filter employees with birthdays today
    const birthdayEmployees = employees.filter((employee) => {
      if (!employee.birthday) return false;

      const birthday = new Date(employee.birthday);
      const birthMonth = birthday.getMonth() + 1;
      const birthDay = birthday.getDate();

      return birthMonth === todayMonth && birthDay === todayDay;
    });

    if (birthdayEmployees.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No birthdays today',
        count: 0,
        sent: [],
      });
    }

    const results = [];
    const errors = [];

    // Send birthday email to each employee
    for (const employee of birthdayEmployees) {
      const recipientName = `${employee.firstName} ${employee.lastName}`;

      try {
        const result = await sendBirthdayEmail(employee.email, recipientName);

        if (result.success) {
          results.push({
            employeeId: employee.id,
            email: employee.email,
            name: recipientName,
            status: 'sent',
            messageId: result.messageId,
          });

          // Create notification for the employee
          await prisma.notification.create({
            data: {
              userId: employee.id,
              type: 'SYSTEM_ALERT',
              title: '🎉 Happy Birthday!',
              message: 'We sent you a birthday greeting email. Enjoy your special day!',
            },
          });
        } else {
          errors.push({
            employeeId: employee.id,
            email: employee.email,
            name: recipientName,
            status: 'failed',
            error: 'Failed to send email',
          });
        }
      } catch (error: any) {
        errors.push({
          employeeId: employee.id,
          email: employee.email,
          name: recipientName,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Birthday emails sent to ${results.length} out of ${birthdayEmployees.length} employees`,
      date: today.toISOString().split('T')[0],
      sent: results,
      failed: errors,
      total: birthdayEmployees.length,
      successCount: results.length,
      failureCount: errors.length,
    });
  } catch (error: any) {
    console.error('Error in automatic birthday email sending:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send birthday emails' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Also allow POST for manual testing
  return GET(request);
}
