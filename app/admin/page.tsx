'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { GlassInput } from '@/components/ui/GlassInput';
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
  FileText,
  MapPin,
  Briefcase,
  Bell,
  Plus,
  Shield,
  History,
} from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { locationsApi } from '@/lib/api/locations';
import { peopleApi } from '@/lib/api/people';
import { servicesApi } from '@/lib/api/services';
import { proceduresApi } from '@/lib/api/procedures';
import { announcementsApi } from '@/lib/api/announcements';
import {
  AdminMetric,
  VerificationItem,
  LocationItem,
  PersonItem,
  ServiceItem,
  ProcedureItem,
  Announcement,
} from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function AdminPage() {
  const [metrics, setMetrics] = useState<AdminMetric | null>(null);
  const [queue, setQueue] = useState<VerificationItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [people, setPeople] = useState<PersonItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [procedures, setProcedures] = useState<ProcedureItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState('Overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'location' | 'person' | 'service' | 'announcement'>('location');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const adminTabs = [
    'Overview',
    'Locations',
    'People',
    'Services',
    'Procedures',
    'Announcements',
    'Audit Trail',
  ];

  const loadAdminData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [mRes, qRes, locRes, peoRes, srvRes, prcRes, annRes, audRes] = await Promise.all([
        adminApi.getDashboardMetrics(),
        adminApi.getPendingVerifications(),
        locationsApi.getLocations(),
        peopleApi.searchPeople(),
        servicesApi.getServices(),
        proceduresApi.getProcedures(),
        announcementsApi.getAnnouncements(),
        adminApi.getAuditLogs(1, 15),
      ]);

      if (mRes.data) setMetrics(mRes.data);
      if (qRes.data) setQueue(qRes.data);
      if (locRes.data) setLocations(locRes.data);
      if (peoRes.data) setPeople(peoRes.data);
      if (srvRes.data) setServices(srvRes.data);
      if (prcRes.data) setProcedures(prcRes.data);
      if (annRes.data) setAnnouncements(annRes.data);
      if (audRes.data && audRes.data.items) setAuditLogs(audRes.data.items);
      else if (audRes.data && Array.isArray(audRes.data)) setAuditLogs(audRes.data);
    } catch {
      setError('Unable to load full administrative data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleAction = async (id: string, status: 'approved' | 'rejected', type?: string) => {
    try {
      await adminApi.updateVerificationStatus(id, status, type);
      setQueue((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item))
      );
    } catch {
      alert('Action failed');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (createType === 'location') {
        await adminApi.createLocation({
          name: formData.name,
          room_number: formData.room,
          floor: formData.floor,
          location_type: formData.category || 'room',
          description: formData.description,
          is_accessible: true,
        });
      } else if (createType === 'person') {
        await adminApi.createPerson({
          name: formData.name,
          role: formData.role,
          department: formData.department,
          email: formData.email,
          office_hours: formData.officeHours,
          availability: 'Available',
        });
      } else if (createType === 'service') {
        await adminApi.createService({
          name: formData.name,
          description: formData.description,
          department: formData.department,
          category: formData.category || 'General',
          is_urgent: formData.isUrgent === true,
        });
      } else if (createType === 'announcement') {
        await adminApi.createAnnouncement({
          title: formData.title,
          content: formData.content,
          category: formData.category || 'General',
          priority: formData.priority || 'NORMAL',
        });
      }
      setShowCreateModal(false);
      setFormData({});
      loadAdminData();
    } catch {
      alert('Failed to create item');
    } finally {
      setIsSubmitting(false);
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
              <span className="text-xs text-slate-400">Institutional Governance & Audit Console</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
              <span>NEXORA Knowledge & Operations Panel</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <GlassBadge variant="success" size="md">
              <Activity className="w-3.5 h-3.5 mr-1" />
              System Status: {metrics?.systemHealth || 'Optimal'}
            </GlassBadge>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={() => {
                setCreateType(
                  activeTab === 'Locations'
                    ? 'location'
                    : activeTab === 'People'
                    ? 'person'
                    : activeTab === 'Services'
                    ? 'service'
                    : activeTab === 'Announcements'
                    ? 'announcement'
                    : 'location'
                );
                setShowCreateModal(true);
              }}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create Item
            </GlassButton>
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
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
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
            {/* OVERVIEW TAB */}
            {activeTab === 'Overview' && (
              <div className="space-y-6">
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
                      <span className="text-xs font-semibold text-slate-400">Security & RBAC</span>
                    </div>
                    <div className="text-2xl font-extrabold text-white">Strict</div>
                    <p className="text-[11px] text-slate-400 mt-1">Multi-tenant isolation enforced</p>
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
                                      onClick={() => handleAction(item.id, 'approved', item.type)}
                                      className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-500"
                                    >
                                      <Check className="w-3 h-3 mr-1" />
                                      Approve
                                    </GlassButton>
                                    <GlassButton
                                      variant="danger"
                                      size="sm"
                                      onClick={() => handleAction(item.id, 'rejected', item.type)}
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
              </div>
            )}

            {/* LOCATIONS TAB */}
            {activeTab === 'Locations' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-sky-400" />
                    <span>Community Physical Locations ({locations.length})</span>
                  </h3>
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setCreateType('location');
                      setShowCreateModal(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Location
                  </GlassButton>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {locations.map((loc) => (
                    <GlassCard key={loc.id} className="p-4 border-white/10 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="font-semibold text-white text-sm">{loc.name}</div>
                        <GlassBadge variant="primary" size="sm">{loc.category}</GlassBadge>
                      </div>
                      <div className="text-xs text-slate-400">
                        {loc.building} &bull; {loc.floor} &bull; Room {loc.room}
                      </div>
                      {loc.description && (
                        <p className="text-xs text-slate-300 line-clamp-2">{loc.description}</p>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-400">
                        <span>Accessible: {loc.accessible ? 'Yes' : 'No'}</span>
                        <span className="text-sky-400 font-mono">ID: {loc.id.substring(0, 8)}...</span>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            )}

            {/* PEOPLE TAB */}
            {activeTab === 'People' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>Faculty & Staff Directory ({people.length})</span>
                  </h3>
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setCreateType('person');
                      setShowCreateModal(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Register Person
                  </GlassButton>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {people.map((p) => (
                    <GlassCard key={p.id} className="p-4 border-white/10 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-white text-sm">{p.name}</div>
                          <div className="text-xs text-slate-400">{p.role} &bull; {p.department}</div>
                        </div>
                        <GlassBadge variant="success" size="sm">{p.availability}</GlassBadge>
                      </div>
                      <div className="text-xs text-slate-300">
                        <span className="text-slate-400">Email:</span> {p.email}
                      </div>
                      {p.officeHours && (
                        <div className="text-xs text-slate-300">
                          <span className="text-slate-400">Hours:</span> {p.officeHours}
                        </div>
                      )}
                    </GlassCard>
                  ))}
                </div>
              </div>
            )}

            {/* SERVICES TAB */}
            {activeTab === 'Services' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                    <span>Institutional Services ({services.length})</span>
                  </h3>
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setCreateType('service');
                      setShowCreateModal(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Service
                  </GlassButton>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((s) => (
                    <GlassCard key={s.id} className="p-4 border-white/10 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="font-semibold text-white text-sm">{s.name}</div>
                        {s.isUrgent && <GlassBadge variant="error" size="sm">Urgent</GlassBadge>}
                      </div>
                      <div className="text-xs text-slate-400">{s.department} &bull; {s.category}</div>
                      <p className="text-xs text-slate-300 line-clamp-2">{s.description}</p>
                      <div className="text-[11px] text-slate-400 pt-2 border-t border-white/5">
                        Hours: {s.hours}
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            )}

            {/* PROCEDURES TAB */}
            {activeTab === 'Procedures' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>Official Guidelines & Procedures ({procedures.length})</span>
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {procedures.map((prc) => (
                    <GlassCard key={prc.id} className="p-4 border-white/10 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-white text-sm">{prc.title}</div>
                          <div className="text-xs text-slate-400">{prc.category} &bull; {prc.responsibleOffice}</div>
                        </div>
                        <GlassBadge variant="success" size="sm">Active</GlassBadge>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 mb-1">Requirements:</div>
                        <div className="flex flex-wrap gap-1">
                          {prc.requiredDocuments.map((doc, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-slate-300 border border-white/5">
                              {doc}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 mb-1">Steps:</div>
                        <ol className="text-xs text-slate-300 list-decimal list-inside space-y-0.5">
                          {prc.steps.slice(0, 3).map((st, idx) => (
                            <li key={idx} className="truncate">{st}</li>
                          ))}
                        </ol>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            )}

            {/* ANNOUNCEMENTS TAB */}
            {activeTab === 'Announcements' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span>Community Broadcasts & Alerts ({announcements.length})</span>
                  </h3>
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setCreateType('announcement');
                      setShowCreateModal(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Post Announcement
                  </GlassButton>
                </div>
                <div className="space-y-3">
                  {announcements.map((a) => (
                    <GlassCard key={a.id} className="p-4 border-white/10 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{a.title}</span>
                          <GlassBadge
                            variant={a.priority === 'critical' ? 'error' : a.priority === 'urgent' ? 'warning' : 'default'}
                            size="sm"
                          >
                            {a.priority.toUpperCase()}
                          </GlassBadge>
                        </div>
                        <p className="text-xs text-slate-300">{a.message}</p>
                        <div className="text-[11px] text-slate-400">{a.department} &bull; {formatDate(a.timestamp)}</div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            )}

            {/* AUDIT TRAIL TAB */}
            {activeTab === 'Audit Trail' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <History className="w-4 h-4 text-emerald-400" />
                      <span>Security & Operational Audit Trail</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Immutable record of administrative actions, verifications, and auth events.
                    </p>
                  </div>
                  <GlassBadge variant="default" size="sm">
                    {auditLogs.length} Events Logged
                  </GlassBadge>
                </div>

                <div className="rounded-2xl glass-panel border border-white/10 overflow-hidden shadow-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 border-b border-white/10 text-slate-400 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Resource</th>
                        <th className="px-4 py-3">User ID</th>
                        <th className="px-4 py-3">IP Address</th>
                        <th className="px-4 py-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {auditLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-2.5 font-mono text-[11px] font-semibold text-amber-400">
                            {log.action}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-sky-300">
                            {log.resource_type || 'N/A'} {log.resource_id ? `(${log.resource_id.substring(0, 8)}...)` : ''}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">
                            {log.user_id ? log.user_id.substring(0, 8) + '...' : 'System'}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">
                            {log.ip_address || '127.0.0.1'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 text-[11px]">
                            {log.created_at ? formatDate(log.created_at) : 'Just now'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Create Item Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <GlassCard variant="elevated" className="w-full max-w-md p-6 border-white/20 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-white capitalize">Create {createType}</h4>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-3">
                {createType === 'location' && (
                  <>
                    <GlassInput
                      label="Location Name"
                      placeholder="Physics Lecture Hall A"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <GlassInput
                        label="Room Number"
                        placeholder="104"
                        value={formData.room || ''}
                        onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      />
                      <GlassInput
                        label="Floor"
                        placeholder="Floor 1"
                        value={formData.floor || ''}
                        onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                      />
                    </div>
                    <GlassInput
                      label="Category"
                      placeholder="lecture_hall, lab, room"
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                    <GlassInput
                      label="Description"
                      placeholder="Smart podium equipped"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </>
                )}

                {createType === 'person' && (
                  <>
                    <GlassInput
                      label="Full Name"
                      placeholder="Dr. Sarah Connor"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <GlassInput
                        label="Role / Title"
                        placeholder="Associate Professor"
                        required
                        value={formData.role || ''}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      />
                      <GlassInput
                        label="Department"
                        placeholder="Computer Science"
                        required
                        value={formData.department || ''}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      />
                    </div>
                    <GlassInput
                      label="Email"
                      type="email"
                      placeholder="sarah.c@nexora.edu"
                      required
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <GlassInput
                      label="Office Hours"
                      placeholder="Tue & Thu 2-4 PM"
                      value={formData.officeHours || ''}
                      onChange={(e) => setFormData({ ...formData, officeHours: e.target.value })}
                    />
                  </>
                )}

                {createType === 'service' && (
                  <>
                    <GlassInput
                      label="Service Name"
                      placeholder="Academic Counseling Center"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <GlassInput
                        label="Department"
                        placeholder="Student Affairs"
                        required
                        value={formData.department || ''}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      />
                      <GlassInput
                        label="Category"
                        placeholder="Academic"
                        value={formData.category || ''}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      />
                    </div>
                    <GlassInput
                      label="Description"
                      placeholder="Confidential academic guidance"
                      required
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </>
                )}

                {createType === 'announcement' && (
                  <>
                    <GlassInput
                      label="Headline"
                      placeholder="Campus Water Maintenance"
                      required
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                    <GlassInput
                      label="Message Content"
                      placeholder="Scheduled maintenance will occur..."
                      required
                      value={formData.content || ''}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <GlassInput
                        label="Priority"
                        placeholder="NORMAL, IMPORTANT, URGENT"
                        value={formData.priority || 'NORMAL'}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      />
                      <GlassInput
                        label="Category"
                        placeholder="Maintenance, Academic, Emergency"
                        value={formData.category || 'General'}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-end gap-2 pt-3">
                  <GlassButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </GlassButton>
                  <GlassButton
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSubmitting}
                    className="bg-amber-600 hover:bg-amber-500"
                  >
                    Save & Submit
                  </GlassButton>
                </div>
              </form>
            </GlassCard>
          </div>
        )}
      </div>
    </AppShell>
  );
}
