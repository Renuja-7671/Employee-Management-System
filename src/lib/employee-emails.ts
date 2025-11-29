// src/lib/employee-emails.ts
import { sendEmail } from './nodemailer';

export interface NewEmployeeEmailData {
  employeeName: string;
  employeeEmail: string;
  employeeId: string;
  password: string;
  department: string;
  position: string;
  loginUrl?: string;
}

// Email to the newly created employee with account credentials
function getNewEmployeeAccountTemplate(data: NewEmployeeEmailData): string {
  const loginUrl = data.loginUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Unique Industrial Solutions</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: bold;
        }
        .status-badge {
          display: inline-block;
          background-color: #059669;
          color: white;
          padding: 8px 20px;
          border-radius: 20px;
          font-weight: 600;
          margin-top: 15px;
          font-size: 14px;
        }
        .content {
          padding: 40px 30px;
          color: #333;
        }
        .content p {
          font-size: 16px;
          line-height: 1.6;
          color: #555;
          margin-bottom: 20px;
        }
        .info-box {
          background-color: #f0fdf4;
          border-left: 4px solid #10b981;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .info-row {
          display: flex;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          font-weight: 600;
          color: #059669;
          min-width: 140px;
        }
        .info-value {
          color: #333;
          flex: 1;
        }
        .credentials-box {
          background-color: #fef3c7;
          border: 2px solid #f59e0b;
          padding: 20px;
          margin: 25px 0;
          border-radius: 8px;
        }
        .credentials-box h3 {
          margin: 0 0 15px 0;
          color: #b45309;
          font-size: 18px;
        }
        .credential-item {
          background-color: #ffffff;
          padding: 12px;
          margin: 10px 0;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
        }
        .credential-label {
          font-weight: 600;
          color: #78350f;
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
        }
        .credential-value {
          color: #1f2937;
          font-size: 16px;
          word-break: break-all;
        }
        .warning-box {
          background-color: #fef2f2;
          border-left: 4px solid #ef4444;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning-box p {
          margin: 0;
          color: #991b1b;
          font-weight: 500;
        }
        .button {
          display: inline-block;
          background-color: #10b981;
          color: white;
          padding: 14px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
          text-align: center;
        }
        .button:hover {
          background-color: #059669;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 30px;
          text-align: center;
          color: #777;
          font-size: 14px;
        }
        .footer strong {
          color: #333;
          display: block;
          margin-bottom: 10px;
          font-size: 16px;
        }
        @media only screen and (max-width: 600px) {
          .container {
            margin: 20px;
          }
          .content {
            padding: 20px 15px;
          }
          .info-row {
            flex-direction: column;
          }
          .info-label {
            margin-bottom: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to Our Team!</h1>
          <div class="status-badge">ACCOUNT CREATED</div>
        </div>

        <div class="content">
          <p>Dear ${data.employeeName},</p>

          <p>
            Welcome to <strong>Unique Industrial Solutions</strong>! We're excited to have you join our team.
            Your employee account has been successfully created in our Employee Management System.
          </p>

          <div class="info-box">
            <div class="info-row">
              <div class="info-label">Full Name:</div>
              <div class="info-value">${data.employeeName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Employee ID:</div>
              <div class="info-value">${data.employeeId}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Department:</div>
              <div class="info-value">${data.department}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Position:</div>
              <div class="info-value">${data.position}</div>
            </div>
          </div>

          <div class="credentials-box">
            <h3>🔐 Your Login Credentials</h3>
            <p style="margin: 0 0 15px 0; color: #78350f; font-size: 14px;">
              Please use the following credentials to access the Employee Management System:
            </p>

            <div class="credential-item">
              <span class="credential-label">Email (Username):</span>
              <span class="credential-value">${data.employeeEmail}</span>
            </div>

            <div class="credential-item">
              <span class="credential-label">Temporary Password:</span>
              <span class="credential-value">${data.password}</span>
            </div>
          </div>

          <div class="warning-box">
            <p>⚠️ <strong>Important Security Notice:</strong> Please change your password immediately after your first login. Keep your credentials secure and do not share them with anyone.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" class="button">Login to Employee Portal</a>
          </div>

          <p>
            <strong>Getting Started:</strong>
          </p>
          <ul style="color: #555; line-height: 1.8;">
            <li>Click the login button above to access the system</li>
            <li>Use your email and temporary password to log in</li>
            <li>Update your profile information and change your password</li>
            <li>Explore the dashboard to manage your leaves, attendance, and more</li>
          </ul>

          <p>
            If you have any questions or need assistance, please don't hesitate to contact your HR department
            or the system administrator.
          </p>

          <p style="margin-top: 30px;">
            <strong>We're glad to have you on board!</strong>
          </p>
        </div>

        <div class="footer">
          <strong>Unique Industrial Solutions</strong>
          <p>Employee Management System</p>
          <p style="margin-top: 15px; color: #999; font-size: 12px;">
            This is an automated notification. For support, please contact your HR department.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Email to admin confirming employee creation
function getNewEmployeeAdminTemplate(data: NewEmployeeEmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Employee Created</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: bold;
        }
        .status-badge {
          display: inline-block;
          background-color: #10b981;
          color: white;
          padding: 8px 20px;
          border-radius: 20px;
          font-weight: 600;
          margin-top: 15px;
          font-size: 14px;
        }
        .content {
          padding: 40px 30px;
          color: #333;
        }
        .content p {
          font-size: 16px;
          line-height: 1.6;
          color: #555;
          margin-bottom: 20px;
        }
        .info-box {
          background-color: #f5f3ff;
          border-left: 4px solid #8b5cf6;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .info-row {
          display: flex;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          font-weight: 600;
          color: #7c3aed;
          min-width: 140px;
        }
        .info-value {
          color: #333;
          flex: 1;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 30px;
          text-align: center;
          color: #777;
          font-size: 14px;
        }
        .footer strong {
          color: #333;
          display: block;
          margin-bottom: 10px;
          font-size: 16px;
        }
        @media only screen and (max-width: 600px) {
          .container {
            margin: 20px;
          }
          .content {
            padding: 20px 15px;
          }
          .info-row {
            flex-direction: column;
          }
          .info-label {
            margin-bottom: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ New Employee Created</h1>
          <div class="status-badge">CONFIRMED</div>
        </div>

        <div class="content">
          <p>Dear Admin,</p>

          <p>
            This is a confirmation that you have successfully created a new employee account.
            The employee has been notified via email with their login credentials.
          </p>

          <div class="info-box">
            <div class="info-row">
              <div class="info-label">Employee Name:</div>
              <div class="info-value">${data.employeeName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Employee ID:</div>
              <div class="info-value">${data.employeeId}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Email:</div>
              <div class="info-value">${data.employeeEmail}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Department:</div>
              <div class="info-value">${data.department}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Position:</div>
              <div class="info-value">${data.position}</div>
            </div>
          </div>

          <p>
            <strong>Account Details Sent To:</strong>
          </p>
          <ul style="color: #555; line-height: 1.8;">
            <li>${data.employeeName} (${data.employeeEmail})</li>
          </ul>

          <p>
            The employee has received their temporary password and login instructions via email.
            They should change their password upon first login for security purposes.
          </p>

          <p style="margin-top: 30px;">
            The employee account is now active and ready to use.
          </p>
        </div>

        <div class="footer">
          <strong>Unique Industrial Solutions</strong>
          <p>Employee Management System - Admin Portal</p>
          <p style="margin-top: 15px; color: #999; font-size: 12px;">
            This is an automated confirmation email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Function to send new employee account emails
export async function sendNewEmployeeEmails(data: NewEmployeeEmailData) {
  const results = {
    employee: { success: false, error: null as any, messageId: null as any },
    admin: { success: false, error: null as any, messageId: null as any },
  };

  // Send email to new employee with credentials
  try {
    const employeeResult = await sendEmail(
      data.employeeEmail,
      '🎉 Welcome to Unique Industrial Solutions - Your Account Details',
      getNewEmployeeAccountTemplate(data)
    );
    results.employee = {
      success: employeeResult.success,
      error: null,
      messageId: employeeResult.success ? employeeResult.messageId : null
    };
  } catch (error) {
    console.error('Error sending email to new employee:', error);
    results.employee = { success: false, error, messageId: null };
  }

  // Send confirmation email to admin
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  if (adminEmail) {
    try {
      const adminResult = await sendEmail(
        adminEmail,
        '✅ New Employee Account Created - Confirmation',
        getNewEmployeeAdminTemplate(data)
      );
      results.admin = {
        success: adminResult.success,
        error: null,
        messageId: adminResult.success ? adminResult.messageId : null
      };
    } catch (error) {
      console.error('Error sending confirmation email to admin:', error);
      results.admin = { success: false, error, messageId: null };
    }
  } else {
    results.admin = { success: true, error: null, messageId: null }; // No admin email configured
  }

  return results;
}
