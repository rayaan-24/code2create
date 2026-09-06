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
    <AppShell title="People Directory">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-sky-400" />
              <span>Campus & Community Directory</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Find faculty, departmental officers, academic advisors, and administrative staff.
            </p>
          </div>

          <GlassBadge variant="primary" size="md">
            {people.length} Members Listed
          </GlassBadge>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, role, office or department..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder:text-slate-500"
            />
          </div>

          <div className="flex-shrink-0 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2.5 rounded-xl glass-input text-xs text-white border border-white/10 bg-slate-900/80 focus:outline-none"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept} className="bg-slate-900 text-white">
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
                className="p-5 flex flex-col justify-between border-white/10"
              >
                <div>
                  <div className="flex items-start gap-3.5 mb-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 border border-white/10 flex-shrink-0 flex items-center justify-center font-bold text-sky-400 text-lg">
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
                        <h4 className="text-sm font-semibold text-white truncate">{person.name}</h4>
                        <GlassBadge
                          variant={availabilityBadgeVariants[person.availability]}
                          size="sm"
                          className="text-[10px]"
                        >
                          {person.availability}
                        </GlassBadge>
                      </div>
                      <p className="text-xs text-sky-300 font-medium truncate">{person.role}</p>
                      <p className="text-[11px] text-slate-400 truncate">{person.department}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 py-2 text-xs text-slate-300 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                      <span className="truncate">
                        {person.office} — {person.building}
                      </span>
                    </div>

                    {person.officeHours && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate text-slate-400 text-[11px]">
                          {person.officeHours}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between gap-2">
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivePerson(person)}
                    className="text-xs px-2.5 text-slate-300 hover:text-white"
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
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 border border-white/10">
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
                  <h4 className="text-base font-bold text-white">{activePerson.name}</h4>
                  <p className="text-xs text-sky-400 font-medium">{activePerson.role}</p>
                  <p className="text-xs text-slate-400">{activePerson.department}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/50 border border-white/10 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-sky-400" />
                  <span>
                    Office: {activePerson.office}, {activePerson.building}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail className="w-4 h-4 text-sky-400" />
                  <a href={`mailto:${activePerson.email}`} className="text-sky-300 hover:underline">
                    {activePerson.email}
                  </a>
                </div>
                {activePerson.phone && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-4 h-4 text-sky-400" />
                    <span>{activePerson.phone}</span>
                  </div>
                )}
                {activePerson.officeHours && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="w-4 h-4 text-sky-400" />
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
