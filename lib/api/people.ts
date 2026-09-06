import { ApiResponse, createSuccessResponse, createErrorResponse } from './client';
import { PersonItem } from '../types';
import { mockPeople } from '../mock-data';

export const peopleApi = {
  async searchPeople(query: string = '', department?: string): Promise<ApiResponse<PersonItem[]>> {
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
    const person = mockPeople.find((p) => p.id === id);
    if (!person) {
      return createErrorResponse<PersonItem>('Person not found', 404);
    }
    return createSuccessResponse<PersonItem>(person);
  },
};
