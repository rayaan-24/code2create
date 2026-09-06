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
    <div className="min-h-screen flex items-center justify-center p-4 py-12 bg-[#FFF8FA] relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#EB4D6E]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#EB4D6E] to-[#D43154] flex items-center justify-center text-white shadow-[0_4px_16px_rgba(212,49,84,0.35)] group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-2xl tracking-wider text-[#111111]">NEXORA</span>
          </Link>
          <h2 className="text-xl font-extrabold text-[#111111]">Join Your Community</h2>
          <p className="text-xs text-[#5C4B52] font-medium mt-1">
            Create your account to unlock intelligent institutional assistance
          </p>
        </div>

        <GlassCard variant="elevated" className="p-6 sm:p-8 bg-white/95 border-2 border-[rgba(160,50,85,0.22)] shadow-xl shadow-rose-950/5">
          {isSuccess ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[#111111]">Account Created Successfully</h3>
              <p className="text-xs text-[#5C4B52] font-medium">
                Initializing your personalized community workspace...
              </p>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-950 text-xs font-semibold">
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
                <label className="block text-xs font-bold text-[#111111]">
                  Select Your Community Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COMMUNITY_ROLES.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setValue('role', role.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedRole === role.id
                          ? 'bg-[#FFE2E8] border-2 border-[#EB4D6E] text-[#B82346] shadow-xs'
                          : 'bg-white border border-[rgba(160,50,85,0.2)] text-[#111111] hover:border-[#EB4D6E] hover:bg-[#FFF8FA]'
                      }`}
                    >
                      <span className="block text-xs font-bold">{role.label}</span>
                      <span className="block text-[10px] text-[#5C4B52] font-medium mt-0.5 truncate">
                        {role.description}
                      </span>
                    </button>
                  ))}
                </div>
                {errors.role && <p className="text-xs font-semibold text-red-600 mt-1">{errors.role.message}</p>}
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
                      className="hover:text-[#000000] text-[#5C4B52] transition-colors"
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

          <div className="mt-6 text-center text-xs text-[#5C4B52] font-medium">
            Already have an account?{' '}
            <Link href="/login" className="text-[#B82346] hover:text-[#8E1733] font-bold hover:underline">
              Sign in
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
