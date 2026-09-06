'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import {
  Sparkles,
  MapPin,
  Users,
  Compass,
  FileQuestion,
  Search,
  Navigation as NavigationIcon,
  Clock,
  ArrowRight,
  ChevronRight,
  Bell,
  MessageSquare,
  Building,
} from 'lucide-react';
import { chatApi } from '@/lib/api/chat';
import { usersApi } from '@/lib/api/users';
import { Conversation, User, Announcement } from '@/lib/types';
import { mockAnnouncements } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [announcements] = useState<Announcement[]>(mockAnnouncements);
  const [quickQuery, setQuickQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [uRes, cRes] = await Promise.all([
        usersApi.getCurrentUser(),
        chatApi.getConversations(),
      ]);

      if (uRes.error) throw new Error(uRes.error);
      if (cRes.error) throw new Error(cRes.error);

      setUser(uRes.data);
      setConversations(cRes.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuery.trim()) return;
    router.push(`/chat?prompt=${encodeURIComponent(quickQuery.trim())}`);
  };

  const quickActionCards = [
    {
      title: 'Find a place',
      desc: 'Labs, lecture halls & offices',
      icon: MapPin,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      href: '/map',
    },
    {
      title: 'Find a person',
      desc: 'Faculty, staff & advisors',
      icon: Users,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      href: '/people',
    },
    {
      title: 'Understand a procedure',
      desc: 'ID, leaves, transcripts & forms',
      icon: FileQuestion,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      href: '/chat?prompt=Show+official+procedures',
    },
    {
      title: 'Check a service',
      desc: 'Clinics, IT desks & registry',
      icon: Compass,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      href: '/services',
    },
    {
      title: 'Search community',
      desc: 'Campus guidelines & archives',
      icon: Search,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      href: '/chat?prompt=Search+community+handbook',
    },
    {
      title: 'Navigate somewhere',
      desc: 'Indoor turn-by-turn routing',
      icon: NavigationIcon,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      href: '/map',
    },
  ];

  return (
    <AppShell title="Dashboard">
      <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Loading / Error States */}
        {error && <ErrorBanner message={error} onRetry={loadData} />}

        {/* Greeting & AI Prompt Box */}
        <div className="relative p-4 sm:p-8 rounded-3xl bg-white/95 border border-[rgba(160,50,85,0.22)] shadow-xl shadow-rose-950/5 overflow-hidden backdrop-blur-xl">
          {/* Ambient Glow Orb */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-rose-200/40 via-pink-100/20 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <GlassBadge variant="primary" size="sm" className="mb-3 bg-[#FFE8EE] text-[#B82346] border-[#EB4D6E]/40 font-bold">
              <Sparkles className="w-3 h-3 text-[#EB4D6E]" />
              <span>NEXORA Intelligent Workspace</span>
            </GlassBadge>

            <h2 className="text-xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
              {new Date().getHours() < 12
                ? 'Good morning'
                : new Date().getHours() < 17
                ? 'Good afternoon'
                : 'Good evening'}
              , {user?.name.split(' ')[0] || 'Member'}.
            </h2>
            <p className="text-[#5C4B52] text-xs sm:text-sm mt-1.5 mb-5 sm:mb-6 font-medium">
              How can I help you today? Describe what you need in natural language.
            </p>

            {/* Quick Prompt Input */}
            <form onSubmit={handleQuickSubmit} className="relative flex items-center mb-4">
              <input
                type="text"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Where do I submit hostel leave permission?"
                className="w-full pl-3.5 sm:pl-4 pr-24 sm:pr-28 py-3 sm:py-3.5 rounded-2xl bg-white text-base sm:text-sm text-[#111111] placeholder:text-[#5C4B52] border border-[rgba(160,50,85,0.26)] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#EB4D6E]/30 focus:border-[#EB4D6E]"
              />
              <div className="absolute right-1.5 sm:right-2">
                <GlassButton type="submit" size="sm" variant="primary" className="rounded-xl px-3 sm:px-4 py-1.5 text-xs">
                  <span>Ask AI</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </GlassButton>
              </div>
            </form>

            {/* Try Asking Demo Discovery Chips */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#111111]">
                <Sparkles className="w-3.5 h-3.5 text-[#EB4D6E]" />
                <span>Try asking:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {[
                  'I lost my ID card. What should I do?',
                  'Where is Student Services?',
                  'Who handles hostel maintenance?',
                  'Navigate me to the library.',
                  'What documents do I need?',
                  'What is happening on campus?',
                  'What documents are needed for a passport?',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => router.push(`/chat?prompt=${encodeURIComponent(prompt)}`)}
                    className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-white hover:bg-[#FFE8EE] text-[#3D2D33] hover:text-[#111111] border border-[rgba(160,50,85,0.18)] hover:border-[#EB4D6E] shadow-2xs hover:shadow-xs transition-all text-xs text-left cursor-pointer font-medium"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Grid */}
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-sm sm:text-base font-bold text-[#111111] flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#EB4D6E]" />
              <span>Quick Action Launchpads</span>
            </h3>
            <span className="text-xs text-[#5C4B52] font-semibold">Direct shortcuts</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {quickActionCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <Link key={idx} href={card.href} className="group">
                  <GlassCard
                    variant="interactive"
                    className="p-3 sm:p-4 h-full flex flex-col justify-between text-left border-[rgba(160,50,85,0.2)] bg-white/95 hover:bg-white hover:border-[#EB4D6E] shadow-2xs hover:shadow-md hover:shadow-rose-950/5 transition-all"
                  >
                    <div
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FFE8EE] text-[#B82346] flex items-center justify-center mb-2.5 sm:mb-3 group-hover:scale-110 transition-transform"
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#111111] group-hover:text-[#B82346] transition-colors leading-snug">
                        {card.title}
                      </h4>
                      <p className="text-[11px] text-[#5C4B52] mt-1 line-clamp-2 leading-tight">{card.desc}</p>
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Main Grid: Recent Conversations & Community Pulse */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          {/* Left 2 Cols: Recent Conversations */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-[#111111] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#EB4D6E]" />
                <span>Recent Conversations</span>
              </h3>
              <Link
                href="/chat"
                className="text-xs text-[#B82346] hover:text-[#EB4D6E] flex items-center gap-1 font-bold"
              >
                <span>Open Chat</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <LoadingSkeleton count={3} />
            ) : conversations.length === 0 ? (
              <GlassCard className="p-8 text-center text-[#5C4B52] text-xs bg-white/90 border-[rgba(160,50,85,0.18)]">
                No recent conversations found. Start a new query above.
              </GlassCard>
            ) : (
              <div className="space-y-2 sm:space-y-2.5">
                {conversations.map((conv) => (
                  <Link key={conv.id} href={`/chat?id=${conv.id}`} className="block">
                    <GlassCard
                      variant="interactive"
                      className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 border-[rgba(160,50,85,0.18)] bg-white/95 hover:bg-white hover:border-[#EB4D6E] shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="text-xs font-bold text-[#111111] truncate">{conv.title}</h4>
                          {conv.tags?.map((t, i) => (
                            <GlassBadge key={i} variant="primary" size="sm" className="bg-[#FFE8EE] text-[#B82346] border-[#EB4D6E]/40 font-bold">
                              {t}
                            </GlassBadge>
                          ))}
                        </div>
                        <p className="text-xs text-[#5C4B52] truncate">{conv.lastMessage}</p>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#5C4B52] font-semibold flex-shrink-0">
                        <Clock className="w-3 h-3 text-[#EB4D6E]" />
                        <span>{formatDate(conv.updatedAt)}</span>
                      </div>
                    </GlassCard>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right Col: Announcements & Campus Status */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-[#111111] flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#EB4D6E]" />
                <span>Community Notices</span>
              </h3>
              <span className="text-[11px] text-[#5C4B52] font-bold">Verified</span>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {announcements.map((ann) => (
                <GlassCard key={ann.id} variant="default" className="p-3.5 sm:p-4 border-[rgba(160,50,85,0.18)] bg-white/95 space-y-1.5 sm:space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#B82346]">
                      {ann.category}
                    </span>
                    <span className="text-[10px] text-[#5C4B52] font-semibold">{formatDate(ann.timestamp)}</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#111111] leading-snug">{ann.title}</h4>
                  <p className="text-xs text-[#3D2D33] leading-relaxed font-medium">{ann.message}</p>
                </GlassCard>
              ))}

              {/* Quick Campus Beacon Card */}
              <GlassCard
                variant="subtle"
                className="p-3.5 sm:p-4 border-emerald-300 bg-emerald-50/90 flex items-center gap-3 shadow-2xs"
              >
                <Building className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-emerald-950 block">Campus Systems Operational</span>
                  <span className="text-emerald-800 text-[11px] font-medium">
                    All registry counters & labs functioning under regular schedule.
                  </span>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
