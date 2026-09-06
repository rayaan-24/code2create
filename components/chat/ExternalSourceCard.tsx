'use client';

import React from 'react';
import { ExternalSourceItem } from '@/lib/types';
import { Globe, ExternalLink, ShieldCheck } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassBadge } from '../ui/GlassBadge';

export interface ExternalSourceCardProps {
  source: ExternalSourceItem;
}

export const ExternalSourceCard: React.FC<ExternalSourceCardProps> = ({ source }) => {
  return (
    <div className="p-3 rounded-xl bg-slate-900/60 border border-indigo-500/20 hover:border-indigo-400/40 transition-all text-xs space-y-1.5 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
          <span className="font-semibold text-slate-200 truncate">{source.title}</span>
        </div>
        <GlassBadge variant="outline" size="sm" className="border-indigo-500/30 text-indigo-300 text-[10px]">
          External Web
        </GlassBadge>
      </div>

      <p className="text-slate-300/90 text-[11px] leading-relaxed line-clamp-2">
        {source.snippet}
      </p>

      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
        <span className="text-slate-400 truncate">Source: {source.source}</span>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors font-medium flex-shrink-0"
        >
          <span>Open Source</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </div>
  );
};
