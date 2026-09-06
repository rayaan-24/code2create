import { ApiResponse, createSuccessResponse } from './client';
import { AdminMetric, VerificationItem } from '../types';
import { mockAdminMetric, mockVerificationQueue } from '../mock-data';

let queueState = [...mockVerificationQueue];

export const adminApi = {
  async getDashboardMetrics(): Promise<ApiResponse<AdminMetric>> {
    return createSuccessResponse<AdminMetric>(mockAdminMetric);
  },

  async getPendingVerifications(): Promise<ApiResponse<VerificationItem[]>> {
    return createSuccessResponse<VerificationItem[]>(queueState);
  },

  async updateVerificationStatus(
    id: string,
    status: 'approved' | 'rejected'
  ): Promise<ApiResponse<VerificationItem>> {
    const item = queueState.find((v) => v.id === id);
    if (!item) {
      throw new Error('Verification item not found');
    }
    item.status = status;
    return createSuccessResponse<VerificationItem>(item);
  },
};
