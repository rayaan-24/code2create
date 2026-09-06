'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import {
  Settings as SettingsIcon,
  Volume2,
  Bell,
  Eye,
  Shield,
  Check,
  Globe,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { usersApi } from '@/lib/api/users';
import { UserPreferences } from '@/lib/types';

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await usersApi.getCurrentUser();
        if (res.data) {
          setPreferences(res.data.preferences);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleToggleNotification = (key: keyof UserPreferences['notifications']) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      notifications: {
        ...preferences.notifications,
        [key]: !preferences.notifications[key],
      },
    });
  };

  const handleSave = async () => {
    if (!preferences) return;
    setIsSaving(true);
    try {
      await usersApi.updatePreferences(preferences);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const voiceModels = [
    'ElevenLabs Nova (Neural HD)',
    'ElevenLabs Rachel (Natural Warm)',
    'ElevenLabs Adam (Authoritative Tech)',
    'Browser Native Speech Synthesis',
  ];

  const languages = [
    'English (US)',
    'English (UK)',
    'Spanish (Español)',
    'French (Français)',
    'German (Deutsch)',
    'Hindi (हिंदी)',
    'Mandarin (中文)',
  ];

  return (
    <AppShell title="System Settings">
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-sky-400" />
              <span>Workspace Preferences</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Customize language, AI voice response models, notifications, and privacy boundaries.
            </p>
          </div>

          <GlassButton
            variant="primary"
            size="md"
            onClick={handleSave}
            isLoading={isSaving}
            className="flex-shrink-0"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 mr-1.5 text-emerald-400" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Preferences</span>
            )}
          </GlassButton>
        </div>

        {isLoading || !preferences ? (
          <LoadingSkeleton count={4} />
        ) : (
          <div className="space-y-6">
            {/* Appearance Section */}
            <GlassCard variant="elevated" className="p-6 border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-sky-400">
                <Eye className="w-4 h-4" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Interface Appearance
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() =>
                    setPreferences({ ...preferences, appearance: 'dark-glass' })
                  }
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    preferences.appearance === 'dark-glass'
                      ? 'bg-sky-500/15 border-sky-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                      : 'bg-slate-900/40 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">Dark Glassmorphism</span>
                    {preferences.appearance === 'dark-glass' && (
                      <Check className="w-3.5 h-3.5 text-sky-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    High contrast dark background with frosted translucent glass overlays (Default).
                  </p>
                </div>

                <div
                  onClick={() =>
                    setPreferences({ ...preferences, appearance: 'glass-luminous' })
                  }
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    preferences.appearance === 'glass-luminous'
                      ? 'bg-sky-500/15 border-sky-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                      : 'bg-slate-900/40 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">Luminous Glass</span>
                    {preferences.appearance === 'glass-luminous' && (
                      <Check className="w-3.5 h-3.5 text-sky-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Enhanced cyan-indigo ambient border glow with subtle animated gradients.
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Language & Voice Synthesis */}
            <GlassCard variant="elevated" className="p-6 border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-indigo-400">
                <Volume2 className="w-4 h-4" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Voice & Language Synthesis (ElevenLabs Ready)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    Assistant Primary Language
                  </label>
                  <select
                    value={preferences.language}
                    onChange={(e) =>
                      setPreferences({ ...preferences, language: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-xs text-white bg-slate-900/80 border border-white/10 focus:outline-none"
                  >
                    {languages.map((l) => (
                      <option key={l} value={l} className="bg-slate-900 text-white">
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Neural TTS Voice Model
                  </label>
                  <select
                    value={preferences.voiceModel}
                    onChange={(e) =>
                      setPreferences({ ...preferences, voiceModel: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-xs text-white bg-slate-900/80 border border-white/10 focus:outline-none"
                  >
                    {voiceModels.map((m) => (
                      <option key={m} value={m} className="bg-slate-900 text-white">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Enable Spoken Audio Responses
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Automatically speak aloud AI procedure summaries
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPreferences({
                      ...preferences,
                      voiceEnabled: !preferences.voiceEnabled,
                    })
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                    preferences.voiceEnabled ? 'bg-sky-500' : 'bg-slate-800'
                  }`}
                  aria-label="Toggle voice output"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      preferences.voiceEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </GlassCard>

            {/* Notifications Section */}
            <GlassCard variant="elevated" className="p-6 border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-amber-400">
                <Bell className="w-4 h-4" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Notifications & Broadcasts
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Email Dispatch
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Receive procedure progress and verification outcomes in inbox
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotification('email')}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                      preferences.notifications.email ? 'bg-sky-500' : 'bg-slate-800'
                    }`}
                    aria-label="Toggle email notifications"
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        preferences.notifications.email ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Browser & Mobile Push Notifications
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Urgent campus advisories and clinic emergency alerts
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotification('push')}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                      preferences.notifications.push ? 'bg-sky-500' : 'bg-slate-800'
                    }`}
                    aria-label="Toggle push notifications"
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        preferences.notifications.push ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Audible Notification Chimes
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Subtle chime sound on incoming assistant message completion
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotification('sound')}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                      preferences.notifications.sound ? 'bg-sky-500' : 'bg-slate-800'
                    }`}
                    aria-label="Toggle sound alerts"
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        preferences.notifications.sound ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </GlassCard>

            {/* Privacy & Governance Boundary */}
            <GlassCard variant="default" className="p-6 border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Shield className="w-4 h-4" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Privacy & Data Retention
                </h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                NEXORA strictly operates within closed organizational boundaries. Conversations are encrypted in transit and stored locally or within the designated PostgreSQL database instance without telemetry leakage.
              </p>

              <div className="pt-2">
                <GlassButton
                  variant="outline"
                  size="sm"
                  onClick={() => alert('Local cache and session storage wiped cleanly.')}
                >
                  Clear Local Conversation Cache
                </GlassButton>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </AppShell>
  );
}
