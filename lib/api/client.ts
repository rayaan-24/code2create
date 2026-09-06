/**
 * Nexora API Client Foundation
 * In Phase 1: Resolves typed mock data with simulated asynchronous latency.
 * In Phase 2: Will route to FastAPI endpoints (e.g., process.env.NEXT_PUBLIC_API_URL).
 */

const SIMULATED_LATENCY_MS = 250;

export async function simulateDelay(ms: number = SIMULATED_LATENCY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export async function createSuccessResponse<T>(data: T): Promise<ApiResponse<T>> {
  await simulateDelay();
  return {
    data,
    error: null,
    status: 200,
  };
}

export async function createErrorResponse<T>(error: string, status: number = 500): Promise<ApiResponse<T>> {
  await simulateDelay();
  return {
    data: null,
    error,
    status,
  };
}
