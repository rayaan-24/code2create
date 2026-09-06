'use client';

import React, { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppNavbar } from './AppNavbar';
import { X } from 'lucide-react';

export interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  hideNavbar?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  title,
  hideNavbar = false,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#06080d]">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block h-full flex-shrink-0 z-40">
        <AppSidebar />
      </div>

      {/* Mobile Sidebar Slide-out Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 h-full z-10 flex flex-col">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900/80 border border-white/10 z-20"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
            <AppSidebar onCloseMobile={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {!hideNavbar && (
          <AppNavbar
            title={title}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />
        )}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
};
