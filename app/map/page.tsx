'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
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
  Accessibility,
  CheckCircle2,
  ArrowRight,
  Footprints,
} from 'lucide-react';
import { navigationApi } from '@/lib/api/navigation';
import { locationsApi } from '@/lib/api/locations';
import { LocationItem, NavigationRoute } from '@/lib/types';

// Map node coordinates for demo campus visualization (0-1000 scale)
const DEMO_NODES: Record<string, { x: number; y: number; floor: number; label: string; type: string }> = {
  'library-main': { x: 120, y: 350, floor: 0, label: 'Library Main Entrance', type: 'ENTRANCE' },
  'lib-corridor': { x: 260, y: 350, floor: 0, label: 'Library Corridor A', type: 'CORRIDOR' },
  'sjt-stair-g': { x: 380, y: 220, floor: 0, label: 'SJT Central Stairs', type: 'STAIR' },
  'sjt-elev-g': { x: 420, y: 460, floor: 0, label: 'SJT Central Elevator', type: 'ELEVATOR' },
  'sjt-g-atrium': { x: 490, y: 350, floor: 0, label: 'SJT Ground Atrium', type: 'INTERSECTION' },
  'sjt-corridor-g': { x: 630, y: 350, floor: 0, label: 'SJT Ground Corridor', type: 'CORRIDOR' },
  'student-services': { x: 780, y: 350, floor: 0, label: 'Student Services (G12)', type: 'ROOM' },
  'room-g12': { x: 880, y: 350, floor: 0, label: 'Room G12 Consultation Desk', type: 'ROOM' },
  // Floor 1
  'sjt-stair-1': { x: 380, y: 220, floor: 1, label: 'SJT Stairs (Floor 1)', type: 'STAIR' },
  'sjt-elev-1': { x: 420, y: 460, floor: 1, label: 'SJT Elevator (Floor 1)', type: 'ELEVATOR' },
  'it-desk': { x: 740, y: 350, floor: 1, label: 'IT Help Desk (104)', type: 'ROOM' },
  // Floor 2
  'sjt-stair-2': { x: 380, y: 220, floor: 2, label: 'SJT Stairs (Floor 2)', type: 'STAIR' },
  'sjt-elev-2': { x: 420, y: 460, floor: 2, label: 'SJT Elevator (Floor 2)', type: 'ELEVATOR' },
  'academic-office': { x: 760, y: 350, floor: 2, label: 'Academic Affairs (210)', type: 'ROOM' },
};

function MapContent() {
  const searchParams = useSearchParams();
  const destParam = searchParams.get('dest');
  const startParam = searchParams.get('start');

  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [startPoint, setStartPoint] = useState(startParam || 'Central Library (Main Entrance)');
  const [destination, setDestination] = useState(destParam || 'Student Services Center');
  const [isAccessible, setIsAccessible] = useState(false);
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [activeFloor, setActiveFloor] = useState<number>(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [locRes, routeRes] = await Promise.all([
          locationsApi.getLocations(),
          navigationApi.calculateRoute(
            startParam || 'Central Library (Main Entrance)',
            destParam || 'Student Services Center',
            isAccessible
          ),
        ]);
        if (locRes.data) setLocations(locRes.data);
        if (routeRes.data) {
          setRoute(routeRes.data);
        }
      } catch (err: any) {
        setError('Failed to load navigation graph');
      }
    };
    init();
  }, [destParam, startParam]);

  const handleCalculateRoute = async (targetDest = destination, accessible = isAccessible) => {
    setIsLoadingRoute(true);
    setError(null);
    try {
      const res = await navigationApi.calculateRoute(startPoint, targetDest, accessible);
      if (res.data) {
        setRoute(res.data);
      } else if (res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message || 'Route calculation failed');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const toggleAccessibility = () => {
    const next = !isAccessible;
    setIsAccessible(next);
    handleCalculateRoute(destination, next);
  };

  // Filter nodes visible on the active floor
  const visibleNodes = useMemo(() => {
    return Object.entries(DEMO_NODES).filter(([_, node]) => node.floor === activeFloor);
  }, [activeFloor]);

  // SVG coordinate path line generator
  const routePoints = useMemo(() => {
    if (!route || !route.steps) return 'M 120 350 L 260 350 L 490 350 L 630 350 L 780 350 L 880 350';
    // Match route steps to node coordinates
    const pts = [
      { x: 120, y: 350 },
      { x: 260, y: 350 },
      isAccessible ? { x: 420, y: 460 } : { x: 380, y: 220 },
      { x: 490, y: 350 },
      { x: 630, y: 350 },
      { x: 780, y: 350 },
      { x: 880, y: 350 },
    ];
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [route, isAccessible]);

  const floorLabels = [
    { floor: 0, name: 'Ground Floor' },
    { floor: 1, name: 'First Floor' },
    { floor: 2, name: 'Second Floor' },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden relative">
      {/* Left Panel: Route Controls & Turn-by-Turn Guidance */}
      <div className="w-full lg:w-96 flex-shrink-0 glass-panel border-r border-white/10 p-5 overflow-y-auto space-y-5 z-20">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <NavigationIcon className="w-4 h-4 text-cyan-400" />
              <span>NEXORA A* Navigation Engine</span>
            </h2>
            <GlassBadge variant="success" size="sm">
              Online
            </GlassBadge>
          </div>
          <p className="text-xs text-slate-400">
            Intelligent indoor wayfinding with A* shortest-path heuristic, multi-floor transitions, and step-by-step instructions.
          </p>
        </div>

        {error && <ErrorBanner message={error} />}

        {/* Route Inputs */}
        <div className="space-y-3 p-3.5 rounded-2xl bg-slate-900/50 border border-white/10">
          <GlassInput
            label="Current Location (Start Point)"
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

          {/* Accessible Routing Toggle */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={toggleAccessibility}
              className={`flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 rounded-xl border transition-all ${
                isAccessible
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-800/60 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              <Accessibility className="w-3.5 h-3.5" />
              <span>Accessible Route (Avoid Stairs)</span>
              {isAccessible && <CheckCircle2 className="w-3 h-3 text-cyan-400 ml-1" />}
            </button>
          </div>

          <GlassButton
            onClick={() => handleCalculateRoute()}
            variant="primary"
            size="sm"
            isLoading={isLoadingRoute}
            className="w-full mt-1"
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            Calculate A* Route
          </GlassButton>
        </div>

        {/* Route Summary Card */}
        {route && (
          <GlassCard variant="elevated" className="p-4 border-cyan-400/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white truncate max-w-[180px]">
                {route.destination}
              </span>
              <GlassBadge variant="success" size="sm">
                <Clock className="w-3 h-3 mr-1" />
                {route.etaMinutes} min walk
              </GlassBadge>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-2">
              <span className="flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5 text-cyan-400" />
                Distance: <strong className="text-slate-200">{route.distanceMeters}m</strong>
              </span>
              <span className={`text-[11px] font-medium ${isAccessible ? 'text-emerald-300' : 'text-slate-400'}`}>
                {isAccessible ? '✓ Wheelchair / Elevator' : 'Standard Path'}
              </span>
            </div>

            {/* Start Navigation Action */}
            <GlassButton
              variant={isNavigating ? 'secondary' : 'primary'}
              size="md"
              className="w-full"
              onClick={() => setIsNavigating(!isNavigating)}
            >
              <Compass className={`w-4 h-4 mr-2 ${isNavigating ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isNavigating ? 'Cancel Active Guidance' : 'Start Live Navigation'}</span>
            </GlassButton>

            {/* Step-by-Step Directions */}
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                Turn-by-turn guidance ({route.steps.length} steps)
              </h4>
              <div className="space-y-3 text-xs max-h-60 overflow-y-auto pr-1">
                {route.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-200 leading-snug">{step.instruction}</p>
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
            Demo Campus Destinations
          </span>
          <div className="flex flex-wrap gap-1.5">
            {['Student Services', 'IT Help Desk', 'Academic Office', 'Library'].map((name) => (
              <button
                key={name}
                onClick={() => {
                  setDestination(name);
                  handleCalculateRoute(name);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-[11px] text-slate-300 border border-white/10 hover:border-cyan-400/30 transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side: Interactive Vector Map Canvas */}
      <div className="flex-1 flex flex-col h-full bg-[#070a12] relative overflow-hidden">
        {/* Top Floor Bar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl glass-panel border-white/15">
            <Layers className="w-4 h-4 text-cyan-400 ml-2 mr-1" />
            {floorLabels.map((f) => (
              <button
                key={f.floor}
                onClick={() => setActiveFloor(f.floor)}
                className={`px-3 py-1 text-xs rounded-xl transition-all font-medium ${
                  activeFloor === f.floor
                    ? 'bg-cyan-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <GlassBadge variant="outline" size="md" className="border-cyan-400/30 text-cyan-300">
              <Building className="w-3 h-3 text-cyan-400" />
              <span>Silver Jubilee Tower & Library Complex</span>
            </GlassBadge>
          </div>
        </div>

        {/* Map Blueprint Canvas Area */}
        <div className="flex-1 relative flex items-center justify-center p-6 select-none">
          {/* Ambient grid background */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(56, 189, 248, 0.25) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />

          {/* SVG Map Container (1000 x 700 coordinate box) */}
          <div className="relative w-full max-w-4xl h-[520px] rounded-3xl border border-cyan-400/20 glass-panel p-4 shadow-2xl overflow-hidden">
            <svg
              viewBox="0 0 1000 700"
              className="w-full h-full"
              style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))' }}
            >
              {/* Floor Plan Zones */}
              <g className="opacity-30">
                {/* Library Block */}
                <rect x="50" y="200" width="220" height="300" rx="16" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="160" y="240" fill="#94a3b8" fontSize="14" textAnchor="middle" fontWeight="bold">LIBRARY BLOCK</text>

                {/* Corridor Link */}
                <rect x="270" y="320" width="160" height="60" rx="8" fill="#1e293b" stroke="#64748b" strokeWidth="1" strokeDasharray="4 4" />

                {/* SJT Main Atrium Block */}
                <rect x="430" y="140" width="520" height="420" rx="20" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="690" y="180" fill="#94a3b8" fontSize="16" textAnchor="middle" fontWeight="bold">SILVER JUBILEE TOWER (SJT)</text>

                {/* Rooms Outline inside SJT */}
                <rect x="460" y="220" width="120" height="90" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />
                <text x="520" y="260" fill="#cbd5e1" fontSize="11" textAnchor="middle">Stairs Wing</text>

                <rect x="460" y="390" width="120" height="90" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />
                <text x="520" y="440" fill="#cbd5e1" fontSize="11" textAnchor="middle">Elevators</text>

                <rect x="740" y="280" width="180" height="140" rx="12" fill="#0284c7" fillOpacity="0.15" stroke="#38bdf8" strokeWidth="2" />
                <text x="830" y="340" fill="#38bdf8" fontSize="13" textAnchor="middle" fontWeight="bold">Student Services</text>
                <text x="830" y="360" fill="#94a3b8" fontSize="10" textAnchor="middle">Room G12</text>
              </g>

              {/* Navigation Edges Base Graph */}
              <g stroke="#334155" strokeWidth="2" strokeDasharray="3 3">
                <line x1="120" y1="350" x2="260" y2="350" />
                <line x1="260" y1="350" x2="490" y2="350" />
                <line x1="490" y1="350" x2="380" y2="220" />
                <line x1="490" y1="350" x2="420" y2="460" />
                <line x1="490" y1="350" x2="630" y2="350" />
                <line x1="630" y1="350" x2="780" y2="350" />
                <line x1="780" y1="350" x2="880" y2="350" />
              </g>

              {/* Active Route Polyline */}
              <path
                d={routePoints}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isNavigating ? 'animate-pulse' : ''}
              />

              {/* Route Dash Effect */}
              <path
                d={routePoints}
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                strokeDasharray="8 8"
                strokeLinecap="round"
              />

              {/* Graph Nodes on Active Floor */}
              {visibleNodes.map(([key, node]) => (
                <g key={key} transform={`translate(${node.x}, ${node.y})`}>
                  <circle
                    r="9"
                    fill={node.type === 'ROOM' ? '#0284c7' : node.type === 'ELEVATOR' ? '#10b981' : node.type === 'STAIR' ? '#f59e0b' : '#38bdf8'}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <text
                    y="22"
                    fill="#e2e8f0"
                    fontSize="11"
                    textAnchor="middle"
                    className="font-medium drop-shadow-md"
                  >
                    {node.label}
                  </text>
                </g>
              ))}

              {/* Start Pin */}
              <g transform="translate(120, 350)">
                <circle r="16" fill="#10b981" opacity="0.3" className="animate-ping" />
                <circle r="12" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                <text y="4" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">A</text>
                <text y="-20" fill="#34d399" fontSize="12" fontWeight="bold" textAnchor="middle">
                  Start (Library)
                </text>
              </g>

              {/* Destination Pin */}
              <g transform="translate(880, 350)">
                <circle r="18" fill="#f43f5e" opacity="0.3" className="animate-ping" />
                <circle r="13" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                <text y="4" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">B</text>
                <text y="-22" fill="#fb7185" fontSize="12" fontWeight="bold" textAnchor="middle">
                  Student Services
                </text>
              </g>
            </svg>

            {/* Bottom Status bar */}
            <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/10 z-10">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span>
                  Floor: <strong>{floorLabels[activeFloor].name}</strong> • Mode: {isAccessible ? 'Accessible Elevator Routing' : 'Standard Walk'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                A* Coordinate Grid: (x: 0–1000, y: 0–700)
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
