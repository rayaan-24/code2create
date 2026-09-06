import { ApiResponse, apiRequest, createSuccessResponse, simulateDelay } from './client';
import { NavigationRoute } from '../types';
import { mockSampleRoute } from '../mock-data';

export interface NavLocationNode {
  id: string;
  name: string;
  building_id: string;
  floor: string;
  node_type: string;
  x: number;
  y: number;
  is_accessible: boolean;
  location_id?: string | null;
}

export const navigationApi = {
  async getSampleRoute(): Promise<ApiResponse<NavigationRoute>> {
    return createSuccessResponse<NavigationRoute>(mockSampleRoute);
  },

  async getLocations(floor?: string): Promise<ApiResponse<{ count: number; nodes: NavLocationNode[] }>> {
    const endpoint = floor ? `/api/v1/navigation/locations?floor=${encodeURIComponent(floor)}` : '/api/v1/navigation/locations';
    const res = await apiRequest<{ count: number; nodes: NavLocationNode[] }>(endpoint);
    if (res.data) return res;

    // Fallback demo nodes
    return createSuccessResponse({
      count: 4,
      nodes: [
        { id: 'n1', name: 'Central Library - Main Entrance', building_id: 'LIB', floor: 'Ground Floor', node_type: 'ENTRANCE', x: 100, y: 150, is_accessible: true },
        { id: 'n2', name: 'Student Services Center (Room G12)', building_id: 'SJT', floor: 'Ground Floor', node_type: 'ROOM', x: 680, y: 310, is_accessible: true },
        { id: 'n3', name: 'Campus IT Help Desk (Room 204)', building_id: 'SJT', floor: 'Level 1', node_type: 'ROOM', x: 680, y: 250, is_accessible: true },
        { id: 'n4', name: 'Campus Health & Urgent Clinic', building_id: 'HWC', floor: 'Ground Floor', node_type: 'ROOM', x: 850, y: 150, is_accessible: true },
      ],
    });
  },

  async resolveLocation(query: string): Promise<ApiResponse<any>> {
    const res = await apiRequest<any>('/api/v1/navigation/resolve', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    return res;
  },

  async calculateRoute(
    startPoint: string,
    destination: string,
    accessible: boolean = false
  ): Promise<ApiResponse<NavigationRoute>> {
    // 1. Attempt live call to FastAPI A* indoor engine
    const res = await apiRequest<{ status: string; route: any }>('/api/v1/navigation/route', {
      method: 'POST',
      body: JSON.stringify({
        start_query: startPoint,
        destination_query: destination,
        accessible,
      }),
    });

    if (res.data?.route) {
      const r = res.data.route;
      const formatted: NavigationRoute = {
        id: r.route_id || `route_${Date.now()}`,
        startPoint: r.start_name || startPoint,
        destination: r.destination_name || destination,
        etaMinutes: r.estimated_minutes || 4,
        distanceMeters: Math.round(r.total_distance_meters || 220),
        floorChanges: r.floor_changes || [],
        steps: (r.steps || []).map((s: any) => ({
          instruction: s.instruction,
          distance: s.distance,
          landmark: s.landmark,
        })),
      };
      return {
        data: formatted,
        error: null,
        status: 200,
      };
    }

    // 2. High-availability fallback
    await simulateDelay(200);
    const generatedRoute: NavigationRoute = {
      id: `route_${Date.now()}`,
      startPoint,
      destination,
      etaMinutes: 4,
      distanceMeters: 240,
      floorChanges: [`${startPoint} -> Skybridge -> ${destination}`],
      steps: [
        {
          instruction: `Depart from ${startPoint} towards the Skybridge Overpass.`,
          distance: '40m',
          landmark: 'Library Concourse',
        },
        {
          instruction: accessible
            ? 'Take Elevator Bank 1 to Ground Floor and follow the ramp.'
            : 'Proceed across the Skybridge connector toward Silver Jubilee Tower.',
          distance: '130m',
          landmark: 'Skybridge Overpass',
        },
        {
          instruction: `Enter Silver Jubilee Tower and proceed to ${destination}.`,
          distance: '70m',
          landmark: 'SJT Digital Kiosk',
        },
      ],
    };

    return {
      data: generatedRoute,
      error: null,
      status: 200,
    };
  },
};
