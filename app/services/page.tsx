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
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <Compass className="w-6 h-6 text-sky-400" />
              <span>Campus Services Discovery</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Locate and access academic registries, technical support, facilities, and emergency assistance.
            </p>
          </div>

          <GlassBadge variant="primary" size="md">
            {filteredServices.length} Services Available
          </GlassBadge>
        </div>

        {/* Search & Category Tabs */}
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services by keyword..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder:text-slate-500"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {SERVICE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-sky-500 text-white shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
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
                className="p-5 flex flex-col justify-between border-white/10"
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
                      <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold">
                        <AlertCircle className="w-3 h-3" /> 24/7 Priority
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white mb-2 leading-snug">
                    {service.name}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {service.description}
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-300 py-3 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                      <span className="truncate">{service.department}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="truncate">{service.location}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-[11px] truncate">{service.hours}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveService(service)}
                    className="text-xs px-2.5 text-slate-300 hover:text-white"
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
                  <span className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Emergency Support Service
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {activeService.description}
              </p>

              <div className="p-3.5 rounded-xl bg-slate-900/50 border border-white/10 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Physical Desk: {activeService.location}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <span>Operating Schedule: {activeService.hours}</span>
                </div>
                {activeService.contactEmail && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    <a
                      href={`mailto:${activeService.contactEmail}`}
                      className="text-sky-300 hover:underline"
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
