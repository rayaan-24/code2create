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
  Users,
  Search,
  MapPin,
  Mail,
  Phone,
  Clock,
  Navigation,
  ExternalLink,
} from 'lucide-react';
import { peopleApi } from '@/lib/api/people';
import { PersonItem } from '@/lib/types';

export default function PeoplePage() {
  const [people, setPeople] = useState<PersonItem[]>([]);
  const [query, setQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePerson, setActivePerson] = useState<PersonItem | null>(null);

  const departments = [
    'All',
    'Computer Science & AI',
    'Academic Administration',
    'IT Infrastructure',
    'Robotics & Mechatronics',
    'Health & Wellness Center',
    'Facilities & Campus Operations',
  ];

  const loadPeople = async (q: string = '', dept?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await peopleApi.searchPeople(q, dept);
      if (res.data) {
        setPeople(res.data);
      }
    } catch (err: any) {
      setError('Unable to load community directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadPeople(query, selectedDept);
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [query, selectedDept]);

  const availabilityBadgeVariants: Record<
    PersonItem['availability'],
    'success' | 'warning' | 'error' | 'default'
  > = {
    Available: 'success',
    'In Class': 'warning',
    Busy: 'error',
    'Office Hours Only': 'default',
  };

  return (
    <AppShell title="Campus Directory">
      <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#111111] flex items-center gap-2">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#EB4D6E]" />
              <span>Campus & Community Directory</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#5C4B52] font-medium mt-1">
              Find faculty, departmental officers, academic advisors, and administrative staff.
            </p>
          </div>

          <div className="self-start sm:self-auto">
            <GlassBadge variant="primary" size="md">
              {people.length} Members Listed
            </GlassBadge>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5C4B52]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, role, office or department..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-base sm:text-sm text-[#111111] font-medium placeholder:text-[#5C4B52] border border-[rgba(160,50,85,0.24)] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#EB4D6E]/25"
            />
          </div>

          <div className="flex-shrink-0 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl text-sm sm:text-xs font-semibold text-[#111111] border border-[rgba(160,50,85,0.24)] bg-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#EB4D6E]/25 cursor-pointer"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept} className="bg-white text-[#111111]">
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error Banner */}
        {error && <ErrorBanner message={error} onRetry={() => loadPeople(query, selectedDept)} />}

        {/* Directory Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-44" />
            ))}
          </div>
        ) : people.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No People Found"
            description={`No community members matched your search "${query}". Try searching by department or surname.`}
            actionLabel="Clear Filters"
            onAction={() => {
              setQuery('');
              setSelectedDept('All');
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {people.map((person) => (
              <GlassCard
                key={person.id}
                variant="interactive"
                className="p-5 flex flex-col justify-between border-[rgba(160,50,85,0.2)] bg-white/95 shadow-2xs hover:shadow-md hover:border-[#EB4D6E]"
              >
                <div>
                  <div className="flex items-start gap-3.5 mb-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#FFE2E8] border border-[rgba(160,50,85,0.25)] flex-shrink-0 flex items-center justify-center font-bold text-[#B82346] text-lg">
                      {person.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={person.avatar}
                          alt={person.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        person.name.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h4 className="text-sm font-bold text-[#111111] truncate">{person.name}</h4>
                        <GlassBadge
                          variant={availabilityBadgeVariants[person.availability]}
                          size="sm"
                          className="text-[10px]"
                        >
                          {person.availability}
                        </GlassBadge>
                      </div>
                      <p className="text-xs text-[#B82346] font-bold truncate">{person.role}</p>
                      <p className="text-[11px] text-[#5C4B52] font-semibold truncate">{person.department}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 py-2 text-xs text-[#2D2226] border-t border-[rgba(160,50,85,0.12)]">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#EB4D6E] flex-shrink-0" />
                      <span className="truncate font-medium">
                        {person.office} — {person.building}
                      </span>
                    </div>

                    {person.officeHours && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#5C4B52] flex-shrink-0" />
                        <span className="truncate text-[#5C4B52] text-[11px] font-medium">
                          {person.officeHours}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-2 border-t border-[rgba(160,50,85,0.12)] flex items-center justify-between gap-2">
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivePerson(person)}
                    className="text-xs px-2.5 text-[#111111] hover:text-[#000000] hover:bg-[#FFE2E8] font-bold"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    View Profile
                  </GlassButton>

                  <Link href={`/map?dest=${encodeURIComponent(person.office)}`}>
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

        {/* Person Quick Profile Modal */}
        <GlassModal
          isOpen={!!activePerson}
          onClose={() => setActivePerson(null)}
          title={activePerson?.name || 'Member Profile'}
          description={activePerson?.role}
        >
          {activePerson && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#FFE2E8] border border-[rgba(160,50,85,0.25)] flex-shrink-0">
                  {activePerson.avatar && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activePerson.avatar}
                      alt={activePerson.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#111111]">{activePerson.name}</h4>
                  <p className="text-xs text-[#B82346] font-bold">{activePerson.role}</p>
                  <p className="text-xs text-[#5C4B52] font-semibold">{activePerson.department}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FFF0F4] border border-[rgba(160,50,85,0.2)] space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[#111111] font-medium">
                  <MapPin className="w-4 h-4 text-[#EB4D6E]" />
                  <span>
                    Office: {activePerson.office}, {activePerson.building}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[#111111] font-medium">
                  <Mail className="w-4 h-4 text-[#EB4D6E]" />
                  <a href={`mailto:${activePerson.email}`} className="text-[#B82346] font-semibold hover:underline">
                    {activePerson.email}
                  </a>
                </div>
                {activePerson.phone && (
                  <div className="flex items-center gap-2 text-[#111111] font-medium">
                    <Phone className="w-4 h-4 text-[#EB4D6E]" />
                    <span>{activePerson.phone}</span>
                  </div>
                )}
                {activePerson.officeHours && (
                  <div className="flex items-center gap-2 text-[#111111] font-medium">
                    <Clock className="w-4 h-4 text-[#EB4D6E]" />
                    <span>Office Hours: {activePerson.officeHours}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Link href={`/map?dest=${encodeURIComponent(activePerson.office)}`}>
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={() => setActivePerson(null)}
                  >
                    <Navigation className="w-3.5 h-3.5 mr-1.5" />
                    Navigate to Office
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
