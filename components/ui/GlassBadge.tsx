'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface GlassBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md';
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-[#FFEBF0] text-[#3D2D33] border-[rgba(160,50,85,0.22)] font-medium',
    primary: 'bg-[#FFE2E8] text-[#B82346] border-[#EB4D6E]/40 font-bold',
    success: 'bg-emerald-100/80 text-emerald-900 border-emerald-300 font-semibold',
    warning: 'bg-amber-100/80 text-amber-950 border-amber-300 font-semibold',
    error: 'bg-rose-100/80 text-rose-950 border-rose-300 font-semibold',
    outline: 'bg-white/95 text-[#111111] border-[rgba(160,50,85,0.28)] font-semibold shadow-2xs',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border backdrop-blur-md select-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
