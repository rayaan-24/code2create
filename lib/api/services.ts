import { apiRequest, ApiResponse, createSuccessResponse, createErrorResponse } from './client';
import { ServiceItem } from '../types';
import { mockServices } from '../mock-data';

function mapBackendService(s: any): ServiceItem {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category || 'General',
    department: s.department,
    location: s.location_id || 'Student Center',
    hours: s.hours && s.hours.length > 0 ? 'Mon-Fri 09:00 - 17:00' : '09:00 AM - 05:00 PM',
    contactEmail: s.contact || undefined,
    isUrgent: s.is_urgent ?? false,
  };
}

export const servicesApi = {
  async getServices(category?: string): Promise<ApiResponse<ServiceItem[]>> {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiRequest<any[]>(`/api/v1/services${queryString}`);

    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return {
        data: res.data.map(mapBackendService),
        error: null,
        status: 200,
      };
    }

    if (!category || category === 'All') {
      return createSuccessResponse<ServiceItem[]>(mockServices);
    }
    const filtered = mockServices.filter(
      (s) => s.category.toLowerCase() === category.toLowerCase()
    );
    return createSuccessResponse<ServiceItem[]>(filtered);
  },

  async getServiceById(id: string): Promise<ApiResponse<ServiceItem>> {
    const res = await apiRequest<any>(`/api/v1/services/${id}`);
    if (res.data) {
      return {
        data: mapBackendService(res.data),
        error: null,
        status: 200,
      };
    }

    const item = mockServices.find((s) => s.id === id);
    if (!item) {
      return createErrorResponse<ServiceItem>('Service not found', 404);
    }
    return createSuccessResponse<ServiceItem>(item);
  },
};
