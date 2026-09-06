import { ApiResponse, createSuccessResponse, simulateDelay } from './client';
import { NavigationRoute } from '../types';
import { mockSampleRoute } from '../mock-data';

export const navigationApi = {
  async getSampleRoute(): Promise<ApiResponse<NavigationRoute>> {
    return createSuccessResponse<NavigationRoute>(mockSampleRoute);
  },

  async calculateRoute(startPoint: string, destination: string): Promise<ApiResponse<NavigationRoute>> {
    await simulateDelay(450);

    const generatedRoute: NavigationRoute = {
      id: `route_${Date.now()}`,
      startPoint,
      destination,
      etaMinutes: 3 + Math.floor(Math.random() * 4),
      distanceMeters: 180 + Math.floor(Math.random() * 200),
      floorChanges: [`${startPoint} -> Main Corridor -> ${destination}`],
      steps: [
        {
          instruction: `Depart from ${startPoint} towards the nearest central concourse.`,
          distance: '45m',
          landmark: 'Concourse Digital Directory',
        },
        {
          instruction: 'Proceed straight along the illuminated glass gallery path.',
          distance: '110m',
          landmark: 'Skybridge Overpass',
        },
        {
          instruction: `Enter the destination corridor and locate ${destination} on your right.`,
          distance: '35m',
          landmark: 'Doorway Access Beacon',
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
