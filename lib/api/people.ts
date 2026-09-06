import { apiRequest, ApiResponse, createSuccessResponse, createErrorResponse } from './client';
import { PersonItem } from '../types';
import { mockPeople } from '../mock-data';

function mapBackendPerson(p: any): PersonItem {
  return {
    id: p.id,
    name: p.name,
    role: p.role,
    department: p.department,
    office: p.location_id || 'Department Office',
    building: 'Main Hall',
    email: p.email,
    phone: p.phone || undefined,
    availability: (p.availability as any) || 'Available',
    officeHours: p.office_hours || undefined,
    avatar: p.avatar_url || undefined,
  };
}

export const peopleApi = {
  async searchPeople(query: string = '', department?: string): Promise<ApiResponse<PersonItem[]>> {
    const params = new URLSearchParams();
    if (query) params.append('search', query);
    if (department && department !== 'All') params.append('department', department);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiRequest<any[]>(`/api/v1/people${queryString}`);

    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return {
        data: res.data.map(mapBackendPerson),
        error: null,
        status: 200,
      };
    }

    // Fallback
    let result = [...mockPeople];
    const q = query.toLowerCase().trim();

    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.role.toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q) ||
          p.office.toLowerCase().includes(q)
      );
    }

    if (department && department !== 'All') {
      result = result.filter((p) => p.department.toLowerCase().includes(department.toLowerCase()));
    }

    return createSuccessResponse<PersonItem[]>(result);
  },

  async getPersonById(id: string): Promise<ApiResponse<PersonItem>> {
    const res = await apiRequest<any>(`/api/v1/people/${id}`);
    if (res.data) {
      return {
        data: mapBackendPerson(res.data),
        error: null,
        status: 200,
      };
    }

    const person = mockPeople.find((p) => p.id === id);
    if (!person) {
      return createErrorResponse<PersonItem>('Person not found', 404);
    }
    return createSuccessResponse<PersonItem>(person);
  },
};
