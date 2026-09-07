'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await usersApi.getCurrentUser();
        if (res.data) {
          setPreferences(res.data.preferences);
        } else if (res.error) {
          setError(res.error);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load system preferences');
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
    setError(null);
    try {
      const res = await usersApi.updatePreferences(preferences);
      if (res.data) {
        setPreferences(res.data.preferences);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      } else if (res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save settings');
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
      <div className="p-3.5 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-5 sm:space-y-6">
        {error && <ErrorBanner message={error} />}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#111111] flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#EB4D6E]" />
              <span>Workspace Preferences</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#5C4B52] font-medium mt-1">
              Customize language, AI voice response models, notifications, and privacy boundaries.
            </p>
          </div>

          <div className="self-start sm:self-auto">
            <GlassButton
              variant="primary"
              size="md"
              onClick={handleSave}
              isLoading={isSaving}
              className="flex-shrink-0"
              disabled={isLoading || !preferences}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-1.5 text-white font-bold" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Preferences</span>
              )}
            </GlassButton>
          </div>
        </div>

        {isLoading || !preferences ? (
          <LoadingSkeleton count={4} />
        ) : (
          <div className="space-y-5 sm:space-y-6">
            {/* Appearance Section */}
            <GlassCard variant="elevated" className="p-4 sm:p-6 bg-white/95 border-2 border-[rgba(160,50,85,0.2)] shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-[#EB4D6E]">
                <Eye className="w-4 h-4" />
                <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider">
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
                      ? 'bg-[#FFE2E8] border-2 border-[#EB4D6E] text-[#111111] shadow-xs'
                      : 'bg-white border border-[rgba(160,50,85,0.2)] text-[#111111] hover:border-[#EB4D6E]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#111111]">Lusion Spatial Light</span>
                    {preferences.appearance === 'dark-glass' && (
                      <Check className="w-3.5 h-3.5 text-[#B82346]" />
                    )}
                  </div>
                  <p className="text-[11px] text-[#5C4B52] font-medium">
                    Crisp, high-contrast blush surfaces with sculptural typography and fluid spatial feel.
                  </p>
                </div>

                <div
                  onClick={() =>
                    setPreferences({ ...preferences, appearance: 'glass-luminous' })
                  }
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    preferences.appearance === 'glass-luminous'
                      ? 'bg-[#FFE2E8] border-2 border-[#EB4D6E] text-[#111111] shadow-xs'
                      : 'bg-white border border-[rgba(160,50,85,0.2)] text-[#111111] hover:border-[#EB4D6E]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#111111]">Ambient Rose Glass</span>
                    {preferences.appearance === 'glass-luminous' && (
                      <Check className="w-3.5 h-3.5 text-[#B82346]" />
                    )}
                  </div>
                  <p className="text-[11px] text-[#5C4B52] font-medium">
                    Enhanced soft rose ambient glow with subtle animated gradients and floating orbs.
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Language & Voice Synthesis */}
            <GlassCard variant="elevated" className="p-6 bg-white/95 border-2 border-[rgba(160,50,85,0.2)] shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-[#EB4D6E]">
                <Volume2 className="w-4 h-4" />
                <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider">
                  Voice & Language Synthesis (ElevenLabs Ready)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#EB4D6E]" />
                    Assistant Primary Language
                  </label>
                  <select
                    value={preferences.language}
                    onChange={(e) =>
                      setPreferences({ ...preferences, language: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-xs font-semibold text-[#111111] bg-white border border-[rgba(160,50,85,0.24)] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#EB4D6E]/25 cursor-pointer"
                  >
                    {languages.map((l) => (
                      <option key={l} value={l} className="bg-white text-[#111111]">
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#EB4D6E]" />
                    Neural TTS Voice Model
                  </label>
                  <select
                    value={preferences.voiceModel}
                    onChange={(e) =>
                      setPreferences({ ...preferences, voiceModel: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl text-base sm:text-xs font-semibold text-[#111111] bg-white border border-[rgba(160,50,85,0.24)] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#EB4D6E]/25 cursor-pointer"
                  >
                    {voiceModels.map((m) => (
                      <option key={m} value={m} className="bg-white text-[#111111]">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[rgba(160,50,85,0.12)]">
                <div>
                  <span className="text-xs font-bold text-[#111111] block">
                    Enable Spoken Audio Responses
                  </span>
                  <span className="text-[11px] text-[#5C4B52] font-medium">
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
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 cursor-pointer ${
                    preferences.voiceEnabled ? 'bg-[#EB4D6E]' : 'bg-rose-100 border border-rose-300'
                  }`}
                  aria-label="Toggle voice output"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                      preferences.voiceEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </GlassCard>

            {/* Notifications Section */}
            <GlassCard variant="elevated" className="p-6 bg-white/95 border-2 border-[rgba(160,50,85,0.2)] shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-amber-700">
                <Bell className="w-4 h-4" />
                <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider">
                  Notifications & Broadcasts
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[rgba(160,50,85,0.1)]">
                  <div>
                    <span className="text-xs font-bold text-[#111111] block">
                      Email Dispatch
                    </span>
                    <span className="text-[11px] text-[#5C4B52] font-medium">
                      Receive procedure progress and verification outcomes in inbox
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotification('email')}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 cursor-pointer ${
                      preferences.notifications.email ? 'bg-[#EB4D6E]' : 'bg-rose-100 border border-rose-300'
                    }`}
                    aria-label="Toggle email notifications"
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                        preferences.notifications.email ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[rgba(160,50,85,0.1)]">
                  <div>
                    <span className="text-xs font-bold text-[#111111] block">
                      Browser & Mobile Push Notifications
                    </span>
                    <span className="text-[11px] text-[#5C4B52] font-medium">
                      Urgent campus advisories and clinic emergency alerts
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotification('push')}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 cursor-pointer ${
                      preferences.notifications.push ? 'bg-[#EB4D6E]' : 'bg-rose-100 border border-rose-300'
                    }`}
                    aria-label="Toggle push notifications"
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                        preferences.notifications.push ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-xs font-bold text-[#111111] block">
                      Audible Notification Chimes
                    </span>
                    <span className="text-[11px] text-[#5C4B52] font-medium">
                      Subtle chime sound on incoming assistant message completion
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotification('sound')}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 cursor-pointer ${
                      preferences.notifications.sound ? 'bg-[#EB4D6E]' : 'bg-rose-100 border border-rose-300'
                    }`}
                    aria-label="Toggle sound alerts"
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                        preferences.notifications.sound ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </GlassCard>

            {/* Privacy & Governance Boundary */}
            <GlassCard variant="default" className="p-6 bg-white/95 border-2 border-[rgba(160,50,85,0.2)] shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <Shield className="w-4 h-4" />
                <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider">
                  Privacy & Data Retention
                </h3>
              </div>

              <p className="text-xs text-[#2D2226] leading-relaxed font-normal">
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
