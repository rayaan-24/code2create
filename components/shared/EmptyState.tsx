'use client';

import React from 'react';
import { LucideIcon, Search } from 'lucide-react';
import { GlassButton } from '../ui/GlassButton';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Search,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl glass-card border-dashed border-white/10 my-4">
      <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400 mb-4 shadow-[0_0_20px_rgba(56,189,248,0.1)]">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <GlassButton variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </GlassButton>
      )}
    </div>
  );
};
