// src/app/api/auth/forgot-password/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import nodemailer from 'nodemailer';

/**
 * Forgot Password API
 * Generates a reset token and sends email with reset link
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Check if user exists
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return NextResponse.json({
        success: false,
        error: 'No account found with this email address. Please check your email or contact your administrator.',
      }, { status: 404 });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log(`Password reset requested for inactive user: ${email}`);
      return NextResponse.json({
        success: false,
        error: 'This account is inactive. Please contact your administrator for assistance.',
      }, { status: 403 });
    }

    // Generate secure random token
    const token = randomBytes(32).toString('hex');

    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Invalidate any existing unused tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        used: false,
        expiresAt: { gt: new Date() },
      },
      data: { used: true },
    });

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Generate reset link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    request.headers.get('origin') ||
                    'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    // Send email
    try {
      await sendPasswordResetEmail(user.email, user.firstName, resetLink);
      console.log(`Password reset email sent to: ${email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Delete the token since email failed
      await prisma.passwordResetToken.deleteMany({
        where: { token },
      });

      return NextResponse.json(
        { error: 'Failed to send password reset email. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent.',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetLink: string
) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Unique Industrial Solutions';

  const mailOptions = {
    from: `"${appName}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Password Reset Request - ${appName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .content {
            padding: 30px 0;
          }
          .greeting {
            font-size: 18px;
            margin-bottom: 20px;
          }
          .message {
            color: #666;
            margin-bottom: 30px;
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          .reset-button {
            display: inline-block;
            padding: 14px 32px;
            background-color: #2563eb;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
          }
          .reset-button:hover {
            background-color: #1d4ed8;
          }
          .link-text {
            color: #666;
            font-size: 14px;
            margin-top: 20px;
            word-break: break-all;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .warning-title {
            font-weight: 600;
            color: #92400e;
            margin-bottom: 5px;
          }
          .warning-text {
            color: #78350f;
            font-size: 14px;
          }
          .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 2px solid #f0f0f0;
            color: #999;
            font-size: 14px;
          }
          .expiry {
            color: #ef4444;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">${appName}</div>
            <div style="color: #666; font-size: 14px;">Employee Management System</div>
          </div>

          <div class="content">
            <div class="greeting">Hello ${firstName},</div>

            <div class="message">
              We received a request to reset your password for your ${appName} account.
              Click the button below to create a new password.
            </div>

            <div class="button-container">
              <a href="${resetLink}" class="reset-button">Reset Password</a>
            </div>

            <div class="link-text">
              Or copy and paste this link into your browser:<br>
              <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a>
            </div>

            <div class="warning">
              <div class="warning-title">⏰ Important:</div>
              <div class="warning-text">
                This link will expire in <span class="expiry">1 hour</span> for security reasons.
                If you don't reset your password within this time, you'll need to request a new link.
              </div>
            </div>

            <div class="message">
              If you didn't request a password reset, you can safely ignore this email.
              Your password will remain unchanged.
            </div>
          </div>

          <div class="footer">
            <p>
              This is an automated email from ${appName}.<br>
              Please do not reply to this email.
            </p>
            <p style="margin-top: 10px; color: #ccc; font-size: 12px;">
              © ${new Date().getFullYear()} ${appName}. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hello ${firstName},

      We received a request to reset your password for your ${appName} account.

      To reset your password, click the following link or copy and paste it into your browser:
      ${resetLink}

      This link will expire in 1 hour for security reasons.

      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

      ---
      This is an automated email from ${appName}.
      © ${new Date().getFullYear()} ${appName}. All rights reserved.
    `,
  };

  await transporter.sendMail(mailOptions);
}
