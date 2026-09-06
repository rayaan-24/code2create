'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'elevated' | 'subtle';
  glow?: 'none' | 'rose' | 'cyan' | 'indigo' | 'subtle';
  children: React.ReactNode;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'default', glow = 'none', children, ...props }, ref) => {
    const variantStyles = {
      default: 'glass-card',
      interactive: 'glass-card-interactive cursor-pointer',
      elevated: 'glass-panel-elevated rounded-2xl',
      subtle: 'bg-white/60 backdrop-blur-md border border-[rgba(180,80,110,0.08)] rounded-2xl shadow-sm',
    };

    const glowStyles = {
      none: '',
      rose: 'shadow-[0_8px_30px_rgba(244,114,138,0.15)] border-[#F4728A]/30',
      cyan: 'shadow-[0_8px_30px_rgba(244,114,138,0.15)] border-[#F4728A]/30', // mapped gracefully
      indigo: 'shadow-[0_8px_30px_rgba(232,93,119,0.15)] border-[#E85D77]/30',
      subtle: 'shadow-[0_4px_20px_rgba(244,114,138,0.08)] border-[rgba(180,80,110,0.12)]',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'p-5 transition-all duration-300 relative overflow-hidden text-[#171717]',
          variantStyles[variant],
          glowStyles[glow],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
