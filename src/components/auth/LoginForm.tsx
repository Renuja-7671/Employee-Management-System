// src/components/auth/LoginForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Lock, Mail, ArrowRight, Shield, Clock, Users, Home, AlertCircle } from 'lucide-react';
import { loginUser } from '@/lib/api/auth';
import { toast } from 'sonner';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await loginUser(email, password);

      if (result.success) {
        toast.success('Login successful!');

        // Small delay to ensure localStorage is set before navigation
        await new Promise(resolve => setTimeout(resolve, 100));

        // Redirect based on role with hard navigation to ensure clean state
        if (result.profile?.role === 'ADMIN') {
          window.location.href = '/admin/dashboard';
        } else {
          window.location.href = '/employee/dashboard';
        }
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
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
              onClick={() => router.push('/')}
              variant="outline"
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 h-9 sm:h-10 text-sm sm:text-base"
            >
              <Home className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Home</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex pt-20 sm:pt-24 md:pt-28">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 p-8 xl:p-12 flex-col justify-between relative overflow-hidden">
          {/* Background Image */}
          <Image
            src="/images/worker.jpg"
            alt="Industrial Worker"
            fill
            sizes="50vw"
            className="object-cover"
            priority
          />

          {/* Dark Overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-900/90 via-cyan-900/85 to-teal-800/90" />

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <Image
                src="/images/logo-light.png"
                alt="Unique Industrial Solutions"
                width={80}
                height={80}
                className="h-16 xl:h-20 w-auto rounded-lg"
              />
              <div>
                <h1 className="text-white text-2xl xl:text-3xl font-bold leading-tight">
                  Unique Industrial
                </h1>
                <p className="text-teal-100 text-base xl:text-lg">Solutions</p>
              </div>
            </div>

            <div className="mt-12 xl:mt-16 space-y-4 xl:space-y-6">
              <h2 className="text-white text-3xl xl:text-4xl font-bold leading-tight">
                Welcome to Your
                <br />
                Employee Portal
              </h2>
              <p className="text-teal-100 text-base xl:text-lg max-w-md leading-relaxed">
                Streamline your workforce management with our comprehensive
                employee management system.
              </p>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 gap-4">
            <FeatureCard
              icon={Shield}
              title="Secure Access"
              description="Role-based authentication system"
            />
            <FeatureCard
              icon={Clock}
              title="Real-time Tracking"
              description="Monitor attendance and leave requests"
            />
            <FeatureCard
              icon={Users}
              title="Team Management"
              description="Complete employee management solution"
            />
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-gray-50 to-gray-100">
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
              <div className="text-center">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                  Unique Industrial Solutions
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  Employee Management System
                </p>
              </div>
            </div>

            <Card className="border-0 shadow-2xl bg-white rounded-2xl overflow-hidden hover:shadow-3xl transition-shadow duration-300">
              <div className="p-6 sm:p-8 md:p-10">
                <div className="mb-6 sm:mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    Sign In
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    Enter your credentials to access your account
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
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm sm:text-base text-gray-700 font-medium">
                      Password
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
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 sm:p-4 rounded-lg text-xs sm:text-sm flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="leading-relaxed">{error}</p>
                        {error.includes('Invalid') && (
                          <p className="mt-2 text-xs text-red-600 leading-relaxed">
                            Don&apos;t have an account? Contact your administrator to
                            get set up, or use the Admin Setup link in the
                            footer to create the initial admin account.
                          </p>
                        )}
                      </div>
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
                        Signing in...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Sign In
                        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform duration-200" />
                      </span>
                    )}
                  </Button>
                </form>

                <div className="mt-4 sm:mt-6 text-center">
                  <p className="text-xs sm:text-sm text-gray-500">
                    Employee Management System v1.0
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Feature Card Component
interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-lg xl:rounded-xl p-3 xl:p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
      <div className="bg-white/20 rounded-lg p-2 group-hover:bg-white/30 transition-colors duration-300">
        <Icon className="h-5 w-5 xl:h-6 xl:w-6 text-white" />
      </div>
      <div>
        <h3 className="text-white font-semibold text-sm xl:text-base">{title}</h3>
        <p className="text-teal-100 text-xs xl:text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}