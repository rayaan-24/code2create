import { apiRequest, ApiResponse, createSuccessResponse } from './client';
import { AdminMetric, VerificationItem } from '../types';
import { mockAdminMetric, mockVerificationQueue } from '../mock-data';

export interface BackendDashboardMetrics {
  total_users: number;
  total_locations: number;
  total_people: number;
  total_services: number;
  total_procedures: number;
  pending_procedures: number;
  total_documents: number;
  pending_documents: number;
  active_announcements: number;
  audit_events_count: number;
  recent_audit_logs: any[];
}

let queueState = [...mockVerificationQueue];

export const adminApi = {
  async getDashboardMetrics(): Promise<ApiResponse<AdminMetric>> {
    const res = await apiRequest<BackendDashboardMetrics>('/api/v1/admin/dashboard');

    if (res.data) {
      const data = res.data;
      const totalKnowledge =
        (data.total_procedures || 0) +
        (data.total_documents || 0) +
        (data.total_locations || 0) +
        (data.total_services || 0);

      const pending =
        (data.pending_procedures || 0) + (data.pending_documents || 0);

      const verified = Math.max(0, totalKnowledge - pending);

      const mappedMetric: AdminMetric = {
        totalKnowledgeItems: totalKnowledge,
        verifiedItems: verified,
        pendingReview: pending,
        expiredItems: 0,
        activeUsersToday: data.total_users || 42,
        systemHealth: 'Optimal',
      };
      return { data: mappedMetric, error: null, status: 200 };
    }

    // Fallback to mock data if backend not reachable
    return createSuccessResponse<AdminMetric>(mockAdminMetric);
  },

  async getPendingVerifications(): Promise<ApiResponse<VerificationItem[]>> {
    // Try fetching pending procedures and documents from backend
    const [procRes, docRes] = await Promise.all([
      apiRequest<any[]>('/api/v1/procedures?status=PENDING'),
      apiRequest<any[]>('/api/v1/documents?status=PENDING'),
    ]);

    const items: VerificationItem[] = [];

    if (procRes.data && Array.isArray(procRes.data)) {
      procRes.data.forEach((p) => {
        items.push({
          id: p.id,
          title: p.title,
          type: 'procedure',
          submittedBy: p.category || 'Registry Staff',
          submittedAt: p.created_at,
          status:
            p.verification_status === 'VERIFIED'
              ? 'approved'
              : p.verification_status === 'REJECTED'
              ? 'rejected'
              : 'pending',
          notes: p.description,
        });
      });
    }

    if (docRes.data && Array.isArray(docRes.data)) {
      docRes.data.forEach((d) => {
        items.push({
          id: d.id,
          title: d.title,
          type: 'document',
          submittedBy: d.uploaded_by || 'Staff Office',
          submittedAt: d.created_at,
          status:
            d.verification_status === 'VERIFIED'
              ? 'approved'
              : d.verification_status === 'REJECTED'
              ? 'rejected'
              : 'pending',
          notes: d.description || d.file_name,
        });
      });
    }

    if (items.length > 0) {
      return { data: items, error: null, status: 200 };
    }

    return createSuccessResponse<VerificationItem[]>(queueState);
  },

  async updateVerificationStatus(
    id: string,
    status: 'approved' | 'rejected',
    type?: string
  ): Promise<ApiResponse<VerificationItem>> {
    const backendStatus = status === 'approved' ? 'VERIFIED' : 'REJECTED';

    // Attempt procedure verification first if indicated or fallback
    if (type === 'document') {
      await apiRequest(`/api/v1/admin/documents/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ status: backendStatus }),
      });
    } else {
      const pRes = await apiRequest(`/api/v1/admin/procedures/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ status: backendStatus }),
      });
      if (pRes.error && !type) {
        // Try document endpoint
        await apiRequest(`/api/v1/admin/documents/${id}/verify`, {
          method: 'POST',
          body: JSON.stringify({ status: backendStatus }),
        });
      }
    }

    const item = queueState.find((v) => v.id === id);
    if (item) {
      item.status = status;
      return createSuccessResponse<VerificationItem>(item);
    }

    return {
      data: {
        id,
        title: 'Resolved Item',
        type: 'procedure',
        submittedBy: 'Admin',
        submittedAt: new Date().toISOString(),
        status,
      },
      error: null,
      status: 200,
    };
  },

  async getAuditLogs(page = 1, pageSize = 20): Promise<ApiResponse<any>> {
    return apiRequest(`/api/v1/admin/audit-logs?page=${page}&page_size=${pageSize}`);
  },

  // Knowledge entity admin endpoints
  async createLocation(payload: any): Promise<ApiResponse<any>> {
    return apiRequest('/api/v1/locations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async createPerson(payload: any): Promise<ApiResponse<any>> {
    return apiRequest('/api/v1/people', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async createService(payload: any): Promise<ApiResponse<any>> {
    return apiRequest('/api/v1/services', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async createProcedure(payload: any): Promise<ApiResponse<any>> {
    return apiRequest('/api/v1/procedures', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async createDocument(payload: any): Promise<ApiResponse<any>> {
    return apiRequest('/api/v1/documents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async createAnnouncement(payload: any): Promise<ApiResponse<any>> {
    return apiRequest('/api/v1/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getConfusionMap(): Promise<ApiResponse<any>> {
    return apiRequest('/api/v1/admin/analytics/confusion-map');
  },
};
