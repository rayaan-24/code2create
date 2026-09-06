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
    <div className="mt-2 flex items-center justify-between p-2.5 rounded-xl bg-white/70 border border-[rgba(180,80,110,0.14)] hover:bg-white transition-all text-xs text-[#7A696E] shadow-2xs">
      <div className="flex items-center gap-2 truncate">
        <FileText className="w-3.5 h-3.5 text-[#E85D77] flex-shrink-0" />
        <span className="truncate text-[#2A2023] font-medium">{source.title}</span>
        {source.pageOrSection && (
          <span className="text-[11px] text-[#9C8C91]">({source.pageOrSection})</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-200/60 text-[11px] font-medium">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Verified ({confidencePercent}%)</span>
      </div>
    </div>
  );
};
