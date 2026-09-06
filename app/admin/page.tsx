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
  Brain,
  Compass,
  HelpCircle,
  TrendingUp,
  Lightbulb,
  ArrowUpRight,
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
  const [confusionData, setConfusionData] = useState<any | null>(null);

  const [activeTab, setActiveTab] = useState('Overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'location' | 'person' | 'service' | 'procedure' | 'announcement'>('location');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const adminTabs = [
    'Overview',
    'Confusion Map',
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
      const [mRes, qRes, locRes, peoRes, srvRes, prcRes, annRes, audRes, confRes] = await Promise.all([
        adminApi.getDashboardMetrics(),
        adminApi.getPendingVerifications(),
        locationsApi.getLocations(),
        peopleApi.searchPeople(),
        servicesApi.getServices(),
        proceduresApi.getProcedures(),
        announcementsApi.getAnnouncements(),
        adminApi.getAuditLogs(1, 15),
        adminApi.getConfusionMap(),
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
      if (confRes.data) setConfusionData(confRes.data);
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
      } else if (createType === 'procedure') {
        await adminApi.createProcedure({
          title: formData.title || 'New Procedure',
          category: formData.category || 'General',
          responsible_office: formData.responsibleOffice || 'Administration',
          description: formData.description || '',
          required_documents: formData.requiredDocuments ? formData.requiredDocuments.split(',').map((s: string) => s.trim()) : [],
          steps: formData.steps ? formData.steps.split('\n').filter(Boolean) : ['Submit application', 'Verification'],
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
      <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GlassBadge variant="warning" size="sm">
                Restricted Access
              </GlassBadge>
              <span className="text-xs text-[#5C4B52] font-bold">Institutional Governance & Audit</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#111111] flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-[#EB4D6E]" />
              <span>NEXORA Knowledge & Operations Panel</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <GlassBadge variant="success" size="md">
              <Activity className="w-3.5 h-3.5 mr-1 text-emerald-700" />
              Status: {metrics?.systemHealth || 'Optimal'}
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
              className="text-white font-bold text-xs shadow-xs"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create Item
            </GlassButton>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b-2 border-[rgba(160,50,85,0.18)]">
          {adminTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#FFE2E8] text-[#B82346] border-2 border-[#EB4D6E] shadow-xs'
                  : 'text-[#5C4B52] hover:text-[#111111] hover:bg-[#FFE2E8]/60 border border-transparent'
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
                  <GlassCard variant="default" className="p-5 border-2 border-[rgba(160,50,85,0.22)] bg-white shadow-xs">
                    <div className="flex items-center justify-between text-[#B82346] mb-2">
                      <Database className="w-5 h-5 text-[#EB4D6E]" />
                      <span className="text-xs font-bold text-[#5C4B52] uppercase tracking-wider">Knowledge Items</span>
                    </div>
                    <div className="text-2xl font-black text-[#111111]">
                      {metrics.totalKnowledgeItems.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-[#5C4B52] font-semibold mt-1">
                      Active documents, rules & procedures
                    </p>
                  </GlassCard>

                  <GlassCard variant="default" className="p-5 border-2 border-emerald-200 bg-emerald-50/70 shadow-xs">
                    <div className="flex items-center justify-between text-emerald-800 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Verified & Grounded</span>
                    </div>
                    <div className="text-2xl font-black text-[#111111]">
                      {metrics.verifiedItems.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-emerald-800 font-semibold mt-1">High confidence community truth</p>
                  </GlassCard>

                  <GlassCard variant="default" className="p-5 border-2 border-amber-200 bg-amber-50/70 shadow-xs">
                    <div className="flex items-center justify-between text-amber-800 mb-2">
                      <Clock className="w-5 h-5 text-amber-700" />
                      <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Pending Review</span>
                    </div>
                    <div className="text-2xl font-black text-amber-900">
                      {metrics.pendingReview}
                    </div>
                    <p className="text-[11px] text-amber-800 font-semibold mt-1">Awaiting registry sign-off</p>
                  </GlassCard>

                  <GlassCard variant="default" className="p-5 border-2 border-rose-200 bg-rose-50/70 shadow-xs">
                    <div className="flex items-center justify-between text-[#B82346] mb-2">
                      <AlertTriangle className="w-5 h-5 text-[#EB4D6E]" />
                      <span className="text-xs font-bold text-[#B82346] uppercase tracking-wider">Security & RBAC</span>
                    </div>
                    <div className="text-2xl font-black text-[#111111]">Strict</div>
                    <p className="text-[11px] text-[#5C4B52] font-semibold mt-1">Multi-tenant isolation enforced</p>
                  </GlassCard>
                </div>

                {/* Pending Verification Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-[#111111] flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#EB4D6E]" />
                        <span>Pending Institutional Verifications</span>
                      </h3>
                      <p className="text-xs text-[#5C4B52] font-medium">
                        Items submitted by departmental heads requiring publication authorization.
                      </p>
                    </div>
                    <span className="text-xs text-[#111111] font-bold font-mono bg-[#FFE2E8] px-2.5 py-1 rounded-lg border border-[#EB4D6E]/30">
                      {queue.filter((q) => q.status === 'pending').length} Action Items
                    </span>
                  </div>

                  <div className="rounded-2xl bg-white border-2 border-[rgba(160,50,85,0.22)] overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FFF0F4] border-b-2 border-[rgba(160,50,85,0.18)] text-[#5C4B52] uppercase font-black tracking-wider">
                          <tr>
                            <th className="px-4 py-3.5">Title & Directive</th>
                            <th className="px-4 py-3.5">Category</th>
                            <th className="px-4 py-3.5">Submitted By</th>
                            <th className="px-4 py-3.5">Timestamp</th>
                            <th className="px-4 py-3.5">Status</th>
                            <th className="px-4 py-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgba(160,50,85,0.12)] text-[#2D2226]">
                          {queue.map((item) => (
                            <tr key={item.id} className="hover:bg-[#FFF8FA] transition-colors">
                              <td className="px-4 py-3.5 font-medium text-[#111111] max-w-xs">
                                <div className="truncate font-bold text-[#111111]">{item.title}</div>
                                {item.notes && (
                                  <div className="text-[11px] text-[#5C4B52] truncate mt-0.5 font-medium">
                                    {item.notes}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3.5 uppercase font-mono text-[10px] text-[#B82346] font-bold">
                                {item.type}
                              </td>
                              <td className="px-4 py-3.5 text-[#111111] font-semibold">{item.submittedBy}</td>
                              <td className="px-4 py-3.5 text-[#5C4B52] font-mono text-[11px] font-medium">
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
                                      className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 font-bold"
                                    >
                                      <Check className="w-3 h-3 mr-1" />
                                      Approve
                                    </GlassButton>
                                    <GlassButton
                                      variant="danger"
                                      size="sm"
                                      onClick={() => handleAction(item.id, 'rejected', item.type)}
                                      className="h-7 px-2 text-[11px] font-bold"
                                    >
                                      <X className="w-3 h-3 mr-1" />
                                      Reject
                                    </GlassButton>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-[#5C4B52] font-semibold italic">Resolved</span>
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

            {/* CONFUSION MAP & KNOWLEDGE GAPS TAB */}
            {activeTab === 'Confusion Map' && (
              <div className="space-y-6">
                {/* Header Banner */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-[#FFE2E8] via-[#FFF0F4] to-white border-2 border-[rgba(160,50,85,0.22)] shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <GlassBadge variant="default" size="sm" className="bg-[#FFE2E8] text-[#B82346] border border-[#EB4D6E]/40 font-bold">
                          <Brain className="w-3.5 h-3.5 mr-1 text-[#EB4D6E]" />
                          AI Semantic Intelligence
                        </GlassBadge>
                        <span className="text-xs text-[#5C4B52] font-semibold">Automated Community Telemetry</span>
                      </div>
                      <h3 className="text-lg font-black text-[#111111] flex items-center gap-2">
                        <span>AI Confusion Map & Knowledge Gap Analytics</span>
                      </h3>
                      <p className="text-xs text-[#2D2226] font-medium mt-1 max-w-2xl leading-relaxed">
                        Synthesizes multi-turn conversations to surface institutional bottlenecks, contradictory policies, unverified inquiries, and high-frequency navigation destinations.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <GlassBadge variant="warning" size="md">
                        {confusionData?.knowledge_gaps?.length || 3} Actionable Gaps
                      </GlassBadge>
                    </div>
                  </div>
                </div>

                {/* Grid of Analytical Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Procedural Friction & Ambiguity */}
                  <GlassCard className="p-5 border-2 border-[rgba(160,50,85,0.22)] bg-white shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[#EB4D6E]" />
                        <h4 className="text-sm font-black text-[#111111]">Procedural Friction & Ambiguity</h4>
                      </div>
                      <span className="text-[11px] text-[#5C4B52] font-bold">High multi-turn hesitation</span>
                    </div>

                    <div className="space-y-3">
                      {(confusionData?.confusing_procedures || [
                        {
                          title: 'ID Card Replacement',
                          friction_score: 78,
                          primary_confusion: 'Users frequently ask where to pay the $15 fee before visiting SJT-G12.',
                          recommendation: 'Add explicit online fee payment link in procedure Step 1.',
                        },
                        {
                          title: 'Bonafide Certificate',
                          friction_score: 64,
                          primary_confusion: 'Turnaround time expectation (48 hours vs same-day).',
                          recommendation: "Clarify that urgent requests require Dean's signature.",
                        },
                      ]).map((item: any, idx: number) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-[#FFF8FA] border border-[rgba(160,50,85,0.18)] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#111111]">{item.title}</span>
                            <span className="text-[11px] font-mono font-bold text-[#B82346]">Friction: {item.friction_score}%</span>
                          </div>
                          <div className="w-full h-2 bg-rose-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#EB4D6E] to-[#B82346] rounded-full"
                              style={{ width: `${item.friction_score}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-[#2D2226] font-semibold italic">&ldquo;{item.primary_confusion}&rdquo;</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200 font-bold">
                            <Lightbulb className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>Fix: {item.recommendation}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* Knowledge Gaps & Unanswered Questions */}
                  <GlassCard className="p-5 border-2 border-[rgba(160,50,85,0.22)] bg-white shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-[#EB4D6E]" />
                        <h4 className="text-sm font-black text-[#111111]">Unanswered Queries & Missing Policies</h4>
                      </div>
                      <span className="text-[11px] text-[#5C4B52] font-bold">Zero-grounding encounters</span>
                    </div>

                    <div className="space-y-3">
                      {(confusionData?.unanswered_questions || [
                        { query: 'Is the swimming pool open on Sunday mornings?', occurrences: 14, status: 'No Verified Policy' },
                        { query: 'How to register an external visitor vehicle overnight?', occurrences: 11, status: 'No Parking Guideline' },
                        { query: 'Can alumni access the digital library repository?', occurrences: 9, status: 'Under Review' },
                      ]).map((item: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-[#FFF8FA] border border-[rgba(160,50,85,0.18)] flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <p className="text-xs text-[#111111] font-bold">&ldquo;{item.query}&rdquo;</p>
                            <span className="text-[10px] text-[#5C4B52] font-semibold">{item.status} &bull; {item.occurrences} queries</span>
                          </div>
                          <GlassButton
                            variant="secondary"
                            size="sm"
                            className="text-[10px] py-1 px-2.5 shrink-0 text-[#B82346] border border-[#EB4D6E]/30 font-bold hover:bg-[#FFE2E8]"
                            onClick={() => {
                              setCreateType('procedure');
                              setShowCreateModal(true);
                            }}
                          >
                            + Draft
                          </GlassButton>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>

                {/* Lower Row: Knowledge Action Items & Navigation Hotspots */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Knowledge Remediation Plan */}
                  <GlassCard className="p-5 border-2 border-[rgba(160,50,85,0.22)] bg-white shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#EB4D6E]" />
                        <h4 className="text-sm font-black text-[#111111]">Recommended Knowledge Updates</h4>
                      </div>
                      <span className="text-[11px] text-[#5C4B52] font-bold">High priority gaps</span>
                    </div>

                    <div className="space-y-3">
                      {(confusionData?.knowledge_gaps || [
                        {
                          title: 'Campus Weekend Sports Timings',
                          query_sample: 'Are campus recreational facilities open during public holidays?',
                          impact: 'HIGH',
                          suggested_action: 'Upload Sports Complex Operating Hours Document and verify.',
                        },
                        {
                          title: 'Overnight Visitor Parking Guidelines',
                          query_sample: 'Where can overnight guests park without a campus permit?',
                          impact: 'MEDIUM',
                          suggested_action: 'Create Campus Security Parking Policy procedure.',
                        },
                      ]).map((gap: any, idx: number) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-[#FFF8FA] border border-[rgba(160,50,85,0.18)] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#111111]">{gap.title}</span>
                            <GlassBadge variant={gap.impact === 'HIGH' ? 'error' : 'warning'} size="sm">
                              {gap.impact} IMPACT
                            </GlassBadge>
                          </div>
                          <p className="text-[11px] text-[#2D2226] font-medium">&ldquo;{gap.query_sample}&rdquo;</p>
                          <div className="text-[11px] text-[#5C4B52] font-semibold flex items-center gap-1.5 pt-1.5 border-t border-[rgba(160,50,85,0.12)]">
                            <ArrowUpRight className="w-3.5 h-3.5 text-[#EB4D6E] shrink-0" />
                            <span className="text-[#111111] font-bold">Action: {gap.suggested_action}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* Physical Navigation Hotspots */}
                  <GlassCard className="p-5 border-2 border-[rgba(160,50,85,0.22)] bg-white shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Compass className="w-4 h-4 text-emerald-700" />
                        <h4 className="text-sm font-black text-[#111111]">Frequently Requested Navigation Points</h4>
                      </div>
                      <span className="text-[11px] text-[#5C4B52] font-bold">Indoor wayfinding demand</span>
                    </div>

                    <div className="space-y-3">
                      {(confusionData?.frequently_requested_locations || [
                        { name: 'Student Services (SJT-G12)', building: 'SJT', floor: 'Ground Floor', navigation_requests: 210 },
                        { name: 'Central Library Main Entrance', building: 'Library', floor: 'Ground Floor', navigation_requests: 165 },
                        { name: 'IT Help Desk', building: 'SJT', floor: 'Floor 1', navigation_requests: 84 },
                        { name: 'Academic Affairs', building: 'SJT', floor: 'Floor 2', navigation_requests: 72 },
                      ]).map((loc: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-[#FFF8FA] border border-[rgba(160,50,85,0.18)] flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-[#111111]">{loc.name}</div>
                            <div className="text-[11px] text-[#5C4B52] font-semibold">{loc.building} &bull; {loc.floor}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-xs font-black text-emerald-800">{loc.navigation_requests}</span>
                            <div className="text-[10px] text-[#5C4B52] font-semibold">routes generated</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              </div>
            )}

            {/* LOCATIONS TAB */}
            {activeTab === 'Locations' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-[#111111] flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#EB4D6E]" />
                    <span>Community Physical Locations ({locations.length})</span>
                  </h3>
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setCreateType('location');
                      setShowCreateModal(true);
                    }}
                    className="shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Location
                  </GlassButton>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {locations.map((loc) => (
                    <GlassCard key={loc.id} className="p-4 border-2 border-[rgba(160,50,85,0.22)] bg-white shadow-xs space-y-2 hover:border-[#EB4D6E] transition-all">
                      <div className="flex items-start justify-between">
                        <div className="font-extrabold text-[#111111] text-sm">{loc.name}</div>
                        <GlassBadge variant="primary" size="sm">{loc.category}</GlassBadge>
                      </div>
                      <div className="text-xs text-[#5C4B52] font-semibold">
                        {loc.building} &bull; {loc.floor} &bull; Room {loc.room}
                      </div>
                      {loc.description && (
                        <p className="text-xs text-[#2D2226] font-medium line-clamp-2">{loc.description}</p>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-[rgba(160,50,85,0.12)] text-[11px] text-[#5C4B52] font-medium">
                        <span>Accessible: <strong className="text-[#111111]">{loc.accessible ? 'Yes' : 'No'}</strong></span>
                        <span className="text-[#B82346] font-mono font-bold">ID: {loc.id.substring(0, 8)}...</span>
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
                  <h3 className="text-base font-black text-[#111111] flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#EB4D6E]" />
                    <span>Faculty & Staff Directory ({people.length})</span>
                  </h3>
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setCreateType('person');
                      setShowCreateModal(true);
                    }}
                    className="shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Register Person
                  </GlassButton>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {people.map((p) => (
                    <GlassCard key={p.id} className="p-4 border-2 border-[rgba(160,50,85,0.22)] bg-white shadow-xs space-y-2 hover:border-[#EB4D6E] transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-extrabold text-[#111111] text-sm">{p.name}</div>
                          <div className="text-xs text-[#B82346] font-bold">{p.role} &bull; {p.department}</div>
                        </div>
                        <GlassBadge variant="success" size="sm">{p.availability}</GlassBadge>
                      </div>
                      <div className="text-xs text-[#2D2226] font-medium">
                        <span className="text-[#5C4B52] font-bold">Email:</span> {p.email}
                      </div>
                      {p.officeHours && (
                        <div className="text-xs text-[#2D2226] font-medium">
                          <span className="text-[#5C4B52] font-bold">Hours:</span> {p.officeHours}
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
                  <h3 className="text-base font-black text-[#111111] flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#EB4D6E]" />
                    <span>Institutional Services ({services.length})</span>
                  </h3>
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setCreateType('service');
                      setShowCreateModal(true);
                    }}
                    className="shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Service
                  </GlassButton>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((s) => (
                    <GlassCard key={s.id} className="p-4 border-2 border-[rgba(160,50,85,0.22)] bg-white shadow-xs space-y-2 hover:border-[#EB4D6E] transition-all">
                      <div className="flex items-start justify-between">
                        <div className="font-extrabold text-[#111111] text-sm">{s.name}</div>
                        {s.isUrgent && <GlassBadge variant="error" size="sm">Urgent</GlassBadge>}
                      </div>
                      <div className="text-xs text-[#B82346] font-bold">{s.department} &bull; {s.category}</div>
                      <p className="text-xs text-[#2D2226] font-medium line-clamp-2">{s.description}</p>
                      <div className="text-[11px] text-[#5C4B52] font-semibold pt-2 border-t border-[rgba(160,50,85,0.12)]">
                        Hours: <strong className="text-[#111111]">{s.hours}</strong>
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
                  <h3 className="text-base font-black text-[#111111] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#EB4D6E]" />
                    <span>Official Guidelines & Procedures ({procedures.length})</span>
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {procedures.map((prc) => (
                    <GlassCard key={prc.id} className="p-4 border-2 border-[rgba(160,50,85,0.22)] bg-white shadow-xs space-y-3 hover:border-[#EB4D6E] transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-extrabold text-[#111111] text-sm">{prc.title}</div>
                          <div className="text-xs text-[#B82346] font-bold">{prc.category} &bull; {prc.responsibleOffice}</div>
                        </div>
                        <GlassBadge variant="success" size="sm">Active</GlassBadge>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-[#5C4B52] uppercase tracking-wider mb-1">Requirements:</div>
                        <div className="flex flex-wrap gap-1">
                          {prc.requiredDocuments.map((doc, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded text-[10px] bg-[#FFE2E8] text-[#B82346] font-bold border border-[#EB4D6E]/30">
                              {doc}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-[#5C4B52] uppercase tracking-wider mb-1">Steps:</div>
                        <ol className="text-xs text-[#2D2226] font-medium list-decimal list-inside space-y-0.5">
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
                  <h3 className="text-base font-black text-[#111111] flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#EB4D6E]" />
                    <span>Community Broadcasts & Alerts ({announcements.length})</span>
                  </h3>
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setCreateType('announcement');
                      setShowCreateModal(true);
                    }}
                    className="shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Post Announcement
                  </GlassButton>
                </div>
                <div className="space-y-3">
                  {announcements.map((a) => (
                    <GlassCard key={a.id} className="p-4 border-2 border-[rgba(160,50,85,0.22)] bg-white shadow-xs flex items-start justify-between gap-4 hover:border-[#EB4D6E] transition-all">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[#111111] text-sm">{a.title}</span>
                          <GlassBadge
                            variant={a.priority === 'critical' ? 'error' : a.priority === 'urgent' ? 'warning' : 'default'}
                            size="sm"
                          >
                            {a.priority.toUpperCase()}
                          </GlassBadge>
                        </div>
                        <p className="text-xs text-[#2D2226] font-medium">{a.message}</p>
                        <div className="text-[11px] text-[#5C4B52] font-semibold">{a.department} &bull; {formatDate(a.timestamp)}</div>
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
                    <h3 className="text-base font-black text-[#111111] flex items-center gap-2">
                      <History className="w-4 h-4 text-[#EB4D6E]" />
                      <span>Security & Operational Audit Trail</span>
                    </h3>
                    <p className="text-xs text-[#5C4B52] font-medium">
                      Immutable record of administrative actions, verifications, and auth events.
                    </p>
                  </div>
                  <GlassBadge variant="default" size="sm">
                    {auditLogs.length} Events Logged
                  </GlassBadge>
                </div>

                <div className="rounded-2xl bg-white border-2 border-[rgba(160,50,85,0.22)] overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FFF0F4] border-b-2 border-[rgba(160,50,85,0.18)] text-[#5C4B52] uppercase font-black tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Resource</th>
                        <th className="px-4 py-3">User ID</th>
                        <th className="px-4 py-3">IP Address</th>
                        <th className="px-4 py-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(160,50,85,0.12)] text-[#2D2226]">
                      {auditLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-[#FFF8FA] transition-colors">
                          <td className="px-4 py-2.5 font-mono text-[11px] font-bold text-[#B82346]">
                            {log.action}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-[#111111] font-semibold">
                            {log.resource_type || 'N/A'} {log.resource_id ? `(${log.resource_id.substring(0, 8)}...)` : ''}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-[#5C4B52]">
                            {log.user_id ? log.user_id.substring(0, 8) + '...' : 'System'}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-[#5C4B52]">
                            {log.ip_address || '127.0.0.1'}
                          </td>
                          <td className="px-4 py-2.5 text-[#5C4B52] font-medium text-[11px]">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <GlassCard variant="elevated" className="w-full max-w-md p-6 bg-white border-2 border-[rgba(160,50,85,0.28)] rounded-3xl shadow-2xl space-y-4 text-[#111111]">
              <div className="flex items-center justify-between pb-2 border-b border-[rgba(160,50,85,0.14)]">
                <h4 className="text-base font-black text-[#111111] capitalize">Create New {createType}</h4>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-[#5C4B52] hover:text-[#111111] p-1 rounded-lg hover:bg-[#FFE2E8] transition-colors cursor-pointer"
                  aria-label="Close modal"
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

                {createType === 'procedure' && (
                  <>
                    <GlassInput
                      label="Procedure Title"
                      placeholder="Parking Permit Application"
                      required
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <GlassInput
                        label="Category"
                        placeholder="Security, Facilities, Administrative"
                        value={formData.category || 'General'}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      />
                      <GlassInput
                        label="Responsible Office"
                        placeholder="Security Office, Room 102"
                        value={formData.responsibleOffice || ''}
                        onChange={(e) => setFormData({ ...formData, responsibleOffice: e.target.value })}
                      />
                    </div>
                    <GlassInput
                      label="Required Documents (comma separated)"
                      placeholder="Student ID, Vehicle RC copy"
                      value={formData.requiredDocuments || ''}
                      onChange={(e) => setFormData({ ...formData, requiredDocuments: e.target.value })}
                    />
                    <GlassInput
                      label="Description"
                      placeholder="Step-by-step guideline for campus permits"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgba(160,50,85,0.14)]">
                  <GlassButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                    className="text-[#5C4B52] hover:text-[#111111] font-bold"
                  >
                    Cancel
                  </GlassButton>
                  <GlassButton
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSubmitting}
                    className="shadow-xs font-bold"
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
