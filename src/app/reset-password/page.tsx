// src/app/reset-password/page.tsx

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Lock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenValid(false);
        setTokenError('No reset token provided');
        setVerifying(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`);
        const data = await response.json();

        if (data.valid) {
          setTokenValid(true);
          setUserEmail(data.email);
        } else {
          setTokenValid(false);
          setTokenError(data.error || 'Invalid or expired reset link');
        }
      } catch (err) {
        setTokenValid(false);
        setTokenError('An error occurred while verifying the reset link');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      toast.error('Password too short');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        toast.success('Password reset successful!');
      } else {
        setError(data.error || 'Failed to reset password. Please try again.');
        toast.error('Failed to reset password');
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying reset link...</p>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Invalid Reset Link
          </h2>
          <p className="text-gray-600 mb-6">{tokenError}</p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push('/forgot-password')}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              Request New Reset Link
            </Button>
            <Button
              onClick={() => router.push('/login')}
              variant="outline"
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Password Reset Successful!
          </h2>
          <p className="text-gray-600 mb-6">
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          <Button
            onClick={() => router.push('/login')}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white"
          >
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      {/* Navbar */}
      <nav className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 w-[96%] sm:w-[95%] max-w-7xl bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-xl sm:rounded-2xl shadow-xl z-50 transition-all duration-300">
        <div className="px-3 sm:px-6 lg:px-10">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-2 sm:gap-3">
              <Image
                src="/images/logo-dark.png"
                alt="Unique Industrial Solutions"
                width={56}
                height={56}
                className="h-10 sm:h-14 w-auto rounded-lg"
                priority
              />
              <div className="hidden sm:block">
                <h1 className="text-base sm:text-xl font-bold text-gray-900">
                  Unique Industrial Solutions
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  Employee Management System
                </p>
              </div>
              <div className="block sm:hidden">
                <h1 className="text-sm font-bold text-gray-900">UIS</h1>
                <p className="text-xs text-gray-600">EMS</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 pt-24 sm:pt-28">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl bg-white rounded-2xl overflow-hidden">
            <div className="p-6 sm:p-8 md:p-10">
              <div className="mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  Reset Password
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                  Create a new password for <strong>{userEmail}</strong>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm sm:text-base text-gray-700 font-medium">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 z-10" />
                    <PasswordInput
                      id="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                      className="pl-9 sm:pl-10 h-11 sm:h-12 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-teal-500 transition-all duration-200"
                      required
                      autoComplete="new-password"
                      autoFocus
                    />
                  </div>

                  {/* Password Length Info */}
                  {password && password.length < 6 && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      Password must be at least 6 characters long
                    </p>
                  )}
                  {password && password.length >= 6 && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                      <CheckCircle className="h-3 w-3" />
                      Password meets minimum length requirement
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm sm:text-base text-gray-700 font-medium">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 z-10" />
                    <PasswordInput
                      id="confirmPassword"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError('');
                      }}
                      className="pl-9 sm:pl-10 h-11 sm:h-12 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-teal-500 transition-all duration-200"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Passwords do not match
                    </p>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 sm:p-4 rounded-lg text-xs sm:text-sm flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 sm:h-12 bg-teal-600 hover:bg-teal-700 text-white group shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] text-sm sm:text-base font-medium rounded-lg"
                  disabled={loading || password !== confirmPassword || password.length < 6}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4 sm:h-5 sm:w-5"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Resetting...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Reset Password
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform duration-200" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-xs sm:text-sm text-gray-500">
                  Employee Management System v1.0
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </Card>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
