'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import {
  User as UserIcon,
  Mail,
  Building,
  GraduationCap,
  Shield,
  Settings,
  Calendar,
  Volume2,
  Bell,
  CheckCircle,
} from 'lucide-react';
import { usersApi } from '@/lib/api/users';
import { User } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await usersApi.getCurrentUser();
        if (res.data) {
          setUser(res.data);
        }
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  return (
    <AppShell title="Profile">
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {error && <ErrorBanner message={error} />}

        {isLoading || !user ? (
          <LoadingSkeleton count={4} />
        ) : (
          <>
            {/* Profile Overview Card */}
            <GlassCard variant="elevated" className="p-6 sm:p-8 bg-white/95 border-2 border-[rgba(160,50,85,0.22)] shadow-sm">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl overflow-hidden bg-[#FFE2E8] border-2 border-[rgba(160,50,85,0.25)] shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                    <h2 className="text-xl sm:text-2xl font-black text-[#111111]">{user.name}</h2>
                    <GlassBadge variant="primary" size="md">
                      {user.role.toUpperCase()}
                    </GlassBadge>
                  </div>

                  <p className="text-sm text-[#B82346] font-bold">{user.department}</p>
                  <p className="text-xs text-[#5C4B52] font-semibold mt-1">{user.community}</p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-[#111111] font-medium mt-4 pt-4 border-t border-[rgba(160,50,85,0.12)]">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#EB4D6E]" />
                      <span>{user.email}</span>
                    </div>

                    {user.year && (
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-[#EB4D6E]" />
                        <span>{user.year}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#EB4D6E]" />
                      <span>Joined {formatDate(user.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <Link href="/settings">
                    <GlassButton variant="outline" size="sm">
                      <Settings className="w-3.5 h-3.5 mr-1.5" />
                      Edit Settings
                    </GlassButton>
                  </Link>
                </div>
              </div>
            </GlassCard>

            {/* Academic Credentials & Verification Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GlassCard variant="default" className="p-5 border-[rgba(160,50,85,0.2)] bg-white/95 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 text-[#EB4D6E]">
                  <Shield className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Institutional Verification
                  </h3>
                </div>

                <p className="text-xs text-[#2D2226] leading-relaxed font-normal">
                  Your identity has been authenticated against the community directory. All campus knowledge and procedure accesses are active.
                </p>

                <div className="flex items-center gap-2">
                  <GlassBadge variant="success" size="sm">
                    Active RFID & Biometrics Verified
                  </GlassBadge>
                </div>
              </GlassCard>

              {/* Preferences Preview */}
              <GlassCard variant="default" className="p-5 border-[rgba(160,50,85,0.2)] bg-white/95 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 text-[#EB4D6E]">
                  <Volume2 className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Voice & Speech Mode
                  </h3>
                </div>

                <p className="text-xs text-[#2D2226] leading-relaxed font-normal">
                  Speech model set to <span className="text-[#111111] font-bold">{user.preferences.voiceModel}</span>. Hands-free audio interaction enabled.
                </p>

                <div className="flex items-center gap-2">
                  <GlassBadge variant="primary" size="sm">
                    {user.preferences.language}
                  </GlassBadge>
                </div>
              </GlassCard>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
