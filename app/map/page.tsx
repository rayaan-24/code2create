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

  const [mobileTab, setMobileTab] = useState<'map' | 'controls'>('map');

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden relative">
      {/* Mobile Tab View Selector */}
      <div className="lg:hidden flex items-center justify-center p-2.5 bg-white/95 border-b border-[rgba(160,50,85,0.18)] z-30 shrink-0 select-none shadow-2xs">
        <div className="flex rounded-xl bg-[#FFF0F4] p-1 border border-[rgba(160,50,85,0.2)] w-full max-w-xs">
          <button
            type="button"
            onClick={() => setMobileTab('map')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              mobileTab === 'map'
                ? 'bg-[#EB4D6E] text-white shadow-xs'
                : 'text-[#5C4B52] hover:text-[#111111]'
            }`}
          >
            🗺️ Live Map
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('controls')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              mobileTab === 'controls'
                ? 'bg-[#EB4D6E] text-white shadow-xs'
                : 'text-[#5C4B52] hover:text-[#111111]'
            }`}
          >
            🧭 Route {route ? `(${route.etaMinutes}m)` : ''}
          </button>
        </div>
      </div>

      {/* Left Panel: Route Controls & Turn-by-Turn Guidance */}
      <div
        className={`w-full lg:w-96 flex-shrink-0 bg-white/95 border-r border-[rgba(160,50,85,0.2)] p-4 sm:p-5 overflow-y-auto space-y-4 z-20 shadow-xl shadow-rose-950/5 ${
          mobileTab === 'controls' ? 'flex flex-col h-full' : 'hidden lg:block'
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-[#111111] flex items-center gap-2">
              <NavigationIcon className="w-4 h-4 text-[#EB4D6E]" />
              <span>NEXORA A* Navigation Engine</span>
            </h2>
            <GlassBadge variant="success" size="sm">
              Online
            </GlassBadge>
          </div>
          <p className="text-xs text-[#5C4B52] leading-relaxed">
            Intelligent indoor wayfinding with A* shortest-path heuristic, multi-floor transitions, and step-by-step instructions.
          </p>
        </div>

        {error && <ErrorBanner message={error} />}

        {/* Route Inputs */}
        <div className="space-y-3 p-3.5 rounded-2xl bg-[#FFF0F4] border border-[rgba(160,50,85,0.2)]">
          <GlassInput
            label="Current Location (Start Point)"
            value={startPoint}
            onChange={(e) => setStartPoint(e.target.value)}
            leftIcon={<MapPin className="w-4 h-4 text-emerald-600" />}
          />

          <GlassInput
            label="Destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            leftIcon={<MapPin className="w-4 h-4 text-rose-600" />}
          />

          {/* Accessible Routing Toggle */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={toggleAccessibility}
              className={`flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all ${
                isAccessible
                  ? 'bg-[#FFE2E8] text-[#B82346] border-[#EB4D6E]/50 shadow-2xs'
                  : 'bg-white text-[#3D2D33] border-[rgba(160,50,85,0.22)] hover:text-[#111111] hover:bg-[#FFF8FA]'
              }`}
            >
              <Accessibility className="w-3.5 h-3.5" />
              <span>Accessible Route (Avoid Stairs)</span>
              {isAccessible && <CheckCircle2 className="w-3.5 h-3.5 text-[#B82346] ml-1" />}
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
          <GlassCard variant="elevated" className="p-4 border-[rgba(160,50,85,0.22)] bg-white shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#111111] truncate max-w-[180px]">
                {route.destination}
              </span>
              <GlassBadge variant="success" size="sm">
                <Clock className="w-3 h-3 mr-1" />
                {route.etaMinutes} min walk
              </GlassBadge>
            </div>

            <div className="flex items-center justify-between text-xs text-[#3D2D33] border-b border-[rgba(160,50,85,0.14)] pb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Footprints className="w-3.5 h-3.5 text-[#EB4D6E]" />
                Distance: <strong className="text-[#111111]">{route.distanceMeters}m</strong>
              </span>
              <span className={`text-[11px] font-semibold ${isAccessible ? 'text-emerald-700' : 'text-[#5C4B52]'}`}>
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
              <Compass className={`w-4 h-4 mr-2 ${isNavigating ? 'animate-spin text-[#EB4D6E]' : ''}`} />
              <span>{isNavigating ? 'Cancel Active Guidance' : 'Start Live Navigation'}</span>
            </GlassButton>

            {/* Step-by-Step Directions */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-2.5">
                Turn-by-turn guidance ({route.steps.length} steps)
              </h4>
              <div className="space-y-3 text-xs max-h-60 overflow-y-auto pr-1">
                {route.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#FFE2E8] border border-[#EB4D6E]/40 text-[#B82346] flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-[#111111] font-medium leading-snug">{step.instruction}</p>
                      <div className="flex items-center gap-2 text-[10px] text-[#5C4B52] mt-0.5">
                        <span className="text-emerald-700 font-bold">{step.distance}</span>
                        {step.landmark && <span className="text-[#3D2D33]">• Landmark: {step.landmark}</span>}
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
          <span className="text-xs font-bold text-[#111111] block mb-2">
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
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FFE2E8] text-[11px] font-semibold text-[#111111] border border-[rgba(160,50,85,0.22)] hover:border-[#EB4D6E] shadow-2xs transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side: Interactive Vector Map Canvas */}
      <div
        className={`flex-1 flex flex-col h-full bg-[#FFF6F9] relative overflow-hidden ${
          mobileTab === 'map' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {/* Top Floor Bar */}
        <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-2xl bg-white/95 border border-[rgba(160,50,85,0.22)] shadow-md">
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#EB4D6E] ml-1.5 sm:ml-2 mr-0.5 sm:mr-1" />
            {floorLabels.map((f) => (
              <button
                key={f.floor}
                onClick={() => setActiveFloor(f.floor)}
                className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs rounded-xl transition-all font-bold cursor-pointer ${
                  activeFloor === f.floor
                    ? 'bg-[#EB4D6E] text-white shadow-sm'
                    : 'text-[#3D2D33] hover:text-[#000000] hover:bg-[#FFF0F4]'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>

          <div className="pointer-events-auto hidden sm:flex items-center gap-2">
            <GlassBadge variant="outline" size="md" className="border-[rgba(160,50,85,0.3)] bg-white/95 text-[#111111] font-bold shadow-xs">
              <Building className="w-3 h-3 text-[#EB4D6E]" />
              <span className="truncate max-w-[200px] md:max-w-none">Silver Jubilee Tower & Library</span>
            </GlassBadge>
          </div>
        </div>

        {/* Map Blueprint Canvas Area */}
        <div className="flex-1 relative flex items-center justify-center p-2 sm:p-6 select-none overflow-hidden">
          {/* Ambient grid background */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(235, 77, 110, 0.25) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          {/* SVG Map Container (1000 x 700 coordinate box) */}
          <div className="relative w-full max-w-4xl aspect-[1000/700] min-h-[260px] max-h-[75vh] rounded-2xl sm:rounded-3xl border-2 border-[rgba(160,50,85,0.25)] bg-white/95 p-2 sm:p-4 shadow-2xl overflow-hidden backdrop-blur-md flex flex-col justify-between">
            <svg
              viewBox="0 0 1000 700"
              className="w-full h-full"
            >
              {/* Floor Plan Zones */}
              <g>
                {/* Library Block */}
                <rect x="50" y="200" width="220" height="300" rx="16" fill="#FFF0F4" stroke="#EB4D6E" strokeWidth="2" />
                <text x="160" y="240" fill="#111111" fontSize="14" textAnchor="middle" fontWeight="bold">LIBRARY BLOCK</text>

                {/* Corridor Link */}
                <rect x="270" y="320" width="160" height="60" rx="8" fill="#FFE8EE" stroke="#B82346" strokeWidth="1.5" strokeDasharray="4 4" />

                {/* SJT Main Atrium Block */}
                <rect x="430" y="140" width="520" height="420" rx="20" fill="#FFF0F4" stroke="#EB4D6E" strokeWidth="2" />
                <text x="690" y="180" fill="#111111" fontSize="16" textAnchor="middle" fontWeight="bold">SILVER JUBILEE TOWER (SJT)</text>

                {/* Rooms Outline inside SJT */}
                <rect x="460" y="220" width="120" height="90" rx="8" fill="#FFFFFF" stroke="rgba(160,50,85,0.3)" strokeWidth="1.5" />
                <text x="520" y="260" fill="#2E2528" fontSize="12" fontWeight="600" textAnchor="middle">Stairs Wing</text>

                <rect x="460" y="390" width="120" height="90" rx="8" fill="#FFFFFF" stroke="rgba(160,50,85,0.3)" strokeWidth="1.5" />
                <text x="520" y="440" fill="#2E2528" fontSize="12" fontWeight="600" textAnchor="middle">Elevators</text>

                <rect x="740" y="280" width="180" height="140" rx="12" fill="#FFE2E8" stroke="#EB4D6E" strokeWidth="2.5" />
                <text x="830" y="340" fill="#B82346" fontSize="14" textAnchor="middle" fontWeight="bold">Student Services</text>
                <text x="830" y="362" fill="#5C4B52" fontSize="11" textAnchor="middle" fontWeight="600">Room G12</text>
              </g>

              {/* Navigation Edges Base Graph */}
              <g stroke="rgba(160,50,85,0.3)" strokeWidth="2" strokeDasharray="4 4">
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
                stroke="#EB4D6E"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isNavigating ? 'animate-pulse' : ''}
              />

              {/* Route Dash Effect */}
              <path
                d={routePoints}
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeDasharray="8 8"
                strokeLinecap="round"
              />

              {/* Graph Nodes on Active Floor */}
              {visibleNodes.map(([key, node]) => (
                <g key={key} transform={`translate(${node.x}, ${node.y})`}>
                  <circle
                    r="10"
                    fill={node.type === 'ROOM' ? '#B82346' : node.type === 'ELEVATOR' ? '#059669' : node.type === 'STAIR' ? '#D97706' : '#EB4D6E'}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    className="shadow-sm"
                  />
                  <text
                    y="24"
                    fill="#111111"
                    fontSize="11"
                    textAnchor="middle"
                    className="font-bold"
                  >
                    {node.label}
                  </text>
                </g>
              ))}

              {/* Start Pin */}
              <g transform="translate(120, 350)">
                <circle r="18" fill="#059669" opacity="0.25" className="animate-ping" />
                <circle r="13" fill="#059669" stroke="#ffffff" strokeWidth="2.5" />
                <text y="4" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">A</text>
                <text y="-20" fill="#047857" fontSize="13" fontWeight="bold" textAnchor="middle">
                  Start (Library)
                </text>
              </g>

              {/* Destination Pin */}
              <g transform="translate(880, 350)">
                <circle r="18" fill="#DC2626" opacity="0.25" className="animate-ping" />
                <circle r="13" fill="#DC2626" stroke="#ffffff" strokeWidth="2.5" />
                <text y="4" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">B</text>
                <text y="-22" fill="#B91C1C" fontSize="13" fontWeight="bold" textAnchor="middle">
                  Student Services
                </text>
              </g>
            </svg>

            {/* Bottom Status bar */}
            <div className="absolute bottom-2 sm:bottom-4 left-3 sm:left-6 right-3 sm:right-6 flex items-center justify-between text-[10px] sm:text-xs text-[#111111] font-semibold pt-1.5 sm:pt-2 border-t border-[rgba(160,50,85,0.18)] z-10">
              <div className="flex items-center gap-1.5 sm:gap-2 truncate mr-2">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#EB4D6E] animate-ping flex-shrink-0" />
                <span className="truncate">
                  Floor: <strong>{floorLabels[activeFloor].name}</strong> • {isAccessible ? 'Elevators' : 'Standard'}
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-[#5C4B52] font-medium hidden sm:inline flex-shrink-0">
                A* Grid: 1000x700
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
