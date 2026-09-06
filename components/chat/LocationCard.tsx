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
    <GlassCard variant="elevated" className="mt-3 border-2 border-[rgba(160,50,85,0.24)] bg-white max-w-xl shadow-md shadow-rose-950/5">
      <div className="flex items-start justify-between gap-3 border-b border-[rgba(160,50,85,0.18)] pb-3">
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
          <h4 className="text-base font-extrabold text-[#111111]">{location.name}</h4>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 text-xs border-b border-[rgba(160,50,85,0.18)]">
        <div className="flex items-start gap-2 text-[#111111]">
          <Building className="w-4 h-4 text-[#EB4D6E] flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-[#5C4B52] block text-[11px] font-bold uppercase tracking-wider">Building & Room</span>
            <span className="font-bold text-[#111111]">
              {location.building} — {location.room}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 text-[#111111]">
          <Clock className="w-4 h-4 text-[#EB4D6E] flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-[#5C4B52] block text-[11px] font-bold uppercase tracking-wider">Timings</span>
            <span className="font-bold text-[#111111]">{location.operatingHours}</span>
          </div>
        </div>
      </div>

      {location.description && (
        <p className="py-3 text-xs text-[#2D2226] font-medium leading-relaxed border-b border-[rgba(160,50,85,0.18)]">
          {location.description}
        </p>
      )}

      <div className="pt-3 flex items-center justify-between">
        <span className="text-[11px] text-[#5C4B52] font-semibold">Campus Geocoded</span>
        <Link href={`/map?dest=${encodeURIComponent(location.name)}`}>
          <GlassButton variant="primary" size="sm" className="text-xs px-3 shadow-xs">
            <Navigation className="w-3.5 h-3.5 mr-1" />
            Navigate Here
          </GlassButton>
        </Link>
      </div>
    </GlassCard>
  );
};
