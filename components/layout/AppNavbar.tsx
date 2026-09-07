'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Search, ShieldCheck, Bell, LogOut } from 'lucide-react';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { mockCurrentUser } from '@/lib/mock-data';
import { authApi } from '@/lib/api/auth';

export interface AppNavbarProps {
  onOpenMobileMenu?: () => void;
  title?: string;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({ onOpenMobileMenu, title }) => {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(authApi.isAuthenticated());
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nexora_auth_token');
        localStorage.removeItem('nexora_auth_user');
      }
      router.push('/login');
    }
  };
  return (
    <header className="h-14 sm:h-16 px-3.5 sm:px-6 bg-white/85 backdrop-blur-xl border-b border-[rgba(160,50,85,0.18)] flex items-center justify-between z-30 select-none">
      {/* Left Area */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-[#3D2D33] hover:text-[#111111] hover:bg-[#FFE8EE] transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5 text-[#111111]" />
        </button>

        {title ? (
          <h1 className="text-sm sm:text-lg font-bold text-[#111111] tracking-tight truncate">{title}</h1>
        ) : (
          <div className="hidden sm:flex items-center gap-2">
            <GlassBadge variant="primary" size="sm" className="bg-[#FFE8EE] text-[#B82346] border-[#EB4D6E]/40 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#EB4D6E]" />
              <span>{mockCurrentUser.community}</span>
            </GlassBadge>
          </div>
        )}
      </div>

      {/* Right Area */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Quick Search trigger */}
        <div className="relative hidden md:block w-48 lg:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#5C4B52]" />
          <input
            type="text"
            placeholder="Search community..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[rgba(160,50,85,0.22)] bg-white/90 placeholder:text-[#5C4B52] text-[#111111] focus:outline-none focus:border-[#EB4D6E]"
          />
        </div>

        {/* Notifications Icon Button */}
        <GlassButton
          variant="ghost"
          size="icon"
          className="relative text-[#3D2D33] hover:text-[#111111] hover:bg-[#FFE8EE]"
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4 text-[#111111]" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#EB4D6E] shadow-[0_0_8px_rgba(235,77,110,0.8)]" />
        </GlassButton>

        {/* Logout Button */}
        {isLoggedIn && (
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-xs font-bold text-[#B82346] hover:text-[#8E1733] hover:bg-[#FFE2E8] border border-[rgba(160,50,85,0.2)] flex items-center gap-1.5 cursor-pointer px-3 py-1.5"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5 text-[#EB4D6E]" />
            <span className="hidden sm:inline">Logout</span>
          </GlassButton>
        )}
      </div>
    </header>
  );
};
