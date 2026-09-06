import { ApiResponse, createSuccessResponse, createErrorResponse } from './client';
import { LocationItem } from '../types';
import { mockLocations } from '../mock-data';

export const locationsApi = {
  async getLocations(): Promise<ApiResponse<LocationItem[]>> {
    return createSuccessResponse<LocationItem[]>(mockLocations);
  },

  async getLocationById(id: string): Promise<ApiResponse<LocationItem>> {
    const found = mockLocations.find((loc) => loc.id === id);
    if (!found) {
      return createErrorResponse<LocationItem>('Location not found', 404);
    }
    return createSuccessResponse<LocationItem>(found);
  },

  async searchLocations(query: string): Promise<ApiResponse<LocationItem[]>> {
    const q = query.toLowerCase().trim();
    if (!q) {
      return createSuccessResponse<LocationItem[]>(mockLocations);
    }
    const filtered = mockLocations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        loc.building.toLowerCase().includes(q) ||
        loc.room.toLowerCase().includes(q) ||
        loc.category.toLowerCase().includes(q)
    );
    return createSuccessResponse<LocationItem[]>(filtered);
  },
};
