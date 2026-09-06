'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'elevated' | 'subtle';
  glow?: 'none' | 'cyan' | 'indigo' | 'subtle';
  children: React.ReactNode;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'default', glow = 'none', children, ...props }, ref) => {
    const variantStyles = {
      default: 'glass-card',
      interactive: 'glass-card-interactive cursor-pointer',
      elevated: 'glass-panel-elevated rounded-2xl',
      subtle: 'bg-slate-900/30 backdrop-blur-md border border-white/5 rounded-xl',
    };

    const glowStyles = {
      none: '',
      cyan: 'shadow-[0_0_25px_rgba(56,189,248,0.12)] border-sky-400/20',
      indigo: 'shadow-[0_0_25px_rgba(99,102,241,0.12)] border-indigo-400/20',
      subtle: 'glass-glow-subtle',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'p-5 transition-all duration-300 relative overflow-hidden',
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
