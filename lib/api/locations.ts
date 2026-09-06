import { apiRequest, ApiResponse, createSuccessResponse, createErrorResponse } from './client';
import { LocationItem } from '../types';
import { mockLocations } from '../mock-data';

function mapBackendLocation(loc: any): LocationItem {
  return {
    id: loc.id,
    name: loc.name,
    building: loc.building_id || 'Campus Grounds',
    floor: loc.floor || 'Floor 1',
    room: loc.room_number || 'N/A',
    category: loc.location_type || 'General',
    operatingHours: '08:00 AM - 08:00 PM',
    accessible: loc.is_accessible ?? true,
    description: loc.description || '',
  };
}

export const locationsApi = {
  async getLocations(): Promise<ApiResponse<LocationItem[]>> {
    const res = await apiRequest<any[]>('/api/v1/locations');
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return {
        data: res.data.map(mapBackendLocation),
        error: null,
        status: 200,
      };
    }
    return createSuccessResponse<LocationItem[]>(mockLocations);
  },

  async getLocationById(id: string): Promise<ApiResponse<LocationItem>> {
    const res = await apiRequest<any>(`/api/v1/locations/${id}`);
    if (res.data) {
      return {
        data: mapBackendLocation(res.data),
        error: null,
        status: 200,
      };
    }

    const found = mockLocations.find((loc) => loc.id === id);
    if (!found) {
      return createErrorResponse<LocationItem>('Location not found', 404);
    }
    return createSuccessResponse<LocationItem>(found);
  },

  async searchLocations(query: string): Promise<ApiResponse<LocationItem[]>> {
    const q = query.toLowerCase().trim();
    if (!q) {
      return this.getLocations();
    }

    const res = await apiRequest<any[]>(`/api/v1/locations?search=${encodeURIComponent(q)}`);
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return {
        data: res.data.map(mapBackendLocation),
        error: null,
        status: 200,
      };
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
