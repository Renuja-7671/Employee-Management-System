// src/lib/leave-emails.ts
import { sendEmail } from './nodemailer';

export interface LeaveApprovalEmailData {
  employeeName: string;
  employeeEmail: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  adminResponse?: string;
  coverEmployeeName?: string;
  coverEmployeeEmail?: string;
}

// Email to the employee who applied for leave
function getLeaveApprovalEmployeeTemplate(data: LeaveApprovalEmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Leave Approved</title>
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
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
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
          background-color: #f0fdfa;
          border-left: 4px solid #14b8a6;
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
          color: #0d9488;
          min-width: 140px;
        }
        .info-value {
          color: #333;
          flex: 1;
        }
        .admin-response {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .admin-response strong {
          color: #b45309;
          display: block;
          margin-bottom: 8px;
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
          <h1>✅ Leave Request Approved</h1>
          <div class="status-badge">APPROVED</div>
        </div>

        <div class="content">
          <p>Dear ${data.employeeName},</p>

          <p>
            Great news! Your leave request has been <strong>approved</strong> by the admin.
            You can now proceed with your planned time off.
          </p>

          <div class="info-box">
            <div class="info-row">
              <div class="info-label">Leave Type:</div>
              <div class="info-value">${data.leaveType}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Start Date:</div>
              <div class="info-value">${data.startDate}</div>
            </div>
            <div class="info-row">
              <div class="info-label">End Date:</div>
              <div class="info-value">${data.endDate}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Total Days:</div>
              <div class="info-value">${data.totalDays} day(s)</div>
            </div>
            <div class="info-row">
              <div class="info-label">Reason:</div>
              <div class="info-value">${data.reason}</div>
            </div>
            ${data.coverEmployeeName ? `
            <div class="info-row">
              <div class="info-label">Cover Employee:</div>
              <div class="info-value">${data.coverEmployeeName}</div>
            </div>
            ` : ''}
          </div>

          ${data.adminResponse ? `
          <div class="admin-response">
            <strong>Admin's Message:</strong>
            <p style="margin: 0; color: #78350f;">${data.adminResponse}</p>
          </div>
          ` : ''}

          <p>
            Please ensure proper handover of your responsibilities${data.coverEmployeeName ? ` to ${data.coverEmployeeName}` : ''}
            before your leave begins.
          </p>

          <p style="margin-top: 30px;">
            <strong>Have a great time!</strong>
          </p>
        </div>

        <div class="footer">
          <strong>Unique Industrial Solutions</strong>
          <p>Employee Management System</p>
          <p style="margin-top: 15px; color: #999; font-size: 12px;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Email to the cover employee
function getLeaveApprovalCoverTemplate(data: LeaveApprovalEmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cover Request Assignment</title>
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
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
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
          background-color: #f59e0b;
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
          background-color: #eff6ff;
          border-left: 4px solid #3b82f6;
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
          color: #2563eb;
          min-width: 140px;
        }
        .info-value {
          color: #333;
          flex: 1;
        }
        .highlight-box {
          background-color: #fef3c7;
          border: 2px solid #f59e0b;
          padding: 20px;
          margin: 25px 0;
          border-radius: 8px;
          text-align: center;
        }
        .highlight-box p {
          margin: 0;
          font-size: 16px;
          color: #78350f;
          font-weight: 500;
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
          <h1>📋 Cover Request Assignment</h1>
          <div class="status-badge">ACTION REQUIRED</div>
        </div>

        <div class="content">
          <p>Dear ${data.coverEmployeeName},</p>

          <p>
            You have been assigned as the <strong>cover employee</strong> for ${data.employeeName}'s
            approved leave request. Please review the details below.
          </p>

          <div class="info-box">
            <div class="info-row">
              <div class="info-label">Employee:</div>
              <div class="info-value">${data.employeeName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Leave Type:</div>
              <div class="info-value">${data.leaveType}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Start Date:</div>
              <div class="info-value">${data.startDate}</div>
            </div>
            <div class="info-row">
              <div class="info-label">End Date:</div>
              <div class="info-value">${data.endDate}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Duration:</div>
              <div class="info-value">${data.totalDays} day(s)</div>
            </div>
            <div class="info-row">
              <div class="info-label">Reason:</div>
              <div class="info-value">${data.reason}</div>
            </div>
          </div>

          <div class="highlight-box">
            <p>
              <strong>📌 Important:</strong> Please coordinate with ${data.employeeName} for a proper
              handover of responsibilities before their leave begins.
            </p>
          </div>

          <p>
            During this period, you will be responsible for handling ${data.employeeName}'s duties.
            If you have any questions or concerns, please contact them directly or reach out to the admin.
          </p>

          <p style="margin-top: 30px;">
            <strong>Thank you for your cooperation!</strong>
          </p>
        </div>

        <div class="footer">
          <strong>Unique Industrial Solutions</strong>
          <p>Employee Management System</p>
          <p style="margin-top: 15px; color: #999; font-size: 12px;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Email to the admin
function getLeaveApprovalAdminTemplate(data: LeaveApprovalEmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Leave Approved - Confirmation</title>
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
          <h1>✅ Leave Approval Confirmation</h1>
          <div class="status-badge">PROCESSED</div>
        </div>

        <div class="content">
          <p>Dear Admin,</p>

          <p>
            This is a confirmation that you have successfully <strong>approved</strong> the following
            leave request. All relevant parties have been notified via email.
          </p>

          <div class="info-box">
            <div class="info-row">
              <div class="info-label">Employee:</div>
              <div class="info-value">${data.employeeName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Leave Type:</div>
              <div class="info-value">${data.leaveType}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Start Date:</div>
              <div class="info-value">${data.startDate}</div>
            </div>
            <div class="info-row">
              <div class="info-label">End Date:</div>
              <div class="info-value">${data.endDate}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Total Days:</div>
              <div class="info-value">${data.totalDays} day(s)</div>
            </div>
            ${data.coverEmployeeName ? `
            <div class="info-row">
              <div class="info-label">Cover Employee:</div>
              <div class="info-value">${data.coverEmployeeName}</div>
            </div>
            ` : ''}
          </div>

          <p>
            <strong>Notifications sent to:</strong>
          </p>
          <ul style="color: #555; line-height: 1.8;">
            <li>${data.employeeName} (${data.employeeEmail})</li>
            ${data.coverEmployeeName && data.coverEmployeeEmail ? `
            <li>${data.coverEmployeeName} (${data.coverEmployeeEmail})</li>
            ` : ''}
          </ul>

          <p style="margin-top: 30px;">
            The leave has been recorded in the system and the employee's leave balance has been updated accordingly.
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

// Function to send leave approval emails to all parties
export async function sendLeaveApprovalEmails(data: LeaveApprovalEmailData) {
  const results = {
    employee: { success: false, error: null as any, messageId: null as any },
    cover: { success: false, error: null as any, messageId: null as any },
    admin: { success: false, error: null as any, messageId: null as any },
  };

  // Send email to employee
  try {
    const employeeResult = await sendEmail(
      data.employeeEmail,
      '✅ Leave Request Approved',
      getLeaveApprovalEmployeeTemplate(data)
    );
    results.employee = {
      success: employeeResult.success,
      error: null,
      messageId: employeeResult.success ? employeeResult.messageId : null
    };
  } catch (error) {
    console.error('Error sending email to employee:', error);
    results.employee = { success: false, error, messageId: null };
  }

  // Send email to cover employee if assigned
  if (data.coverEmployeeName && data.coverEmployeeEmail) {
    try {
      const coverResult = await sendEmail(
        data.coverEmployeeEmail,
        '📋 Cover Request Assignment - Action Required',
        getLeaveApprovalCoverTemplate(data)
      );
      results.cover = {
        success: coverResult.success,
        error: null,
        messageId: coverResult.success ? coverResult.messageId : null
      };
    } catch (error) {
      console.error('Error sending email to cover employee:', error);
      results.cover = { success: false, error, messageId: null };
    }
  } else {
    results.cover = { success: true, error: null, messageId: null }; // No cover employee assigned
  }

  // Send confirmation email to admin
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  if (adminEmail) {
    try {
      const adminResult = await sendEmail(
        adminEmail,
        '✅ Leave Approval Confirmation',
        getLeaveApprovalAdminTemplate(data)
      );
      results.admin = {
        success: adminResult.success,
        error: null,
        messageId: adminResult.success ? adminResult.messageId : null
      };
    } catch (error) {
      console.error('Error sending email to admin:', error);
      results.admin = { success: false, error, messageId: null };
    }
  } else {
    results.admin = { success: true, error: null, messageId: null }; // No admin email configured
  }

  return results;
}

// Leave rejection/decline email templates and functions

// Email to the employee whose leave was declined
function getLeaveRejectionEmployeeTemplate(data: LeaveApprovalEmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Leave Request Declined</title>
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
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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
          background-color: #dc2626;
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
          background-color: #fef2f2;
          border-left: 4px solid #ef4444;
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
          color: #dc2626;
          min-width: 140px;
        }
        .info-value {
          color: #333;
          flex: 1;
        }
        .admin-response {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .admin-response strong {
          color: #b45309;
          display: block;
          margin-bottom: 8px;
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
          <h1>❌ Leave Request Declined</h1>
          <div class="status-badge">DECLINED</div>
        </div>

        <div class="content">
          <p>Dear ${data.employeeName},</p>

          <p>
            We regret to inform you that your leave request has been <strong>declined</strong> by the admin.
            Please review the details and the admin's message below.
          </p>

          <div class="info-box">
            <div class="info-row">
              <div class="info-label">Leave Type:</div>
              <div class="info-value">${data.leaveType}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Start Date:</div>
              <div class="info-value">${data.startDate}</div>
            </div>
            <div class="info-row">
              <div class="info-label">End Date:</div>
              <div class="info-value">${data.endDate}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Total Days:</div>
              <div class="info-value">${data.totalDays} day(s)</div>
            </div>
            <div class="info-row">
              <div class="info-label">Reason:</div>
              <div class="info-value">${data.reason}</div>
            </div>
          </div>

          ${data.adminResponse ? `
          <div class="admin-response">
            <strong>Admin's Message:</strong>
            <p style="margin: 0; color: #78350f;">${data.adminResponse}</p>
          </div>
          ` : ''}

          <p>
            If you have any questions or would like to discuss this decision, please contact the admin
            or HR department. You may also submit a new leave request with different dates if needed.
          </p>

          <p style="margin-top: 30px;">
            <strong>Thank you for your understanding.</strong>
          </p>
        </div>

        <div class="footer">
          <strong>Unique Industrial Solutions</strong>
          <p>Employee Management System</p>
          <p style="margin-top: 15px; color: #999; font-size: 12px;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Email to the cover employee (if assigned)
function getLeaveRejectionCoverTemplate(data: LeaveApprovalEmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cover Request Cancelled</title>
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
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
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
          background-color: #4b5563;
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
          background-color: #f9fafb;
          border-left: 4px solid #6b7280;
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
          color: #4b5563;
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
          <h1>🔔 Cover Request Cancelled</h1>
          <div class="status-badge">NO ACTION NEEDED</div>
        </div>

        <div class="content">
          <p>Dear ${data.coverEmployeeName},</p>

          <p>
            This is to inform you that the leave request for which you were assigned as the cover employee
            has been <strong>declined</strong> by the admin. No action is required from your side.
          </p>

          <div class="info-box">
            <div class="info-row">
              <div class="info-label">Employee:</div>
              <div class="info-value">${data.employeeName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Leave Type:</div>
              <div class="info-value">${data.leaveType}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Requested Period:</div>
              <div class="info-value">${data.startDate} - ${data.endDate}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Status:</div>
              <div class="info-value">Declined by Admin</div>
            </div>
          </div>

          <p>
            You do not need to make any arrangements for covering ${data.employeeName}'s responsibilities
            as the leave request was not approved.
          </p>

          <p style="margin-top: 30px;">
            <strong>Thank you for your availability.</strong>
          </p>
        </div>

        <div class="footer">
          <strong>Unique Industrial Solutions</strong>
          <p>Employee Management System</p>
          <p style="margin-top: 15px; color: #999; font-size: 12px;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Email to the admin
function getLeaveRejectionAdminTemplate(data: LeaveApprovalEmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Leave Declined - Confirmation</title>
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
          background-color: #dc2626;
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
          <h1>❌ Leave Decline Confirmation</h1>
          <div class="status-badge">DECLINED</div>
        </div>

        <div class="content">
          <p>Dear Admin,</p>

          <p>
            This is a confirmation that you have <strong>declined</strong> the following
            leave request. All relevant parties have been notified via email.
          </p>

          <div class="info-box">
            <div class="info-row">
              <div class="info-label">Employee:</div>
              <div class="info-value">${data.employeeName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Leave Type:</div>
              <div class="info-value">${data.leaveType}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Start Date:</div>
              <div class="info-value">${data.startDate}</div>
            </div>
            <div class="info-row">
              <div class="info-label">End Date:</div>
              <div class="info-value">${data.endDate}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Total Days:</div>
              <div class="info-value">${data.totalDays} day(s)</div>
            </div>
            ${data.coverEmployeeName ? `
            <div class="info-row">
              <div class="info-label">Cover Employee:</div>
              <div class="info-value">${data.coverEmployeeName} (notified of cancellation)</div>
            </div>
            ` : ''}
          </div>

          <p>
            <strong>Notifications sent to:</strong>
          </p>
          <ul style="color: #555; line-height: 1.8;">
            <li>${data.employeeName} (${data.employeeEmail})</li>
            ${data.coverEmployeeName && data.coverEmployeeEmail ? `
            <li>${data.coverEmployeeName} (${data.coverEmployeeEmail})</li>
            ` : ''}
          </ul>

          <p style="margin-top: 30px;">
            The leave request has been declined and no changes have been made to the employee's leave balance.
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

// Function to send leave rejection emails to all parties
export async function sendLeaveRejectionEmails(data: LeaveApprovalEmailData) {
  const results = {
    employee: { success: false, error: null as any, messageId: null as any },
    cover: { success: false, error: null as any, messageId: null as any },
    admin: { success: false, error: null as any, messageId: null as any },
  };

  // Send email to employee
  try {
    const employeeResult = await sendEmail(
      data.employeeEmail,
      '❌ Leave Request Declined',
      getLeaveRejectionEmployeeTemplate(data)
    );
    results.employee = {
      success: employeeResult.success,
      error: null,
      messageId: employeeResult.success ? employeeResult.messageId : null
    };
  } catch (error) {
    console.error('Error sending rejection email to employee:', error);
    results.employee = { success: false, error, messageId: null };
  }

  // Send email to cover employee if assigned
  if (data.coverEmployeeName && data.coverEmployeeEmail) {
    try {
      const coverResult = await sendEmail(
        data.coverEmployeeEmail,
        '🔔 Cover Request Cancelled',
        getLeaveRejectionCoverTemplate(data)
      );
      results.cover = {
        success: coverResult.success,
        error: null,
        messageId: coverResult.success ? coverResult.messageId : null
      };
    } catch (error) {
      console.error('Error sending cancellation email to cover employee:', error);
      results.cover = { success: false, error, messageId: null };
    }
  } else {
    results.cover = { success: true, error: null, messageId: null }; // No cover employee assigned
  }

  // Send confirmation email to admin
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  if (adminEmail) {
    try {
      const adminResult = await sendEmail(
        adminEmail,
        '❌ Leave Decline Confirmation',
        getLeaveRejectionAdminTemplate(data)
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
