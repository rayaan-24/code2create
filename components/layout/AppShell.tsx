'use client';

import React, { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppNavbar } from './AppNavbar';
import { X } from 'lucide-react';

export interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  hideNavbar?: boolean;
  noScroll?: boolean;
}

const MobileNavContext = React.createContext<{
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
}>({
  openMobileMenu: () => {},
  closeMobileMenu: () => {},
});

export const useMobileMenu = () => React.useContext(MobileNavContext);

export const AppShell: React.FC<AppShellProps> = ({
  children,
  title,
  hideNavbar = false,
  noScroll = false,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const shouldPreventScroll = noScroll || hideNavbar;

  return (
    <MobileNavContext.Provider
      value={{
        openMobileMenu: () => setMobileMenuOpen(true),
        closeMobileMenu: () => setMobileMenuOpen(false),
      }}
    >
      <div className="flex h-screen w-screen overflow-hidden bg-[#FFF8FA] text-[#171717] relative">
        {/* Subtle Ambient Spatial Glows */}
        <div 
          className="pointer-events-none absolute -top-40 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-[#F4728A]/15 to-[#FF8FA3]/5 blur-3xl"
          aria-hidden="true"
        />
        <div 
          className="pointer-events-none absolute -bottom-40 right-10 w-96 h-96 rounded-full bg-gradient-to-tl from-[#FBC5D0]/20 to-transparent blur-3xl"
          aria-hidden="true"
        />

        {/* Desktop Persistent Sidebar */}
        <div className="hidden lg:block h-full flex-shrink-0 z-40">
          <AppSidebar />
        </div>

        {/* Mobile Sidebar Slide-out Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden animate-in fade-in duration-200">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="relative w-72 max-w-[85vw] h-full z-10 flex flex-col bg-white shadow-2xl">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-xl text-[#5C4B52] hover:text-[#111111] bg-white border border-[rgba(160,50,85,0.22)] shadow-xs z-20 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
              <AppSidebar onCloseMobile={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
          {!hideNavbar && (
            <AppNavbar
              title={title}
              onOpenMobileMenu={() => setMobileMenuOpen(true)}
            />
          )}
          <main
            className={`flex-1 min-h-0 relative ${
              shouldPreventScroll
                ? 'h-full overflow-hidden flex flex-col'
                : 'overflow-y-auto overflow-x-hidden'
            }`}
          >
            {children}
          </main>
        </div>
      </div>
    </MobileNavContext.Provider>
  );
};
