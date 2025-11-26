// src/app/api/test-email/route.ts
import { NextResponse } from 'next/server';
import { transporter, verifyEmailConfig } from '@/lib/nodemailer';

export async function GET() {
  try {
    // Check if email configuration exists
    const emailConfig = {
      host: process.env.EMAIL_HOST || 'Not set',
      port: process.env.EMAIL_PORT || 'Not set',
      secure: process.env.EMAIL_SECURE || 'Not set',
      user: process.env.EMAIL_USER || 'Not set',
      pass: process.env.EMAIL_PASS ? 'Set (hidden)' : 'Not set',
      adminEmail: process.env.ADMIN_EMAIL || 'Not set',
    };

    // Test 1: Check environment variables
    const missingVars = [];
    if (!process.env.EMAIL_HOST) missingVars.push('EMAIL_HOST');
    if (!process.env.EMAIL_PORT) missingVars.push('EMAIL_PORT');
    if (!process.env.EMAIL_USER) missingVars.push('EMAIL_USER');
    if (!process.env.EMAIL_PASS) missingVars.push('EMAIL_PASS');

    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing email configuration',
        missingVariables: missingVars,
        config: emailConfig,
      }, { status: 500 });
    }

    // Test 2: Verify SMTP connection
    const isVerified = await verifyEmailConfig();

    if (!isVerified) {
      return NextResponse.json({
        success: false,
        error: 'SMTP connection verification failed',
        config: emailConfig,
        hint: 'Check if EMAIL_PASS is correct (should be Gmail App Password, not regular password)',
      }, { status: 500 });
    }

    // Test 3: Try sending a test email
    const testResult = await transporter.sendMail({
      from: `"${process.env.NEXT_PUBLIC_APP_NAME}" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: '✅ Email Test - Vercel Deployment',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px; border-radius: 8px; }
            .success { color: #10b981; font-size: 24px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <p class="success">✅ Email Configuration Works!</p>
            <p>This test email was sent from your Vercel deployment.</p>
            <p><strong>Configuration:</strong></p>
            <ul>
              <li>Host: ${emailConfig.host}</li>
              <li>Port: ${emailConfig.port}</li>
              <li>User: ${emailConfig.user}</li>
            </ul>
            <p>Your leave approval/rejection emails should work now!</p>
          </div>
        </body>
        </html>
      `,
    });

    return NextResponse.json({
      success: true,
      message: 'Email configuration verified and test email sent!',
      config: emailConfig,
      testEmailId: testResult.messageId,
      sentTo: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
    });

  } catch (error: any) {
    console.error('Email test failed:', error);

    return NextResponse.json({
      success: false,
      error: error.message,
      errorType: error.constructor.name,
      code: error.code,
      hint: error.code === 'EAUTH'
        ? 'Authentication failed. Make sure EMAIL_PASS is a Gmail App Password (not your regular password)'
        : 'Check email configuration and Gmail settings',
    }, { status: 500 });
  }
}
