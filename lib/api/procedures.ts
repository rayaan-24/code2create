import { apiRequest, ApiResponse, createSuccessResponse } from './client';
import { ProcedureItem } from '../types';
import { mockProcedures } from '../mock-data';

function mapBackendProcedure(p: any): ProcedureItem {
  return {
    id: p.id,
    title: p.title,
    category: p.category || 'General',
    responsibleOffice: p.service_id || 'Institutional Affairs',
    location: 'Student Administration Wing',
    hours: 'Mon-Fri 09:00 - 17:00',
    requiredDocuments:
      p.requirements && p.requirements.length > 0
        ? p.requirements.map((r: any) => r.name)
        : ['Identification Badge', 'Official Request Form'],
    steps:
      p.steps && p.steps.length > 0
        ? p.steps.map((s: any) => `${s.step_number}. ${s.instruction}`)
        : ['Submit online form', 'Receive departmental confirmation'],
    contactEmail: 'services@nexora.edu',
  };
}

export const proceduresApi = {
  async getProcedures(category?: string, status?: string): Promise<ApiResponse<ProcedureItem[]>> {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (status) params.append('status', status);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiRequest<any[]>(`/api/v1/procedures${queryString}`);

    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return {
        data: res.data.map(mapBackendProcedure),
        error: null,
        status: 200,
      };
    }

    return createSuccessResponse<ProcedureItem[]>(mockProcedures);
  },

  async getProcedureById(id: string): Promise<ApiResponse<ProcedureItem>> {
    const res = await apiRequest<any>(`/api/v1/procedures/${id}`);
    if (res.data) {
      return {
        data: mapBackendProcedure(res.data),
        error: null,
        status: 200,
      };
    }

    const found = mockProcedures.find((p) => p.id === id);
    if (found) return createSuccessResponse<ProcedureItem>(found);
    return { data: null, error: 'Procedure not found', status: 404 };
  },

  async createProcedure(payload: any): Promise<ApiResponse<any>> {
    return apiRequest('/api/v1/procedures', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async verifyProcedure(id: string, status: string): Promise<ApiResponse<any>> {
    return apiRequest(`/api/v1/admin/procedures/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },
};
