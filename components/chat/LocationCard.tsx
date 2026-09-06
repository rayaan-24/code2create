'use client';

import React from 'react';
import { LocationItem } from '@/lib/types';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { MapPin, Clock, Building, Navigation } from 'lucide-react';
import Link from 'next/link';

export interface LocationCardProps {
  location: LocationItem;
}

export const LocationCard: React.FC<LocationCardProps> = ({ location }) => {
  return (
    <GlassCard variant="elevated" className="mt-3 border-sky-400/20 max-w-xl">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GlassBadge variant="success" size="sm">
              {location.category}
            </GlassBadge>
            {location.accessible && (
              <GlassBadge variant="outline" size="sm">
                Wheelchair Accessible
              </GlassBadge>
            )}
          </div>
          <h4 className="text-base font-semibold text-white">{location.name}</h4>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 text-xs border-b border-white/10">
        <div className="flex items-start gap-2 text-slate-300">
          <Building className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-400 block text-[11px]">Building & Room</span>
            <span className="font-medium text-slate-200">
              {location.building} — {location.room}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 text-slate-300">
          <Clock className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-400 block text-[11px]">Timings</span>
            <span className="font-medium text-slate-200">{location.operatingHours}</span>
          </div>
        </div>
      </div>

      {location.description && (
        <p className="py-3 text-xs text-slate-300 leading-relaxed border-b border-white/10">
          {location.description}
        </p>
      )}

      <div className="pt-3 flex items-center justify-between">
        <Link href={`/map?dest=${encodeURIComponent(location.name)}`} className="inline-flex">
          <GlassButton size="sm" variant="primary">
            <Navigation className="w-3.5 h-3.5 mr-1.5" />
            Navigate to Destination
          </GlassButton>
        </Link>
      </div>
    </GlassCard>
  );
};
