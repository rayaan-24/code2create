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
    <GlassCard variant="elevated" className="mt-3 border-sky-400/20 max-w-xl">
      <div className="flex items-start gap-4 pb-3 border-b border-white/10">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 border border-white/10 flex-shrink-0 flex items-center justify-center font-bold text-sky-400 text-lg">
          {person.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" />
          ) : (
            person.name.charAt(0)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-base font-semibold text-white truncate">{person.name}</h4>
            <GlassBadge variant={availabilityVariants[person.availability]} size="sm">
              {person.availability}
            </GlassBadge>
          </div>
          <p className="text-xs text-sky-300 font-medium">{person.role}</p>
          <p className="text-xs text-slate-400">{person.department}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-3 text-xs border-b border-white/10 text-slate-300">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          <span>
            {person.office} ({person.building})
          </span>
        </div>

        {person.officeHours && (
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            <span>{person.officeHours}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          <a href={`mailto:${person.email}`} className="hover:underline truncate text-slate-300">
            {person.email}
          </a>
        </div>

        {person.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            <span>{person.phone}</span>
          </div>
        )}
      </div>

      <div className="pt-3 flex items-center gap-2 flex-wrap">
        <Link href={`/map?dest=${encodeURIComponent(person.office)}`} className="inline-flex">
          <GlassButton size="sm" variant="primary">
            <Navigation className="w-3.5 h-3.5 mr-1.5" />
            Navigate to Office
          </GlassButton>
        </Link>
        <a href={`mailto:${person.email}`} className="inline-flex">
          <GlassButton size="sm" variant="outline">
            <Mail className="w-3.5 h-3.5 mr-1.5" />
            Send Email
          </GlassButton>
        </a>
      </div>
    </GlassCard>
  );
};
