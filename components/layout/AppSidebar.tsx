'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  MapPin,
  Users,
  Compass,
  User as UserIcon,
  Settings,
  ShieldAlert,
  Sparkles,
  Plus,
  Radio,
} from 'lucide-react';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { authApi } from '@/lib/api/auth';
import { mockCurrentUser } from '@/lib/mock-data';

export interface AppSidebarProps {
  onCloseMobile?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ onCloseMobile }) => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'AI Assistant', href: '/chat', icon: MessageSquare },
    { label: 'Indoor Map', href: '/map', icon: MapPin },
    { label: 'People Directory', href: '/people', icon: Users },
    { label: 'Services', href: '/services', icon: Compass },
    { label: 'Profile', href: '/profile', icon: UserIcon },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const currentUser = authApi.getCurrentUser() || mockCurrentUser;
  const isAdmin = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN');

  return (
    <aside className="w-64 h-full flex flex-col justify-between p-4 bg-white/75 backdrop-blur-2xl border-r border-[rgba(180,80,110,0.12)] shadow-[4px_0_24px_rgba(244,114,138,0.03)] select-none">
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between px-2 py-3 mb-4">
          <Link href="/" className="flex items-center gap-2.5 group" onClick={onCloseMobile}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#F4728A] to-[#E85D77] flex items-center justify-center text-white shadow-[0_4px_16px_rgba(244,114,138,0.3)] group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-wider text-[#171717]">
                NEXORA
              </span>
              <span className="block text-[10px] text-[#E85D77] font-semibold tracking-wide">
                COMMUNITY AI
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
            <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
            <span>Active</span>
          </div>
        </div>

        {/* Quick New Chat Button */}
        <Link href="/chat" onClick={onCloseMobile} className="block mb-5">
          <GlassButton variant="primary" size="md" className="w-full justify-start text-xs font-semibold shadow-[0_4px_16px_rgba(244,114,138,0.25)]">
            <Plus className="w-4 h-4 mr-2 shrink-0" />
            New Conversation
          </GlassButton>
        </Link>

        {/* Primary Navigation Links */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#FFE2E8] text-[#B82346] border border-[#EB4D6E]/40 shadow-xs'
                    : 'text-[#2D2226] hover:text-[#000000] hover:bg-[#FFF0F4] border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#B82346]' : 'text-[#5C4B52]'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Conditional Admin Panel Link */}
          {isAdmin && (
            <div className="pt-2 mt-2 border-t border-[rgba(160,50,85,0.15)]">
              <Link
                href="/admin"
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  pathname?.startsWith('/admin')
                    ? 'bg-amber-100/90 text-amber-950 border border-amber-300 shadow-xs'
                    : 'text-amber-900 hover:text-amber-950 hover:bg-amber-100/60'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Admin Console</span>
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* User Footer Profile Capsule */}
      <div className="pt-4 border-t border-[rgba(180,80,110,0.1)]">
        <Link
          href="/profile"
          onClick={onCloseMobile}
          className="flex items-center gap-3 p-2 rounded-2xl bg-[#FFF5F7] border border-[rgba(180,80,110,0.1)] hover:border-[#F4728A]/30 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#FFEBF0] border border-[rgba(180,80,110,0.15)] flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mockCurrentUser.avatarUrl}
              alt={mockCurrentUser.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#171717] truncate group-hover:text-[#E85D77]">
              {mockCurrentUser.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <GlassBadge variant="primary" size="sm" className="text-[9px] px-1.5 py-0">
                {mockCurrentUser.role.toUpperCase()}
              </GlassBadge>
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
};
