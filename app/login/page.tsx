'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sparkles, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassBadge } from '@/components/ui/GlassBadge';

import { authApi } from '@/lib/api/auth';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid community email address'),
  password: z.string().min(6, 'Password must contain at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'alex.rivera@nexora.edu',
      password: 'Student@123456',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const res = await authApi.login(data.email, data.password);
      if (res.error) {
        setAuthError(res.error);
        setIsLoading(false);
        return;
      }
      // If admin, go to /admin; else go to /dashboard
      if (res.data?.user?.role === 'ADMIN' || res.data?.user?.role === 'SUPER_ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoCredentials = (email: string, pass: string) => {
    setValue('email', email);
    setValue('password', pass);
  };

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push('/dashboard');
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FFF8FA] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#EB4D6E]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#EB4D6E] to-[#D43154] flex items-center justify-center text-white shadow-[0_4px_16px_rgba(212,49,84,0.35)] group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-2xl tracking-wider text-[#111111]">NEXORA</span>
          </Link>
          <h2 className="text-xl font-extrabold text-[#111111]">Access Your Community</h2>
          <p className="text-xs text-[#5C4B52] font-medium mt-1">
            Enter your credentials to enter the intelligent workspace
          </p>
        </div>

        {/* Login Card */}
        <GlassCard variant="elevated" className="p-6 sm:p-8 bg-white/95 border-2 border-[rgba(160,50,85,0.22)] shadow-xl shadow-rose-950/5">
          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-950 text-xs font-semibold">
              {authError}
            </div>
          )}

          {/* Quick Demo Credentials */}
          <div className="mb-5 p-3 rounded-xl bg-[#FFF0F4] border border-[rgba(160,50,85,0.2)] space-y-2">
            <div className="text-[11px] font-bold text-[#111111]">Quick Demo Accounts:</div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setDemoCredentials('alex.rivera@nexora.edu', 'Student@123456')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-[rgba(160,50,85,0.22)] text-[#111111] hover:bg-[#FFE2E8] shadow-2xs transition-all"
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('elena.rostova@nexora.edu', 'Faculty@123456')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-[rgba(160,50,85,0.22)] text-[#111111] hover:bg-[#FFE2E8] shadow-2xs transition-all"
              >
                Faculty
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('admin@nexora.edu', 'Admin@123456')}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-[#FFE2E8] border border-[#EB4D6E]/50 text-[#B82346] hover:bg-[#FFD0DC] transition-all font-bold shadow-2xs"
              >
                Admin
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <GlassInput
              label="Community Email"
              type="email"
              placeholder="name@nexora.edu"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="space-y-1">
              <GlassInput
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-[#000000] text-[#5C4B52] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => alert('Password recovery link dispatched to registered email.')}
                  className="text-[11px] text-[#B82346] hover:text-[#8E1733] font-bold hover:underline transition-colors mt-1"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <GlassButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </GlassButton>
          </form>

          {/* Social Sign In Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(160,50,85,0.18)]" />
            </div>
            <span className="relative px-3 bg-white text-[11px] text-[#5C4B52] font-bold uppercase tracking-wider">
              Or continue with
            </span>
          </div>

          <GlassButton
            type="button"
            variant="secondary"
            size="md"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Institutional Google</span>
          </GlassButton>

          <div className="mt-6 text-center text-xs text-[#5C4B52] font-medium">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[#B82346] hover:text-[#8E1733] font-bold hover:underline">
              Create account
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
