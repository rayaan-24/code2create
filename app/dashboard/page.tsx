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
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        {/* Loading / Error States */}
        {error && <ErrorBanner message={error} onRetry={loadData} />}

        {/* Greeting & AI Prompt Box */}
        <div className="relative p-6 sm:p-8 rounded-3xl glass-panel-elevated border-white/15 overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <GlassBadge variant="primary" size="sm" className="mb-3">
              <Sparkles className="w-3 h-3 text-sky-400" />
              <span>NEXORA Intelligent Workspace</span>
            </GlassBadge>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Good day, {user?.name.split(' ')[0] || 'Member'}.
            </h2>
            <p className="text-slate-300 text-sm mt-1 mb-6">
              How can I help you today? Describe what you need in natural language.
            </p>

            {/* Quick Prompt Input */}
            <form onSubmit={handleQuickSubmit} className="relative flex items-center">
              <input
                type="text"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="e.g. Where do I submit hostel leave permission?"
                className="w-full pl-4 pr-28 py-3.5 rounded-2xl glass-input text-sm text-white placeholder:text-slate-400 border border-white/20 shadow-inner"
              />
              <div className="absolute right-2">
                <GlassButton type="submit" size="sm" variant="primary" className="rounded-xl">
                  <span>Ask AI</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </GlassButton>
              </div>
            </form>
          </div>
        </div>

        {/* Quick Action Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-400" />
              <span>Quick Action Launchpads</span>
            </h3>
            <span className="text-xs text-slate-400">Direct shortcuts</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActionCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <Link key={idx} href={card.href} className="group">
                  <GlassCard
                    variant="interactive"
                    className="p-4 h-full flex flex-col justify-between text-left border-white/10"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl ${card.bg} ${card.color} flex items-center justify-center mb-3`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors">
                        {card.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{card.desc}</p>
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Main Grid: Recent Conversations & Community Pulse */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Recent Conversations */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <span>Recent Conversations</span>
              </h3>
              <Link
                href="/chat"
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
              >
                <span>Open Chat</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <LoadingSkeleton count={3} />
            ) : conversations.length === 0 ? (
              <GlassCard className="p-8 text-center text-slate-400 text-xs">
                No recent conversations found. Start a new query above.
              </GlassCard>
            ) : (
              <div className="space-y-2.5">
                {conversations.map((conv) => (
                  <Link key={conv.id} href={`/chat?id=${conv.id}`} className="block">
                    <GlassCard
                      variant="interactive"
                      className="p-4 flex items-center justify-between border-white/10"
                    >
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-xs font-semibold text-white truncate">{conv.title}</h4>
                          {conv.tags?.map((t, i) => (
                            <GlassBadge key={i} variant="primary" size="sm">
                              {t}
                            </GlassBadge>
                          ))}
                        </div>
                        <p className="text-xs text-slate-400 truncate max-w-md">{conv.lastMessage}</p>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(conv.updatedAt)}</span>
                      </div>
                    </GlassCard>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right Col: Announcements & Campus Status */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Community Notices</span>
              </h3>
              <span className="text-[11px] text-slate-400">Verified</span>
            </div>

            <div className="space-y-3">
              {announcements.map((ann) => (
                <GlassCard key={ann.id} variant="default" className="p-4 border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                      {ann.category}
                    </span>
                    <span className="text-[10px] text-slate-500">{formatDate(ann.timestamp)}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-white leading-snug">{ann.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{ann.message}</p>
                </GlassCard>
              ))}

              {/* Quick Campus Beacon Card */}
              <GlassCard
                variant="subtle"
                className="p-4 border-emerald-500/20 bg-emerald-950/20 flex items-center gap-3"
              >
                <Building className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-emerald-300 block">Campus Systems Operational</span>
                  <span className="text-slate-400 text-[11px]">
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
