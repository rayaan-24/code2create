'use client';

import React from 'react';
import { Menu, Search, ShieldCheck, Bell } from 'lucide-react';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { mockCurrentUser } from '@/lib/mock-data';

export interface AppNavbarProps {
  onOpenMobileMenu?: () => void;
  title?: string;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({ onOpenMobileMenu, title }) => {
  return (
    <header className="h-16 px-4 sm:px-6 glass-panel border-b border-white/10 flex items-center justify-between z-30">
      {/* Left Area */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {title ? (
          <h1 className="text-base sm:text-lg font-bold text-white truncate">{title}</h1>
        ) : (
          <div className="hidden sm:flex items-center gap-2">
            <GlassBadge variant="outline" size="sm" className="border-sky-400/30 text-sky-300">
              <ShieldCheck className="w-3 h-3 text-sky-400" />
              <span>{mockCurrentUser.community}</span>
            </GlassBadge>
          </div>
        )}
      </div>

      {/* Right Area */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Search trigger */}
        <div className="relative hidden md:block w-48 lg:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search community..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl glass-input placeholder:text-slate-500"
          />
        </div>

        {/* Notifications Icon Button */}
        <GlassButton
          variant="ghost"
          size="icon"
          className="relative text-slate-400 hover:text-white"
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
        </GlassButton>
      </div>
    </header>
  );
};
