import { ApiResponse, createSuccessResponse, createErrorResponse } from './client';
import { ServiceItem } from '../types';
import { mockServices } from '../mock-data';

export const servicesApi = {
  async getServices(category?: string): Promise<ApiResponse<ServiceItem[]>> {
    if (!category || category === 'All') {
      return createSuccessResponse<ServiceItem[]>(mockServices);
    }
    const filtered = mockServices.filter((s) => s.category.toLowerCase() === category.toLowerCase());
    return createSuccessResponse<ServiceItem[]>(filtered);
  },

  async getServiceById(id: string): Promise<ApiResponse<ServiceItem>> {
    const item = mockServices.find((s) => s.id === id);
    if (!item) {
      return createErrorResponse<ServiceItem>('Service not found', 404);
    }
    return createSuccessResponse<ServiceItem>(item);
  },
};
