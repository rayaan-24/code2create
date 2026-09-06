'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassBadge } from '@/components/ui/GlassBadge';
import { GlassInput } from '@/components/ui/GlassInput';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import {
  MapPin,
  Navigation as NavigationIcon,
  Clock,
  Compass,
  Layers,
  Building,
  Zap,
} from 'lucide-react';
import { navigationApi } from '@/lib/api/navigation';
import { locationsApi } from '@/lib/api/locations';
import { LocationItem, NavigationRoute } from '@/lib/types';

function MapContent() {
  const searchParams = useSearchParams();
  const destQuery = searchParams.get('dest') || 'Student Services Center';

  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [startPoint, setStartPoint] = useState('Central Library (Main Entrance)');
  const [destination, setDestination] = useState(destQuery);
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [activeFloor, setActiveFloor] = useState('Ground Floor');
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [locRes, routeRes] = await Promise.all([
          locationsApi.getLocations(),
          navigationApi.getSampleRoute(),
        ]);
        if (locRes.data) setLocations(locRes.data);
        if (routeRes.data) {
          setRoute({
            ...routeRes.data,
            destination: destQuery || routeRes.data.destination,
          });
        }
      } catch (err: any) {
        setError('Failed to load navigation data');
      }
    };
    init();
  }, [destQuery]);

  const handleCalculateRoute = async () => {
    setIsLoadingRoute(true);
    setError(null);
    try {
      const res = await navigationApi.calculateRoute(startPoint, destination);
      if (res.data) {
        setRoute(res.data);
      }
    } catch (err) {
      setError('Route calculation failed');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const floors = ['Basement', 'Ground Floor', 'Level 1', 'Level 2', 'Level 3'];

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden relative">
      {/* Left Side: Route Controls & Turn-by-Turn Guidance */}
      <div className="w-full lg:w-96 flex-shrink-0 glass-panel border-r border-white/10 p-5 overflow-y-auto space-y-5 z-20">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <NavigationIcon className="w-4 h-4 text-sky-400" />
              <span>Indoor Navigation Shell</span>
            </h2>
            <GlassBadge variant="primary" size="sm">
              A* Engine Shell
            </GlassBadge>
          </div>
          <p className="text-xs text-slate-400">
            Campus indoor wayfinding across connected buildings, elevators, and floors.
          </p>
        </div>

        {error && <ErrorBanner message={error} />}

        {/* Route Inputs */}
        <div className="space-y-3 p-3.5 rounded-2xl bg-slate-900/50 border border-white/10">
          <GlassInput
            label="Starting Location"
            value={startPoint}
            onChange={(e) => setStartPoint(e.target.value)}
            leftIcon={<MapPin className="w-4 h-4 text-emerald-400" />}
          />

          <GlassInput
            label="Destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            leftIcon={<MapPin className="w-4 h-4 text-rose-400" />}
          />

          <GlassButton
            onClick={handleCalculateRoute}
            variant="primary"
            size="sm"
            isLoading={isLoadingRoute}
            className="w-full mt-1"
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            Recalculate Route
          </GlassButton>
        </div>

        {/* Route Summary Card */}
        {route && (
          <GlassCard variant="elevated" className="p-4 border-sky-400/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white truncate max-w-[180px]">
                {route.destination}
              </span>
              <GlassBadge variant="success" size="sm">
                <Clock className="w-3 h-3 mr-1" />
                {route.etaMinutes} min ETA
              </GlassBadge>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-2">
              <span>Distance: {route.distanceMeters}m</span>
              <span className="text-sky-300 font-medium">Indoor Accessible</span>
            </div>

            {/* Start Navigation Action */}
            <GlassButton
              variant={isNavigating ? 'secondary' : 'primary'}
              size="md"
              className="w-full"
              onClick={() => setIsNavigating(!isNavigating)}
            >
              <Compass className={`w-4 h-4 mr-2 ${isNavigating ? 'animate-spin' : ''}`} />
              <span>{isNavigating ? 'End Navigation Guidance' : 'Start Navigation'}</span>
            </GlassButton>

            {/* Step-by-Step Directions */}
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                Turn-by-turn guidance
              </h4>
              <div className="space-y-3 text-xs">
                {route.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-200">{step.instruction}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="text-emerald-400 font-medium">{step.distance}</span>
                        {step.landmark && <span>• Landmark: {step.landmark}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        )}

        {/* Quick Destination Suggestions */}
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-2">
            Popular Destinations
          </span>
          <div className="flex flex-wrap gap-1.5">
            {locations.slice(0, 4).map((loc) => (
              <button
                key={loc.id}
                onClick={() => {
                  setDestination(loc.name);
                  handleCalculateRoute();
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-[11px] text-slate-300 border border-white/10 hover:border-sky-400/30 transition-colors"
              >
                {loc.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side: Map Canvas / Grid Shell */}
      <div className="flex-1 flex flex-col h-full bg-[#070a12] relative overflow-hidden">
        {/* Top Floor Bar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl glass-panel border-white/15">
            <Layers className="w-4 h-4 text-sky-400 ml-2 mr-1" />
            {floors.map((floor) => (
              <button
                key={floor}
                onClick={() => setActiveFloor(floor)}
                className={`px-3 py-1 text-xs rounded-xl transition-all font-medium ${
                  activeFloor === floor
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {floor}
              </button>
            ))}
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <GlassBadge variant="outline" size="md" className="border-sky-400/30 text-sky-300">
              <Building className="w-3 h-3 text-sky-400" />
              <span>Silver Jubilee Tower Wing</span>
            </GlassBadge>
          </div>
        </div>

        {/* Map Grid Canvas Area */}
        <div className="flex-1 relative flex items-center justify-center p-8 select-none">
          {/* Ambient grid lines */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(56, 189, 248, 0.25) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />

          {/* Vector Blueprint Mockup */}
          <div className="relative w-full max-w-2xl h-96 rounded-3xl border border-sky-400/20 glass-panel p-6 shadow-2xl flex flex-col justify-between overflow-hidden">
            {/* Animated Path Overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-sky-400">
              <path
                d="M 60 80 L 220 80 L 220 220 L 460 220 L 460 310"
                fill="none"
                strokeWidth="4"
                strokeDasharray="8 6"
                className={isNavigating ? 'animate-pulse' : ''}
              />
            </svg>

            {/* Start Pin */}
            <div className="absolute top-[68px] left-[48px] flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.8)]">
                A
              </div>
              <span className="text-[11px] font-semibold text-emerald-300 bg-slate-900/80 px-2 py-0.5 rounded border border-emerald-500/30">
                {startPoint.split(' ')[0]}
              </span>
            </div>

            {/* Waypoint Indicator */}
            <div className="absolute top-[208px] left-[208px]">
              <div className="w-4 h-4 rounded-full bg-sky-400 animate-ping opacity-75" />
            </div>

            {/* Destination Pin */}
            <div className="absolute top-[295px] left-[445px] flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold shadow-[0_0_20px_rgba(244,63,94,0.8)]">
                B
              </div>
              <span className="text-[11px] font-semibold text-rose-300 bg-slate-900/80 px-2 py-0.5 rounded border border-rose-500/30">
                {destination.split(' ')[0]}
              </span>
            </div>

            {/* Building Rooms Wireframe Blueprint */}
            <div className="grid grid-cols-3 gap-4 h-full pointer-events-none opacity-40">
              <div className="border border-white/20 rounded-xl p-2 text-[10px] text-slate-400">
                Room G01-G08 (Classrooms)
              </div>
              <div className="border border-white/20 rounded-xl p-2 text-[10px] text-slate-400">
                Central Atrium & Elevators
              </div>
              <div className="border border-sky-400/40 rounded-xl p-2 text-[10px] text-sky-300 bg-sky-500/5">
                Student Services (G12)
              </div>
            </div>

            {/* Compass & Navigation Mode status banner */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/10 z-10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Real-time Floor Localization Active ({activeFloor})</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Indoor A* Graph Engine & BLE Beacons ready for Phase 2
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <AppShell title="Indoor Navigation System">
      <Suspense fallback={<div className="p-8"><LoadingSkeleton count={3} /></div>}>
        <MapContent />
      </Suspense>
    </AppShell>
  );
}
