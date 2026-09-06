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

  const isAdmin = mockCurrentUser.role === 'admin' || true; // visually accessible for prototype

  return (
    <aside className="w-64 h-full flex flex-col justify-between p-4 glass-panel border-r border-white/10 bg-slate-950/70 select-none">
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between px-2 py-3 mb-4">
          <Link href="/" className="flex items-center gap-2.5 group" onClick={onCloseMobile}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(56,189,248,0.3)] group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-wider text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-sky-300">
                NEXORA
              </span>
              <span className="block text-[10px] text-sky-400 font-medium tracking-wide">
                COMMUNITY AI
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            <span>Live</span>
          </div>
        </div>

        {/* Quick New Chat Button */}
        <Link href="/chat" onClick={onCloseMobile} className="block mb-5">
          <GlassButton variant="primary" size="md" className="w-full justify-start text-xs font-semibold shadow-[0_0_18px_rgba(56,189,248,0.2)]">
            <Plus className="w-4 h-4 mr-2" />
            New Conversation
          </GlassButton>
        </Link>

        {/* Primary Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-400/30 shadow-[0_0_15px_rgba(56,189,248,0.1)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Conditional Admin Panel Link */}
          {isAdmin && (
            <div className="pt-2 mt-2 border-t border-white/10">
              <Link
                href="/admin"
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  pathname?.startsWith('/admin')
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-400/30'
                    : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/5'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Admin Console</span>
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* User Footer Profile Capsule */}
      <div className="pt-4 border-t border-white/10">
        <Link
          href="/profile"
          onClick={onCloseMobile}
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-800 border border-white/10 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mockCurrentUser.avatarUrl}
              alt={mockCurrentUser.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate group-hover:text-sky-300">
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
