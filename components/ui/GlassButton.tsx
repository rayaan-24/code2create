'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4728A]/40 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none cursor-pointer';

    const variants = {
      primary:
        'bg-gradient-to-r from-[#EB4D6E] to-[#D43154] hover:from-[#D43154] hover:to-[#B82346] text-white font-semibold shadow-[0_4px_20px_rgba(212,49,84,0.35)] border border-white/30 rounded-xl',
      secondary:
        'bg-white hover:bg-[#FFF2F5] text-[#111111] font-semibold border border-[rgba(160,50,85,0.22)] backdrop-blur-md shadow-xs rounded-xl hover:shadow-[0_4px_16px_rgba(235,77,110,0.12)]',
      outline:
        'border border-[rgba(160,50,85,0.28)] hover:border-[#EB4D6E] hover:bg-[#FFF2F5] text-[#111111] font-semibold rounded-xl bg-white/70 backdrop-blur-sm',
      ghost:
        'hover:bg-[#FFE2E8] text-[#171717] hover:text-[#000000] font-medium rounded-lg',
      danger:
        'bg-red-600 hover:bg-red-700 text-white font-semibold border border-red-700 rounded-xl shadow-sm',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-6 py-3 gap-2.5 rounded-2xl',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2 shrink-0" />}
        {children}
      </button>
    );
  }
);

GlassButton.displayName = 'GlassButton';
