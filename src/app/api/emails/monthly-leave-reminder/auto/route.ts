import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/nodemailer';

/**
 * Automated cron job to send monthly leave reminder emails
 * Runs on the 1st of every month at 8:00 AM UTC
 * Sends reminder to all active employees to regularize leaves
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all active employees
    const activeEmployees = await prisma.user.findMany({
      where: {
        isActive: true,
        role: 'EMPLOYEE',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        employeeId: true,
      },
    });

    if (activeEmployees.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active employees found',
        emailsSent: 0,
      });
    }

    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    let successCount = 0;
    let failureCount = 0;
    const failedEmails: string[] = [];

    // Send reminder email to each active employee
    for (const employee of activeEmployees) {
      try {
        const employeeName = employee.firstName || employee.lastName 
          ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
          : employee.employeeId;

        const subject = `Monthly Leave Regularization Reminder - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
    }
    .container {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 8px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background-color: white;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
    }
    .section {
      margin: 20px 0;
      padding: 15px;
      background-color: #f0f4ff;
      border-left: 4px solid #667eea;
      border-radius: 4px;
    }
    .section h3 {
      margin-top: 0;
      color: #667eea;
    }
    .action-items {
      list-style: none;
      padding: 0;
    }
    .action-items li {
      padding: 10px 0;
      padding-left: 25px;
      position: relative;
    }
    .action-items li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #10b981;
      font-weight: bold;
    }
    .important {
      background-color: #fef3c7;
      border-left-color: #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .important h4 {
      margin-top: 0;
      color: #d97706;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
    }
    .button {
      display: inline-block;
      background-color: #667eea;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 20px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Monthly Leave Regularization Reminder</h1>
      <p>Action Required</p>
    </div>
    
    <div class="content">
      <div class="greeting">
        <p>Dear <strong>${employeeName}</strong>,</p>
        <p>This is a monthly reminder from the HR team to help you stay on top of your leave management.</p>
      </div>

      <div class="section">
        <h3>📌 What You Need to Do:</h3>
        <ul class="action-items">
          <li><strong>Regularize Pending Leaves:</strong> If you have any leaves from last month (${new Date(currentYear, currentMonth - 2, 1).toLocaleDateString('en-US', { month: 'long' })}) that haven't been formally submitted, please apply for them now in the system.</li>
          <li><strong>Track Applied Leaves:</strong> Review all the leaves you have already applied for. Check if they are still pending admin approval or have been approved/declined.</li>
          <li><strong>Submit Missing Documentation:</strong> If you have any medical leaves that require certificates, ensure all documents are uploaded to avoid delays in approval.</li>
          <li><strong>Verify Leave Balance:</strong> Check your current leave balance to plan your upcoming leave applications.</li>
        </ul>
      </div>

      <div class="important">
        <h4>⚠️ Important Reminders:</h4>
        <ul style="margin: 10px 0;">
          <li>Please ensure all leaves are regularized within a reasonable timeframe.</li>
          <li>Leaves pending approval should be reviewed by administrators for timely action.</li>
          <li>Medical leaves require supporting documentation for processing.</li>
          <li>Plan your leaves well in advance and ensure proper cover arrangements are in place.</li>
        </ul>
      </div>

      <p><strong>Need Help?</strong> If you have any questions about your leave balance or the application process, please contact the HR department.</p>

      <div style="text-align: center;">
        <a href="${process.env.NEXTAUTH_URL || 'https://ems.example.com'}/employee/dashboard" class="button">
          View My Leaves
        </a>
      </div>

      <div class="footer">
        <p>This is an automated reminder from the Employee Management System.</p>
        <p>© ${currentYear} All rights reserved. Please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
        `;

        await sendEmail(
          employee.email,
          subject,
          htmlContent
        );

        successCount++;
        console.log(`✓ Monthly reminder email sent to ${employee.email}`);
      } catch (error) {
        failureCount++;
        failedEmails.push(employee.email);
        console.error(`✗ Failed to send reminder email to ${employee.email}:`, error);
      }
    }

    // Log the results
    const logMessage = `Monthly Leave Reminder Cron - Sent: ${successCount}, Failed: ${failureCount}, Total Employees: ${activeEmployees.length}`;
    console.log(logMessage);

    return NextResponse.json({
      success: true,
      message: logMessage,
      emailsSent: successCount,
      emailsFailed: failureCount,
      failedEmails: failureCount > 0 ? failedEmails : undefined,
    });
  } catch (error) {
    console.error('Error in monthly leave reminder cron:', error);
    return NextResponse.json(
      {
        error: 'Failed to send monthly leave reminder emails',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
