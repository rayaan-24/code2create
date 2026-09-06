'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import {
  ShieldAlert,
  Database,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Activity,
  Check,
  X,
  Layers,
  FileText,
  MapPin,
  Compass,
  FileQuestion,
  Bell,
  Sliders,
} from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { AdminMetric, VerificationItem } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function AdminPage() {
  const [metrics, setMetrics] = useState<AdminMetric | null>(null);
  const [queue, setQueue] = useState<VerificationItem[]>([]);
  const [activeTab, setActiveTab] = useState('Overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const adminTabs = [
    'Overview',
    'Knowledge',
    'Documents',
    'Locations',
    'People',
    'Services',
    'Procedures',
    'Announcements',
    'Analytics',
    'Settings',
  ];

  const loadAdminData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [mRes, qRes] = await Promise.all([
        adminApi.getDashboardMetrics(),
        adminApi.getPendingVerifications(),
      ]);
      if (mRes.data) setMetrics(mRes.data);
      if (qRes.data) setQueue(qRes.data);
    } catch (err: any) {
      setError('Unable to load admin metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await adminApi.updateVerificationStatus(id, status);
      setQueue((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item))
      );
    } catch (err) {
      alert('Action failed');
    }
  };

  return (
    <AppShell title="Administrative Governance Console">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GlassBadge variant="warning" size="sm">
                Restricted Access
              </GlassBadge>
              <span className="text-xs text-slate-400">Institutional Governance Console</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
              <span>NEXORA Knowledge & Operations Panel</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <GlassBadge variant="success" size="md">
              <Activity className="w-3.5 h-3.5 mr-1" />
              System Status: {metrics?.systemHealth || 'Optimal'}
            </GlassBadge>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/10">
          {adminTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {error && <ErrorBanner message={error} onRetry={loadAdminData} />}

        {isLoading || !metrics ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <GlassCard variant="default" className="p-5 border-white/10">
                <div className="flex items-center justify-between text-sky-400 mb-2">
                  <Database className="w-5 h-5" />
                  <span className="text-xs font-semibold text-slate-400">Knowledge Items</span>
                </div>
                <div className="text-2xl font-extrabold text-white">
                  {metrics.totalKnowledgeItems.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Active documents, rules & procedures
                </p>
              </GlassCard>

              <GlassCard variant="default" className="p-5 border-emerald-500/20 bg-emerald-950/10">
                <div className="flex items-center justify-between text-emerald-400 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-xs font-semibold text-slate-400">Verified & Grounded</span>
                </div>
                <div className="text-2xl font-extrabold text-white">
                  {metrics.verifiedItems.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">High confidence community truth</p>
              </GlassCard>

              <GlassCard variant="default" className="p-5 border-amber-500/20 bg-amber-950/10">
                <div className="flex items-center justify-between text-amber-400 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="text-xs font-semibold text-slate-400">Pending Review</span>
                </div>
                <div className="text-2xl font-extrabold text-amber-300">
                  {metrics.pendingReview}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Awaiting registry sign-off</p>
              </GlassCard>

              <GlassCard variant="default" className="p-5 border-rose-500/20 bg-rose-950/10">
                <div className="flex items-center justify-between text-rose-400 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-xs font-semibold text-slate-400">Expired / Deprecated</span>
                </div>
                <div className="text-2xl font-extrabold text-white">{metrics.expiredItems}</div>
                <p className="text-[11px] text-slate-400 mt-1">Requiring syllabus/policy renewal</p>
              </GlassCard>
            </div>

            {/* Pending Verification Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Pending Institutional Verifications</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Items submitted by departmental heads requiring publication authorization.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {queue.filter((q) => q.status === 'pending').length} Action Items
                </span>
              </div>

              <div className="rounded-2xl glass-panel border border-white/10 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 border-b border-white/10 text-slate-400 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3.5">Title & Directive</th>
                        <th className="px-4 py-3.5">Category</th>
                        <th className="px-4 py-3.5">Submitted By</th>
                        <th className="px-4 py-3.5">Timestamp</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {queue.map((item) => (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3.5 font-medium text-white max-w-xs">
                            <div className="truncate font-semibold">{item.title}</div>
                            {item.notes && (
                              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                {item.notes}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 uppercase font-mono text-[10px] text-sky-400">
                            {item.type}
                          </td>
                          <td className="px-4 py-3.5 text-slate-300">{item.submittedBy}</td>
                          <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                            {formatDate(item.submittedAt)}
                          </td>
                          <td className="px-4 py-3.5">
                            <GlassBadge
                              variant={
                                item.status === 'approved'
                                  ? 'success'
                                  : item.status === 'rejected'
                                  ? 'error'
                                  : 'warning'
                              }
                              size="sm"
                            >
                              {item.status.toUpperCase()}
                            </GlassBadge>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {item.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <GlassButton
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleAction(item.id, 'approved')}
                                  className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-500"
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Approve
                                </GlassButton>
                                <GlassButton
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleAction(item.id, 'rejected')}
                                  className="h-7 px-2 text-[11px]"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Reject
                                </GlassButton>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">Resolved</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
