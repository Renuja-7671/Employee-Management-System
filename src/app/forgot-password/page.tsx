// src/app/forgot-password/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Mail, ArrowLeft, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        toast.success('Password reset email sent!');
      } else {
        setError(data.error || 'Failed to send reset email. Please try again.');
        toast.error('Failed to send reset email');
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

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

            <Button
              onClick={() => router.push('/login')}
              variant="outline"
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 h-9 sm:h-10 text-sm sm:text-base"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Back to Login</span>
              <span className="sm:hidden">Login</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 pt-24 sm:pt-28">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-6 sm:mb-8">
            <Image
              src="/images/logo-dark.png"
              alt="Unique Industrial Solutions"
              width={80}
              height={80}
              className="h-16 sm:h-20 w-auto rounded-lg mb-3"
            />
          </div>

          <Card className="border-0 shadow-2xl bg-white rounded-2xl overflow-hidden hover:shadow-3xl transition-shadow duration-300">
            <div className="p-6 sm:p-8 md:p-10">
              {!success ? (
                <>
                  <div className="mb-6 sm:mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                      Forgot Password?
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600">
                      No worries! Enter your email and we'll send you a link to reset your password.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm sm:text-base text-gray-700 font-medium">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setError('');
                          }}
                          className="pl-9 sm:pl-10 h-11 sm:h-12 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-teal-500 transition-all duration-200"
                          required
                          autoComplete="email"
                          autoFocus
                        />
                      </div>
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
                      disabled={loading}
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
                          Sending...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Send Reset Link
                          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform duration-200" />
                        </span>
                      )}
                    </Button>
                  </form>

                  <div className="mt-6 text-center">
                    <Link
                      href="/login"
                      className="text-sm text-teal-600 hover:text-teal-700 font-medium hover:underline transition-colors duration-200 inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to Login
                    </Link>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                    Check Your Email
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 mb-6">
                    We've sent a password reset link to <strong>{email}</strong>
                  </p>
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-sm mb-6">
                    <p className="font-medium mb-1">What's next?</p>
                    <ol className="text-left space-y-1 ml-4 list-decimal">
                      <li>Check your email inbox (and spam folder)</li>
                      <li>Click the reset link in the email</li>
                      <li>Create your new password</li>
                      <li>Log in with your new password</li>
                    </ol>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-xs mb-6">
                    <p className="font-medium">⏰ The link expires in 1 hour for security reasons.</p>
                  </div>
                  <div className="space-y-3">
                    <Button
                      onClick={() => router.push('/login')}
                      className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      Back to Login
                    </Button>
                    <Button
                      onClick={() => {
                        setSuccess(false);
                        setEmail('');
                      }}
                      variant="outline"
                      className="w-full h-11"
                    >
                      Send Another Email
                    </Button>
                  </div>
                </div>
              )}

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
