// src/components/landing/LandingPage.tsx

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/PasswordInput';
import {
  Shield,
  Clock,
  Users,
  TrendingUp,
  FileText,
  Bell,
  ArrowRight,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';

const SETUP_PASSWORD = process.env.NEXT_PUBLIC_SETUP_PASSWORD || 'UIS_ADMIN_2025';

export function LandingPage() {
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const isLoggedIn = !!user && !!profile;

  const handlePasswordSubmit = () => {
    if (password === SETUP_PASSWORD) {
      setShowPasswordDialog(false);
      setPassword('');
      setPasswordError('');
      router.push('/setup');
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
  };

  const handleDialogClose = () => {
    setShowPasswordDialog(false);
    setPassword('');
    setPasswordError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navbar */}
      <nav className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 w-[96%] sm:w-[95%] max-w-7xl bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-xl sm:rounded-2xl shadow-2xl z-50 transition-all duration-300">
        <div className="px-3 sm:px-6 lg:px-10">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo Section */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Image
                src="/images/logo.jpg"
                alt="Unique Industrial Solutions"
                width={56}
                height={56}
                className="h-10 sm:h-14 w-auto rounded-lg"
                priority
              />
              <div className="hidden sm:block">
                <h1 className="text-base sm:text-xl font-bold text-white leading-tight">
                  Unique Industrial Solutions
                </h1>
                <p className="text-xs sm:text-sm text-teal-400">
                  Employee Management System
                </p>
              </div>
              <div className="block sm:hidden">
                <h1 className="text-sm font-bold text-white">UIS</h1>
                <p className="text-xs text-teal-400">EMS</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-4">
              {isLoggedIn ? (
                <>
                  <div className="hidden md:block text-right mr-2">
                    <p className="text-sm font-medium text-white">
                      {profile.name}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">
                      {profile.role.toLowerCase()}
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push(`/${profile.role.toLowerCase()}/dashboard`)}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-3 sm:px-6 text-sm sm:text-base h-9 sm:h-10"
                  >
                    <span className="hidden sm:inline">Go to Dashboard</span>
                    <span className="sm:hidden">Dashboard</span>
                    <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    onClick={logout}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white px-3 sm:px-4 text-sm sm:text-base h-9 sm:h-10 hidden sm:flex"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => router.push('/login')}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 sm:px-6 text-sm sm:text-base h-9 sm:h-10"
                >
                  Login
                  <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-20 sm:pt-24 md:pt-28 relative">
        <div className="relative h-[400px] sm:h-[500px] md:h-[600px] lg:h-[650px] overflow-hidden rounded-b-3xl sm:rounded-b-[3rem]">
          {/* Hero Image */}
          <Image
            src="/images/hero.jpg"
            alt="Unique Industrial Solutions"
            fill
            className="object-cover"
            priority
          />

          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30 sm:from-black/60 sm:via-black/40 sm:to-transparent" />

          {/* Hero Content */}
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="max-w-2xl">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
                  Welcome to Your
                  <span className="block text-teal-400 mt-1 sm:mt-2">
                    Employee Portal
                  </span>
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl text-teal-100 mb-3 sm:mb-4 font-semibold">
                  Safety for Better Tomorrow
                </p>
                <p className="text-base sm:text-lg md:text-xl text-gray-200 mb-6 sm:mb-8 leading-relaxed">
                  Access your leave requests, attendance records, and manage
                  your work schedule all in one place.
                </p>
                {isLoggedIn ? (
                  <Button
                    onClick={() => router.push(`/${profile.role.toLowerCase()}/dashboard`)}
                    size="lg"
                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => router.push('/login')}
                    size="lg"
                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Employee Login
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
              Your Complete Workplace Portal
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Everything you need to manage your work life at Unique Industrial
              Solutions
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature Cards */}
            <FeatureCard
              icon={Shield}
              title="Secure Access"
              description="Your personal employee portal with secure login. All your work information protected and accessible 24/7."
              gradient="from-teal-50 to-cyan-50"
              border="border-teal-100"
              iconBg="bg-teal-600"
            />

            <FeatureCard
              icon={FileText}
              title="Easy Leave Requests"
              description="Apply for annual, casual, and medical leave online. Track your leave balance and approval status in real-time."
              gradient="from-blue-50 to-indigo-50"
              border="border-blue-100"
              iconBg="bg-blue-600"
            />

            <FeatureCard
              icon={Clock}
              title="Track Your Attendance"
              description="Clock in and out easily, view your attendance history, and access your detailed work hours reports."
              gradient="from-purple-50 to-pink-50"
              border="border-purple-100"
              iconBg="bg-purple-600"
            />

            <FeatureCard
              icon={Users}
              title="Your Profile"
              description="Manage your personal information, update contact details, and stay connected with your team members."
              gradient="from-orange-50 to-red-50"
              border="border-orange-100"
              iconBg="bg-orange-600"
            />

            <FeatureCard
              icon={TrendingUp}
              title="Your Reports"
              description="View your attendance summaries, leave history, and download reports for your records anytime."
              gradient="from-green-50 to-emerald-50"
              border="border-green-100"
              iconBg="bg-green-600"
            />

            <FeatureCard
              icon={Bell}
              title="Stay Informed"
              description="Receive instant notifications for leave approvals, cover requests, birthday wishes, and important company updates."
              gradient="from-yellow-50 to-amber-50"
              border="border-yellow-100"
              iconBg="bg-yellow-600"
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-700 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
            {isLoggedIn
              ? `Welcome back, ${profile.name}!`
              : 'Access Your Employee Portal'}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-teal-100 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
            {isLoggedIn
              ? 'Click below to access your dashboard and manage your work activities.'
              : 'For Unique Industrial Solutions team members: Login to manage your leave, attendance, and access all employee services.'}
          </p>
          {isLoggedIn ? (
            <Button
              onClick={() => router.push(`/${profile.role.toLowerCase()}/dashboard`)}
              size="lg"
              className="bg-white text-teal-600 hover:bg-gray-100 px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          ) : (
            <Button
              onClick={() => router.push('/login')}
              size="lg"
              className="bg-white text-teal-600 hover:bg-gray-100 px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              Employee Login
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Image
                src="/images/logo.jpg"
                alt="Unique Industrial Solutions"
                width={48}
                height={48}
                className="h-10 sm:h-12 w-auto rounded-lg"
              />
              <div className="text-center sm:text-left">
                <p className="font-bold text-white text-sm sm:text-base">
                  Unique Industrial Solutions (PVT) LTD
                </p>
                <p className="text-xs sm:text-sm text-teal-400">
                  Safety for Better Tomorrow
                </p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-xs sm:text-sm text-gray-400">
                © 2025 Unique Industrial Solutions (PVT) LTD. All rights
                reserved.
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Employee Portal - Internal Use Only
              </p>
              <button
                onClick={() => setShowPasswordDialog(true)}
                className="text-xs text-gray-600 hover:text-teal-400 mt-2 transition-colors inline-flex items-center gap-1"
              >
                <Settings className="h-3 w-3" />
                Admin Setup
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Password Dialog */}
      <AlertDialog open={showPasswordDialog} onOpenChange={handleDialogClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Admin Setup Access</AlertDialogTitle>
            <AlertDialogDescription>
              Please enter the setup password to access the admin setup page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="setup-password">Password</Label>
            <PasswordInput
              id="setup-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePasswordSubmit();
                }
              }}
              placeholder="Enter setup password"
              className="mt-2"
            />
            {passwordError && (
              <p className="text-sm text-red-600 mt-2">{passwordError}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDialogClose}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handlePasswordSubmit}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Feature Card Component
interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
  border: string;
  iconBg: string;
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient,
  border,
  iconBg,
}: FeatureCardProps) {
  return (
    <div
      className={`bg-gradient-to-br ${gradient} rounded-xl sm:rounded-2xl p-6 sm:p-8 border ${border} hover:shadow-xl transition-all duration-300 hover:scale-105 group`}
    >
      <div className={`${iconBg} rounded-lg sm:rounded-xl p-2.5 sm:p-3 w-fit mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">{title}</h3>
      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}