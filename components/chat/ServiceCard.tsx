'use client';

import React from 'react';
import { ServiceItem } from '@/lib/types';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { MapPin, Clock, Building2, Navigation, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export interface ServiceCardProps {
  service: ServiceItem;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  return (
    <GlassCard variant="elevated" className="mt-3 border-sky-400/20 max-w-xl">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GlassBadge variant={service.isUrgent ? 'error' : 'primary'} size="sm">
              {service.category}
            </GlassBadge>
            {service.isUrgent && (
              <span className="flex items-center gap-1 text-[11px] text-rose-400 font-semibold">
                <AlertTriangle className="w-3 h-3" /> 24/7 Urgent Service
              </span>
            )}
          </div>
          <h4 className="text-base font-semibold text-white">{service.name}</h4>
        </div>
      </div>

      <p className="py-2.5 text-xs text-slate-300 leading-relaxed border-b border-white/10">
        {service.description}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-3 text-xs border-b border-white/10 text-slate-300">
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          <span>{service.department}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          <span>{service.hours}</span>
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>{service.location}</span>
        </div>
      </div>

      <div className="pt-3 flex items-center gap-2 flex-wrap">
        <Link href={`/map?dest=${encodeURIComponent(service.location)}`} className="inline-flex">
          <GlassButton size="sm" variant="primary">
            <Navigation className="w-3.5 h-3.5 mr-1.5" />
            Navigate to Service Desk
          </GlassButton>
        </Link>
      </div>
    </GlassCard>
  );
};
