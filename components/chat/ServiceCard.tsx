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
    <GlassCard variant="elevated" className="mt-3 border-2 border-[rgba(160,50,85,0.24)] bg-white max-w-xl shadow-md shadow-rose-950/5">
      <div className="flex items-start justify-between gap-3 border-b border-[rgba(160,50,85,0.18)] pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GlassBadge variant={service.isUrgent ? 'error' : 'primary'} size="sm">
              {service.category}
            </GlassBadge>
            {service.isUrgent && (
              <span className="flex items-center gap-1 text-[11px] text-[#B82346] font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-[#EB4D6E]" /> 24/7 Urgent Service
              </span>
            )}
          </div>
          <h4 className="text-base font-extrabold text-[#111111]">{service.name}</h4>
        </div>
      </div>

      <p className="py-2.5 text-xs text-[#2D2226] font-medium leading-relaxed border-b border-[rgba(160,50,85,0.18)]">
        {service.description}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-3 text-xs border-b border-[rgba(160,50,85,0.18)] text-[#111111]">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#EB4D6E] flex-shrink-0" />
          <span className="font-semibold">{service.department}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#EB4D6E] flex-shrink-0" />
          <span className="font-semibold">{service.hours}</span>
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span className="font-bold text-[#111111]">{service.location}</span>
        </div>
      </div>

      <div className="pt-3 flex items-center justify-between">
        <span className="text-[11px] text-[#5C4B52] font-semibold">Service Desk Available</span>
        <Link href={`/map?dest=${encodeURIComponent(service.location)}`}>
          <GlassButton size="sm" variant="primary" className="text-xs px-3 shadow-xs">
            <Navigation className="w-3.5 h-3.5 mr-1.5" />
            Navigate to Service Desk
          </GlassButton>
        </Link>
      </div>
    </GlassCard>
  );
};
