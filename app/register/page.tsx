'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sparkles, Mail, Lock, User as UserIcon, Building, ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { COMMUNITY_ROLES } from '@/lib/constants';

import { authApi } from '@/lib/api/auth';

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Please provide a valid community email address'),
    community: z.string().min(2, 'Please specify your institution or community'),
    role: z.enum(['student', 'faculty', 'staff', 'visitor'], {
      error: 'Please select a role',
    }),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      community: 'Nexora Institute of Technology',
      role: 'student',
      password: '',
      confirmPassword: '',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const roleMap: Record<string, string> = {
        student: 'USER',
        faculty: 'FACULTY',
        staff: 'STAFF',
        visitor: 'USER',
      };

      const res = await authApi.register({
        name: data.fullName,
        email: data.email,
        password: data.password,
        community_name: data.community,
        role: roleMap[data.role] || 'USER',
      });

      if (res.error) {
        setErrorMsg(res.error);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(56,189,248,0.35)] group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-2xl tracking-wider text-white">NEXORA</span>
          </Link>
          <h2 className="text-xl font-bold text-white">Join Your Community</h2>
          <p className="text-xs text-slate-400 mt-1">
            Create your account to unlock intelligent institutional assistance
          </p>
        </div>

        <GlassCard variant="elevated" className="p-6 sm:p-8 border-white/15 shadow-2xl">
          {isSuccess ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Account Created Successfully</h3>
              <p className="text-xs text-slate-300">
                Initializing your personalized community workspace...
              </p>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <GlassInput
                label="Full Name"
                placeholder="Alex Rivera"
                leftIcon={<UserIcon className="w-4 h-4" />}
                error={errors.fullName?.message}
                {...register('fullName')}
              />

              <GlassInput
                label="Institutional Email"
                type="email"
                placeholder="alex.rivera@nexora.edu"
                leftIcon={<Mail className="w-4 h-4" />}
                error={errors.email?.message}
                {...register('email')}
              />

              <GlassInput
                label="Community / Organization"
                placeholder="Nexora Institute of Technology"
                leftIcon={<Building className="w-4 h-4" />}
                error={errors.community?.message}
                {...register('community')}
              />

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Select Your Community Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COMMUNITY_ROLES.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setValue('role', role.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selectedRole === role.id
                          ? 'bg-sky-500/20 border-sky-400 text-white shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                          : 'bg-slate-900/50 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <span className="block text-xs font-semibold">{role.label}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5 truncate">
                        {role.description}
                      </span>
                    </button>
                  ))}
                </div>
                {errors.role && <p className="text-xs text-red-400 mt-1">{errors.role.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <GlassInput
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-4 h-4" />}
                  error={errors.password?.message}
                  {...register('password')}
                />

                <GlassInput
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
              </div>

              <GlassButton
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-3"
                isLoading={isLoading}
              >
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </GlassButton>
            </form>
            </>
          )}

          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-sky-400 hover:text-sky-300 font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
