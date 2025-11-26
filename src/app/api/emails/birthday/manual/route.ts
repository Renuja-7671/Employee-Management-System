// src/app/api/emails/birthday/manual/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBirthdayEmail } from '@/lib/nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeIds } = body; // Array of employee IDs

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { error: 'Employee IDs array is required' },
        { status: 400 }
      );
    }

    // Fetch employees
    const employees = await prisma.user.findMany({
      where: {
        id: {
          in: employeeIds,
        },
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (employees.length === 0) {
      return NextResponse.json(
        { error: 'No active employees found with the provided IDs' },
        { status: 404 }
      );
    }

    const results = [];
    const errors = [];

    // Send birthday email to each employee
    for (const employee of employees) {
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
      message: `Birthday emails sent to ${results.length} out of ${employees.length} employees`,
      sent: results,
      failed: errors,
      total: employees.length,
      successCount: results.length,
      failureCount: errors.length,
    });
  } catch (error: any) {
    console.error('Error sending birthday emails:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send birthday emails' },
      { status: 500 }
    );
  }
}
