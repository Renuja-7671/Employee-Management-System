// src/app/api/auth/reset-password/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * Reset Password API
 * Validates token and resets user password
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    // Validate inputs
    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Find the reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { User: true },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    // Check if token is already used
    if (resetToken.used) {
      return NextResponse.json(
        { error: 'This reset link has already been used' },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json(
        { error: 'This reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if user is active
    if (!resetToken.User.isActive) {
      return NextResponse.json(
        { error: 'This account is inactive. Please contact your administrator.' },
        { status: 403 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and mark token as used
    await prisma.$transaction([
      // Update password
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      // Mark token as used
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: {
          used: true,
          usedAt: new Date(),
        },
      }),
      // Invalidate all other unused tokens for this user
      prisma.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          used: false,
          id: { not: resetToken.id },
        },
        data: { used: true },
      }),
    ]);

    console.log(`Password reset successful for user: ${resetToken.User.email}`);

    return NextResponse.json({
      success: true,
      message: 'Your password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'An error occurred while resetting your password. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Verify reset token (GET request)
 * Used to validate token before showing the reset form
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find the reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        User: {
          select: {
            email: true,
            firstName: true,
            isActive: true,
          },
        },
      },
    });

    if (!resetToken) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid reset link',
      });
    }

    if (resetToken.used) {
      return NextResponse.json({
        valid: false,
        error: 'This reset link has already been used',
      });
    }

    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json({
        valid: false,
        error: 'This reset link has expired',
      });
    }

    if (!resetToken.User.isActive) {
      return NextResponse.json({
        valid: false,
        error: 'This account is inactive',
      });
    }

    return NextResponse.json({
      valid: true,
      email: resetToken.User.email,
      firstName: resetToken.User.firstName,
    });
  } catch (error: any) {
    console.error('Verify token error:', error);
    return NextResponse.json(
      { valid: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
