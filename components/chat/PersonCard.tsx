'use client';

import React from 'react';
import { PersonItem } from '@/lib/types';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { Mail, Phone, MapPin, Clock, Navigation } from 'lucide-react';
import Link from 'next/link';

export interface PersonCardProps {
  person: PersonItem;
}

export const PersonCard: React.FC<PersonCardProps> = ({ person }) => {
  const availabilityVariants: Record<PersonItem['availability'], 'success' | 'warning' | 'error' | 'default'> = {
    Available: 'success',
    'In Class': 'warning',
    Busy: 'error',
    'Office Hours Only': 'default',
  };

  return (
    <GlassCard variant="elevated" className="mt-3 border-2 border-[rgba(160,50,85,0.24)] bg-white max-w-xl shadow-md shadow-rose-950/5">
      <div className="flex items-start gap-4 pb-3 border-b border-[rgba(160,50,85,0.18)]">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#FFE2E8] border border-[rgba(160,50,85,0.25)] flex-shrink-0 flex items-center justify-center font-bold text-[#B82346] text-lg">
          {person.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" />
          ) : (
            person.name.charAt(0)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-base font-extrabold text-[#111111] truncate">{person.name}</h4>
            <GlassBadge variant={availabilityVariants[person.availability]} size="sm">
              {person.availability}
            </GlassBadge>
          </div>
          <p className="text-xs text-[#B82346] font-bold">{person.role}</p>
          <p className="text-xs text-[#5C4B52] font-semibold">{person.department}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-3 text-xs border-b border-[rgba(160,50,85,0.18)] text-[#111111]">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-[#EB4D6E] flex-shrink-0" />
          <span className="font-medium">
            {person.office} ({person.building})
          </span>
        </div>

        {person.officeHours && (
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#EB4D6E] flex-shrink-0" />
            <span className="font-medium">{person.officeHours}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 text-[#EB4D6E] flex-shrink-0" />
          <a href={`mailto:${person.email}`} className="text-[#B82346] font-semibold hover:underline truncate">
            {person.email}
          </a>
        </div>

        {person.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-[#EB4D6E] flex-shrink-0" />
            <span className="font-medium">{person.phone}</span>
          </div>
        )}
      </div>

      <div className="pt-3 flex items-center justify-between">
        <span className="text-[11px] text-[#5C4B52] font-semibold">Faculty / Staff Directory</span>
        <Link href={`/map?dest=${encodeURIComponent(person.office)}`}>
          <GlassButton variant="primary" size="sm" className="text-xs px-3 shadow-xs">
            <Navigation className="w-3.5 h-3.5 mr-1" />
            Navigate to Office
          </GlassButton>
        </Link>
      </div>
    </GlassCard>
  );
};
