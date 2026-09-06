'use client';

import React from 'react';
import { SourceItem } from '@/lib/types';
import { ShieldCheck, FileText } from 'lucide-react';

export interface SourceCardProps {
  source: SourceItem;
}

export const SourceCard: React.FC<SourceCardProps> = ({ source }) => {
  const confidencePercent = Math.round(source.confidenceScore * 100);

  return (
    <div className="mt-2 flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-white/5 backdrop-blur-sm text-xs text-slate-400">
      <div className="flex items-center gap-2 truncate">
        <FileText className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
        <span className="truncate text-slate-300 font-medium">{source.title}</span>
        {source.pageOrSection && (
          <span className="text-[11px] text-slate-500">({source.pageOrSection})</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 text-emerald-400 text-[11px] font-medium">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Verified ({confidencePercent}%)</span>
      </div>
    </div>
  );
};
