'use client';

import React from 'react';
import { ProcedureItem } from '@/lib/types';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { CheckCircle2, Clock, MapPin, Building2, ExternalLink, Navigation } from 'lucide-react';
import Link from 'next/link';

export interface ProcedureCardProps {
  procedure: ProcedureItem;
  onNavigate?: () => void;
}

export const ProcedureCard: React.FC<ProcedureCardProps> = ({ procedure, onNavigate }) => {
  return (
    <GlassCard variant="elevated" className="mt-3 border-sky-400/20 max-w-xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GlassBadge variant="primary" size="sm">
              Official Procedure
            </GlassBadge>
            <span className="text-xs text-slate-400">{procedure.category}</span>
          </div>
          <h4 className="text-base font-semibold text-white">{procedure.title}</h4>
        </div>
      </div>

      {/* Office & Location Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 text-xs border-b border-white/10">
        <div className="flex items-start gap-2 text-slate-300">
          <Building2 className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-400 block text-[11px]">Responsible Office</span>
            <span className="font-medium text-slate-200">{procedure.responsibleOffice}</span>
          </div>
        </div>

        <div className="flex items-start gap-2 text-slate-300">
          <Clock className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-400 block text-[11px]">Working Hours</span>
            <span className="font-medium text-slate-200">{procedure.hours}</span>
          </div>
        </div>

        <div className="sm:col-span-2 flex items-start gap-2 text-slate-300">
          <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-400 block text-[11px]">Physical Location</span>
            <span className="font-medium text-slate-200">{procedure.location}</span>
          </div>
        </div>
      </div>

      {/* Required Documents */}
      {procedure.requiredDocuments.length > 0 && (
        <div className="py-3 border-b border-white/10">
          <h5 className="text-xs font-semibold text-sky-300 uppercase tracking-wider mb-2">
            Required Documents
          </h5>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {procedure.requiredDocuments.map((doc, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Steps */}
      {procedure.steps.length > 0 && (
        <div className="py-3">
          <h5 className="text-xs font-semibold text-sky-300 uppercase tracking-wider mb-2">
            Protocol Steps
          </h5>
          <ol className="space-y-2 text-xs text-slate-300">
            {procedure.steps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[10px] font-bold border border-sky-400/30">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
        <Link href={`/map?dest=${encodeURIComponent(procedure.location)}`} className="inline-flex">
          <GlassButton size="sm" variant="primary">
            <Navigation className="w-3.5 h-3.5 mr-1.5" />
            Navigate to Office
          </GlassButton>
        </Link>
        <GlassButton size="sm" variant="outline" onClick={onNavigate}>
          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
          View Source
        </GlassButton>
      </div>
    </GlassCard>
  );
};
