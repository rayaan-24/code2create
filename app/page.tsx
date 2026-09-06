'use client';

import React, { useState } from 'react';
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
  ChevronRight,
} from 'lucide-react';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { GlassCard } from '@/components/ui/GlassCard';

export default function LandingPage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    });
  };

  const capabilities = [
    {
      step: '01',
      title: 'Understands You',
      headline: 'Speak or type naturally.',
      desc: 'No rigid keywords, no nested menu mazes. NEXORA parses intent, multi-turn context, and spatial references seamlessly.',
      badge: 'Intent Intelligence',
    },
    {
      step: '02',
      title: 'Verifies the Truth',
      headline: 'Strictly grounded knowledge.',
      desc: 'Every policy, fee, and requirement is validated against verified institutional records. Zero confident hallucinations.',
      badge: 'Zero Hallucination',
    },
    {
      step: '03',
      title: 'Guides You Indoors',
      headline: 'Turn-by-turn wayfinding.',
      desc: 'From where you stand to the exact room door. Multi-floor A* pathfinding with accessibility modes across towers and floors.',
      badge: 'Indoor Spatial A*',
    },
    {
      step: '04',
      title: 'Speaks with Voice',
      headline: 'Neural speech intelligence.',
      desc: 'Hands-free voice mode powered by high-fidelity speech synthesis and conversational context memory.',
      badge: 'ElevenLabs Voice',
    },
  ];

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="min-h-screen flex flex-col bg-[#FFF8FA] text-[#171717] selection:bg-[#F4728A]/20 selection:text-[#171717] relative overflow-hidden"
    >
      {/* Dynamic Ambient Spatial Orbs */}
      <div 
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-gradient-to-b from-[#F4728A]/20 via-[#FF8FA3]/10 to-transparent blur-3xl transition-transform duration-700 ease-out"
        style={{
          transform: `translate(calc(-50% + ${mousePos.x * 40}px), ${mousePos.y * 30}px)`,
        }}
        aria-hidden="true"
      />
      <div 
        className="pointer-events-none absolute top-[600px] -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-[#FBC5D0]/30 to-transparent blur-3xl"
        aria-hidden="true"
      />

      {/* Top Floating Glass Navbar */}
      <nav className="sticky top-0 z-50 px-6 py-4 bg-white/70 backdrop-blur-xl border-b border-[rgba(180,80,110,0.12)] flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F4728A] to-[#E85D77] flex items-center justify-center text-white shadow-[0_4px_16px_rgba(244,114,138,0.3)]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-wider text-[#171717]">NEXORA</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] text-[#E85D77] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#FFEBF0] border border-[#F4728A]/25">
              Community AI
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

      {/* Hero Section — Lusion-Inspired Spatial Composition */}
      <section className="relative px-6 pt-24 pb-20 md:pt-36 md:pb-28 max-w-6xl mx-auto flex flex-col items-center text-center z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFEBF0] border border-[#F4728A]/30 text-xs font-semibold text-[#E85D77] mb-8 shadow-[0_2px_12px_rgba(244,114,138,0.1)]">
          <Sparkles className="w-3.5 h-3.5 text-[#F4728A]" />
          <span>Spatial & Grounded Community Operating System</span>
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-[#111111] max-w-5xl leading-[1.05]">
          Your community, <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#EB4D6E] via-[#D43154] to-[#B82346]">
            understood.
          </span>
        </h1>

        <p className="mt-8 text-lg sm:text-2xl text-[#2D2226] max-w-2xl font-medium leading-relaxed">
          Ask what you need in plain natural language. NEXORA retrieves verified truth, answers with voice, and navigates you to the room door.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link href="/chat">
            <GlassButton size="lg" variant="primary" className="text-base px-8 py-4 shadow-[0_8px_30px_rgba(212,49,84,0.35)]">
              <span>Enter Workspace</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </GlassButton>
          </Link>
          <Link href="/dashboard">
            <GlassButton size="lg" variant="secondary" className="text-base px-7 py-4">
              <Compass className="w-4 h-4 mr-2 text-[#EB4D6E]" />
              <span>Explore Portal</span>
            </GlassButton>
          </Link>
        </div>

        {/* Tactile Spatial Interface Preview */}
        <div className="w-full max-w-4xl mt-20 p-4 sm:p-6 rounded-3xl bg-white/95 border-2 border-[rgba(160,50,85,0.22)] shadow-[0_24px_70px_-15px_rgba(180,50,80,0.18)] text-left relative">
          <div className="flex items-center justify-between pb-3 border-b border-[rgba(160,50,85,0.14)] text-xs text-[#3D2D33]">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="ml-2 font-mono text-[11px] text-[#111111] font-bold">nexora-live-telemetry</span>
            </div>
            <GlassBadge variant="primary" size="sm">
              ✓ Verified Community Source
            </GlassBadge>
          </div>

          <div className="pt-4 space-y-4">
            {/* User message */}
            <div className="flex justify-end">
              <div className="p-3.5 rounded-2xl rounded-tr-none bg-gradient-to-r from-[#EB4D6E] to-[#D43154] text-white font-medium text-xs sm:text-sm max-w-lg shadow-[0_4px_16px_rgba(212,49,84,0.3)]">
                I lost my student ID card this morning. What should I do and where do I go?
              </div>
            </div>

            {/* AI Grounded Response */}
            <div className="flex justify-start">
              <div className="p-5 rounded-2xl rounded-tl-none bg-white border border-[rgba(160,50,85,0.2)] max-w-2xl text-xs sm:text-sm text-[#111111] shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#FFE2E8] flex items-center justify-center text-[#B82346]">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-extrabold text-[#111111]">NEXORA Intelligence</span>
                  <GlassBadge variant="default" size="sm">
                    Verified Procedure
                  </GlassBadge>
                </div>
                
                <p className="text-[#2D2226] text-xs sm:text-sm leading-relaxed font-medium">
                  I verified the official Campus Registry Handbook. Here is the verified procedure to replace your smart RFID card:
                </p>

                {/* Spatial Procedure Breakdown */}
                <div className="p-3.5 rounded-xl bg-[#FFF0F4] border border-[rgba(160,50,85,0.2)] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#111111]">Student Services Center</span>
                    <span className="text-emerald-950 font-bold px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-[10px]">
                      Open until 4:30 PM
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#2D2226] font-medium">
                    <Building2 className="w-3.5 h-3.5 text-[#EB4D6E] shrink-0" />
                    <span>Silver Jubilee Tower (SJT) &bull; Ground Floor &bull; Room G12</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#2D2226] font-medium">
                    <Clock className="w-3.5 h-3.5 text-[#EB4D6E] shrink-0" />
                    <span>Required Fee: $15 (Payable online or at counter)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Link href="/map?dest=Student+Services+Center">
                    <GlassButton size="sm" variant="primary" className="text-xs">
                      <NavigationIcon className="w-3.5 h-3.5 mr-1.5" />
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

      {/* Progressive Storytelling Capabilities */}
      <section className="px-6 py-24 max-w-6xl mx-auto z-10">
        <div className="text-center mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[#B82346]">
            Core Principles
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#111111] tracking-tight">
            How NEXORA operates
          </h2>
          <p className="text-sm sm:text-base text-[#2D2226] max-w-xl mx-auto font-medium">
            Grounded reasoning connecting people, physical spaces, and institutional truth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {capabilities.map((cap, idx) => (
            <GlassCard key={idx} variant="interactive" className="p-8 border-[rgba(160,50,85,0.2)] bg-white/95 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#B82346]">
                  {cap.step}
                </span>
                <GlassBadge variant="primary" size="sm">
                  {cap.badge}
                </GlassBadge>
              </div>
              <h3 className="text-2xl font-bold text-[#111111] tracking-tight">
                {cap.headline}
              </h3>
              <p className="text-sm text-[#2D2226] leading-relaxed font-normal">
                {cap.desc}
              </p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Call to Action Bar */}
      <section className="px-6 py-20 bg-gradient-to-b from-transparent to-[#FFE2E8]/60 border-t border-[rgba(160,50,85,0.18)] text-center z-10">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black text-[#111111] tracking-tight">
            Ready to experience intelligent community life?
          </h2>
          <p className="text-sm sm:text-base text-[#2D2226] font-medium">
            Start conversations, navigate indoor spaces, and access verified institutional knowledge instantly.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <Link href="/chat">
              <GlassButton size="lg" variant="primary">
                <span>Launch Assistant</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </GlassButton>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
