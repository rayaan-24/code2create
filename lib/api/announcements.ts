import { apiRequest, ApiResponse, createSuccessResponse } from './client';
import { Announcement } from '../types';
import { mockAnnouncements } from '../mock-data';

function mapBackendAnnouncement(a: any): Announcement {
  return {
    id: a.id,
    title: a.title,
    message: a.content,
    priority:
      a.priority === 'EMERGENCY' || a.priority === 'URGENT'
        ? 'critical'
        : a.priority === 'IMPORTANT'
        ? 'urgent'
        : 'normal',
    category: a.category || 'General',
    timestamp: a.published_at || a.created_at,
    department: a.category || 'Administration',
  };
}

export const announcementsApi = {
  async getAnnouncements(): Promise<ApiResponse<Announcement[]>> {
    const res = await apiRequest<any[]>('/api/v1/announcements');
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return {
        data: res.data.map(mapBackendAnnouncement),
        error: null,
        status: 200,
      };
    }
    return createSuccessResponse<Announcement[]>(mockAnnouncements);
  },

  async createAnnouncement(payload: any): Promise<ApiResponse<any>> {
    return apiRequest('/api/v1/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteAnnouncement(id: string): Promise<ApiResponse<any>> {
    return apiRequest(`/api/v1/announcements/${id}`, {
      method: 'DELETE',
    });
  },
};
