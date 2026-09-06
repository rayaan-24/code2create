'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { GlassModal } from '@/components/ui/GlassModal';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import {
  Compass,
  Building2,
  Clock,
  MapPin,
  Mail,
  Navigation,
  ExternalLink,
  AlertCircle,
  Search,
} from 'lucide-react';
import { servicesApi } from '@/lib/api/services';
import { ServiceItem } from '@/lib/types';
import { SERVICE_CATEGORIES } from '@/lib/constants';

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeService, setActiveService] = useState<ServiceItem | null>(null);

  const loadServices = async (category?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await servicesApi.getServices(category);
      if (res.data) {
        setServices(res.data);
      }
    } catch (err) {
      setError('Unable to load services directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServices(selectedCategory);
  }, [selectedCategory]);

  const filteredServices = services.filter((srv) => {
    const matchesSearch =
      srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <AppShell title="Campus Services">
      <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#111111] flex items-center gap-2">
              <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-[#EB4D6E]" />
              <span>Campus Services Discovery</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#5C4B52] font-medium mt-1">
              Locate and access academic registries, technical support, facilities, and emergency assistance.
            </p>
          </div>

          <div className="self-start sm:self-auto">
            <GlassBadge variant="primary" size="md">
              {filteredServices.length} Services Available
            </GlassBadge>
          </div>
        </div>

        {/* Search & Category Tabs */}
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5C4B52]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services by keyword..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-base sm:text-sm text-[#111111] font-medium placeholder:text-[#5C4B52] border border-[rgba(160,50,85,0.24)] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#EB4D6E]/25"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {SERVICE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#EB4D6E] text-white shadow-xs'
                    : 'bg-white text-[#111111] hover:bg-[#FFE2E8] border border-[rgba(160,50,85,0.2)] shadow-2xs'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && <ErrorBanner message={error} onRetry={() => loadServices(selectedCategory)} />}

        {/* Services Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-52" />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="No Services Found"
            description={`No services found matching your criteria in category "${selectedCategory}".`}
            actionLabel="Reset to All"
            onAction={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredServices.map((service) => (
              <GlassCard
                key={service.id}
                variant="interactive"
                className="p-5 flex flex-col justify-between border-[rgba(160,50,85,0.2)] bg-white/95 shadow-2xs hover:shadow-md hover:border-[#EB4D6E]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <GlassBadge
                      variant={service.isUrgent ? 'error' : 'primary'}
                      size="sm"
                    >
                      {service.category}
                    </GlassBadge>
                    {service.isUrgent && (
                      <span className="flex items-center gap-1 text-[10px] text-rose-700 font-extrabold bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
                        <AlertCircle className="w-3 h-3" /> 24/7 Priority
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-[#111111] mb-2 leading-snug">
                    {service.name}
                  </h3>

                  <p className="text-xs text-[#2D2226] font-normal line-clamp-2 mb-4 leading-relaxed">
                    {service.description}
                  </p>

                  <div className="space-y-1.5 text-xs text-[#111111] py-3 border-t border-[rgba(160,50,85,0.12)]">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-[#EB4D6E] flex-shrink-0" />
                      <span className="truncate font-medium">{service.department}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                      <span className="truncate font-medium">{service.location}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[#5C4B52]">
                      <Clock className="w-3.5 h-3.5 text-[#5C4B52] flex-shrink-0" />
                      <span className="text-[11px] truncate font-medium">{service.hours}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[rgba(160,50,85,0.12)] flex items-center justify-between gap-2">
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveService(service)}
                    className="text-xs px-2.5 text-[#111111] hover:text-[#000000] hover:bg-[#FFE2E8] font-bold"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    View Details
                  </GlassButton>

                  <Link href={`/map?dest=${encodeURIComponent(service.location)}`}>
                    <GlassButton variant="primary" size="sm" className="text-xs px-3">
                      <Navigation className="w-3.5 h-3.5 mr-1" />
                      Navigate
                    </GlassButton>
                  </Link>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Service Details Modal */}
        <GlassModal
          isOpen={!!activeService}
          onClose={() => setActiveService(null)}
          title={activeService?.name || 'Service Details'}
          description={activeService?.department}
        >
          {activeService && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <GlassBadge variant={activeService.isUrgent ? 'error' : 'primary'}>
                  {activeService.category}
                </GlassBadge>
                {activeService.isUrgent && (
                  <span className="text-xs text-rose-700 font-bold flex items-center gap-1 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
                    <AlertCircle className="w-3.5 h-3.5" /> Emergency Support Service
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-[#2D2226] leading-relaxed font-medium">
                {activeService.description}
              </p>

              <div className="p-3.5 rounded-xl bg-[#FFF0F4] border border-[rgba(160,50,85,0.2)] space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[#111111] font-medium">
                  <MapPin className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <span>Physical Desk: {activeService.location}</span>
                </div>
                <div className="flex items-center gap-2 text-[#111111] font-medium">
                  <Clock className="w-4 h-4 text-[#EB4D6E] flex-shrink-0" />
                  <span>Operating Schedule: {activeService.hours}</span>
                </div>
                {activeService.contactEmail && (
                  <div className="flex items-center gap-2 text-[#111111] font-medium">
                    <Mail className="w-4 h-4 text-[#EB4D6E] flex-shrink-0" />
                    <a
                      href={`mailto:${activeService.contactEmail}`}
                      className="text-[#B82346] font-bold hover:underline"
                    >
                      {activeService.contactEmail}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Link href={`/map?dest=${encodeURIComponent(activeService.location)}`}>
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveService(null)}
                  >
                    <Navigation className="w-3.5 h-3.5 mr-1.5" />
                    Start Indoor Navigation
                  </GlassButton>
                </Link>
              </div>
            </div>
          )}
        </GlassModal>
      </div>
    </AppShell>
  );
}
