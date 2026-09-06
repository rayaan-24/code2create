'use client';

import React from 'react';
import Link from 'next/navigation';
import { useRouter } from 'next/navigation';
import { NavigationRoute } from '@/lib/types';
import { Navigation as NavIcon, Clock, MapPin, ArrowRight, Layers } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassBadge } from '../ui/GlassBadge';
import { GlassButton } from '../ui/GlassButton';

export interface NavigationActionCardProps {
  route: NavigationRoute;
}

export const NavigationActionCard: React.FC<NavigationActionCardProps> = ({ route }) => {
  const router = useRouter();

  const handleStartNavigation = () => {
    router.push(`/map?dest=${encodeURIComponent(route.destination)}&start=${encodeURIComponent(route.startPoint)}`);
  };

  return (
    <GlassCard variant="elevated" className="mt-3 p-4 border border-sky-400/30 shadow-xl bg-slate-950/40">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
            <NavIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Indoor Navigation Route</h4>
            <span className="text-[10px] text-slate-400">A* Pathfinding Verified</span>
          </div>
        </div>
        <GlassBadge variant="primary" size="sm">
          {route.etaMinutes} min • {route.distanceMeters}m
        </GlassBadge>
      </div>

      {/* Origin -> Destination Points */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-2 mb-3">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
          <span className="text-slate-400">Start:</span>
          <span className="text-slate-200 font-medium truncate">{route.startPoint}</span>
        </div>
        <div className="w-px h-3 bg-white/20 ml-1" />
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-400 ring-4 ring-sky-400/20" />
          <span className="text-slate-400">Destination:</span>
          <span className="text-white font-semibold truncate">{route.destination}</span>
        </div>
      </div>

      {/* Floor Transitions if multi-floor */}
      {route.floorChanges && route.floorChanges.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 text-[11px] text-amber-300/90 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
          <Layers className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Transition: {route.floorChanges.join(' • ')}</span>
        </div>
      )}

      {/* Preview Steps */}
      {route.steps && route.steps.length > 0 && (
        <div className="space-y-1.5 mb-3 text-[11px] text-slate-300">
          {route.steps.slice(0, 2).map((s, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-sky-400 font-bold">{idx + 1}.</span>
              <span className="truncate">{s.instruction}</span>
            </div>
          ))}
          {route.steps.length > 2 && (
            <span className="text-[10px] text-slate-400 block italic">
              +{route.steps.length - 2} more turn-by-turn guidance steps
            </span>
          )}
        </div>
      )}

      {/* Action CTA */}
      <GlassButton
        variant="primary"
        size="sm"
        className="w-full justify-center"
        onClick={handleStartNavigation}
      >
        <span>Open Indoor Map & Directions</span>
        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
      </GlassButton>
    </GlassCard>
  );
};
