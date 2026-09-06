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
    <GlassCard variant="elevated" className="mt-3 border-2 border-[rgba(160,50,85,0.24)] bg-white max-w-xl shadow-md shadow-rose-950/5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[rgba(160,50,85,0.18)] pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GlassBadge variant="primary" size="sm">
              Official Procedure
            </GlassBadge>
            <span className="text-xs text-[#5C4B52] font-semibold">{procedure.category}</span>
          </div>
          <h4 className="text-base font-extrabold text-[#111111]">{procedure.title}</h4>
        </div>
      </div>

      {/* Office & Location Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 text-xs border-b border-[rgba(160,50,85,0.18)]">
        <div className="flex items-start gap-2 text-[#111111]">
          <Building2 className="w-4 h-4 text-[#EB4D6E] flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-[#5C4B52] block text-[11px] font-bold uppercase tracking-wider">Responsible Office</span>
            <span className="font-bold text-[#111111]">{procedure.responsibleOffice}</span>
          </div>
        </div>

        <div className="flex items-start gap-2 text-[#111111]">
          <Clock className="w-4 h-4 text-[#EB4D6E] flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-[#5C4B52] block text-[11px] font-bold uppercase tracking-wider">Working Hours</span>
            <span className="font-bold text-[#111111]">{procedure.hours}</span>
          </div>
        </div>

        <div className="sm:col-span-2 flex items-start gap-2 text-[#111111]">
          <MapPin className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-[#5C4B52] block text-[11px] font-bold uppercase tracking-wider">Physical Location</span>
            <span className="font-bold text-[#111111]">{procedure.location}</span>
          </div>
        </div>
      </div>

      {/* Required Documents */}
      {procedure.requiredDocuments.length > 0 && (
        <div className="py-3 border-b border-[rgba(160,50,85,0.18)]">
          <h5 className="text-xs font-black text-[#B82346] uppercase tracking-wider mb-2">
            Required Documents
          </h5>
          <ul className="space-y-1.5 text-xs text-[#2D2226]">
            {procedure.requiredDocuments.map((doc, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 mt-0.5" />
                <span className="font-medium text-[#111111]">{doc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Step-by-Step Instructions */}
      {procedure.steps.length > 0 && (
        <div className="py-3">
          <h5 className="text-xs font-black text-[#B82346] uppercase tracking-wider mb-2">
            Step-by-Step Procedure
          </h5>
          <ol className="space-y-2 text-xs">
            {procedure.steps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#FFE2E8] border border-[#EB4D6E]/40 text-[#B82346] font-extrabold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="text-[#2D2226] font-medium leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Footer Navigation Link */}
      <div className="pt-3 border-t border-[rgba(160,50,85,0.18)] flex items-center justify-between">
        <span className="text-[11px] text-[#5C4B52] font-semibold">Institutional Guidelines</span>
        <div className="flex gap-2">
          <Link href={`/map?dest=${encodeURIComponent(procedure.location)}`}>
            <GlassButton variant="primary" size="sm" className="text-xs px-3 shadow-xs">
              <Navigation className="w-3.5 h-3.5 mr-1" />
              Navigate
            </GlassButton>
          </Link>
          <GlassButton size="sm" variant="outline" onClick={onNavigate}>
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            View Source
          </GlassButton>
        </div>
      </div>
    </GlassCard>
  );
};
