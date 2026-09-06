'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Users,
  Compass,
  Mic,
  Search,
  CheckCircle2,
  Building2,
  Clock,
  Layers,
  Brain,
  Navigation as NavigationIcon,
} from 'lucide-react';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { GlassCard } from '@/components/ui/GlassCard';

export default function LandingPage() {
  const workflowSteps = [
    { title: 'Understand', desc: 'Deep intent & context parsing', icon: Brain },
    { title: 'Retrieve', desc: 'Verified community handbooks & databases', icon: Layers },
    { title: 'Reason', desc: 'Synthesize exact procedures & rules', icon: Sparkles },
    { title: 'Act', desc: 'Form completions & service requests', icon: CheckCircle2 },
    { title: 'Navigate', desc: 'Turn-by-turn indoor wayfinding', icon: NavigationIcon },
  ];

  const features = [
    {
      title: 'Ask Naturally',
      desc: 'Speak or type in plain natural language. No rigid keywords, no confusing multi-level menus, and no category guessing.',
      icon: Sparkles,
      tag: 'Intuitive AI',
    },
    {
      title: 'Get Verified Answers',
      desc: 'Ground truth answers sourced strictly from university & enterprise handbooks, administrative gazettes, and official policies.',
      icon: ShieldCheck,
      tag: 'Zero Hallucination',
    },
    {
      title: 'Find People & Services',
      desc: 'Instantly locate faculty, administrative officers, labs, clinics, student wellness facilities, and registrar counters.',
      icon: Users,
      tag: 'Unified Directory',
    },
    {
      title: 'Navigate Physical Spaces',
      desc: 'Direct turn-by-turn indoor routing across towers, floors, and classrooms with ETA and accessibility routing.',
      icon: MapPin,
      tag: 'Indoor Wayfinding',
    },
    {
      title: 'Voice-First Interaction',
      desc: 'Hands-free conversational assistant powered by low-latency neural speech synthesis and voice capture.',
      icon: Mic,
      tag: 'Neural Voice',
    },
    {
      title: 'Search Beyond Community',
      desc: 'Intelligently falls back to curated external web search when local domain knowledge needs broader validation.',
      icon: Search,
      tag: 'Hybrid Search',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col selection:bg-sky-500/30 selection:text-white">
      {/* Top Glass Navbar */}
      <nav className="sticky top-0 z-50 px-6 py-4 glass-panel border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(56,189,248,0.35)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-wider text-white">NEXORA</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] text-sky-400 font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-400/20">
              Closed-Community OS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <GlassButton variant="ghost" size="sm">
              Sign In
            </GlassButton>
          </Link>
          <Link href="/register">
            <GlassButton variant="primary" size="sm">
              Get Started
            </GlassButton>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-16 md:pt-28 md:pb-24 max-w-7xl mx-auto flex flex-col items-center text-center">
        <GlassBadge variant="primary" size="md" className="mb-6 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>Next-Generation Intelligent Campus & Enterprise Assistant</span>
        </GlassBadge>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-5xl leading-[1.1]">
          Your Community. <br className="hidden sm:block" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400">
            One Intelligent Interface.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl font-light leading-relaxed">
          Understand your community. Find the right information, people and places. Get things done with zero friction.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <Link href="/chat">
            <GlassButton size="lg" variant="primary" className="shadow-[0_0_30px_rgba(56,189,248,0.3)]">
              <span>Start Conversation</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </GlassButton>
          </Link>
          <Link href="/dashboard">
            <GlassButton size="lg" variant="secondary">
              <Compass className="w-4 h-4 mr-2 text-sky-400" />
              <span>Explore NEXORA</span>
            </GlassButton>
          </Link>
        </div>

        {/* Hero Interactive Glass Assistant Preview */}
        <div className="w-full max-w-4xl mt-16 p-3 sm:p-4 rounded-3xl glass-panel-elevated border border-white/20 shadow-2xl relative">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-[11px] text-slate-300">nexora-intelligent-assistant.v1</span>
            </div>
            <GlassBadge variant="success" size="sm">
              Verified Knowledge Node
            </GlassBadge>
          </div>

          <div className="p-4 sm:p-6 text-left space-y-4">
            {/* User message mockup */}
            <div className="flex justify-end">
              <div className="p-3.5 rounded-2xl rounded-tr-none bg-sky-600 text-white text-xs sm:text-sm max-w-lg shadow-md border border-sky-400/30">
                I lost my student ID card this morning. What should I do and where do I go?
              </div>
            </div>

            {/* AI Response Card mockup */}
            <div className="flex justify-start">
              <div className="p-4 rounded-2xl rounded-tl-none glass-card max-w-2xl border-sky-400/30 text-xs sm:text-sm text-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-white">NEXORA Response</span>
                  <GlassBadge variant="primary" size="sm">
                    Verified Procedure
                  </GlassBadge>
                </div>
                <p className="text-slate-300 mb-3 text-xs leading-relaxed">
                  I cross-referenced the official Campus Registry Handbook. Here is the verified procedure to replace your smart RFID card today:
                </p>

                {/* Sub-card */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-white">Student Services Center</span>
                    <span className="text-emerald-400 font-medium">Open until 4:30 PM</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Building2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Silver Jubilee Tower (SJT) — Ground Floor — Room G12</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Estimated processing: 15 minutes</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Link href="/map?dest=Student+Services+Center">
                    <GlassButton size="sm" variant="primary" className="text-xs">
                      <NavigationIcon className="w-3 h-3 mr-1.5" />
                      Navigate There
                    </GlassButton>
                  </Link>
                  <Link href="/chat">
                    <GlassButton size="sm" variant="outline" className="text-xs">
                      Ask Follow-up
                    </GlassButton>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Visualization Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <GlassBadge variant="outline" size="sm" className="mb-2">
            Intelligent Engine Pipeline
          </GlassBadge>
          <h2 className="text-2xl sm:text-4xl font-bold text-white">
            How NEXORA Solves Community Needs
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-2">
            A cohesive architecture combining language reasoning, indoor mapping, and institutional knowledge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {workflowSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <GlassCard key={idx} variant="default" className="text-center p-5 border-white/10">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-400/20 text-sky-400 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-sky-300 mb-1 tracking-wider uppercase">
                  Step 0{idx + 1}
                </div>
                <h3 className="text-base font-semibold text-white mb-1.5">{step.title}</h3>
                <p className="text-xs text-slate-400">{step.desc}</p>
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold text-white">
            Engineered for Modern Communities
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-xl mx-auto">
            Everything students, professors, hospital staff, and enterprise members need in one unified interface.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <GlassCard key={idx} variant="interactive" className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-400/30 text-sky-400 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.15)]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <GlassBadge variant="outline" size="sm">
                    {feat.tag}
                  </GlassBadge>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feat.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 px-6 max-w-5xl mx-auto w-full text-center">
        <div className="p-8 sm:p-12 rounded-3xl glass-panel-elevated border-sky-400/30 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Step Into Your Intelligent Community.
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto mb-8">
              Experience the future of campus and organizational intelligence with NEXORA.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register">
                <GlassButton size="lg" variant="primary">
                  Create Account
                </GlassButton>
              </Link>
              <Link href="/chat">
                <GlassButton size="lg" variant="outline">
                  Try AI Demo
                </GlassButton>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 py-8 px-6 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-2 mb-2 font-semibold text-slate-400">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span>NEXORA Intelligent Community Platform</span>
        </div>
        <p>© 2026 NEXORA. All verified information belongs to respective institutional registries.</p>
      </footer>
    </div>
  );
}
