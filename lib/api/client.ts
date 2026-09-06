/**
 * Nexora API Client Foundation
 * Full-stack HTTP client for FastAPI backend with fallback and token management.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const TOKEN_STORAGE_KEY = 'nexora_auth_token';
const USER_STORAGE_KEY = 'nexora_auth_user';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function getStoredUser<T>(): T | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(USER_STORAGE_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as T;
  } catch {
    return null;
  }
}

export function setStoredUser<T>(user: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

const SIMULATED_LATENCY_MS = 150;

export async function simulateDelay(ms: number = SIMULATED_LATENCY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createSuccessResponse<T>(data: T): Promise<ApiResponse<T>> {
  await simulateDelay();
  return {
    data,
    error: null,
    status: 200,
  };
}

export async function createErrorResponse<T>(
  error: string,
  status: number = 500
): Promise<ApiResponse<T>> {
  await simulateDelay();
  return {
    data: null,
    error,
    status,
  };
}

/**
 * Universal API dispatcher that connects to FastAPI and falls back if disconnected
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const errMsg =
        body?.error?.message ||
        body?.detail ||
        body?.message ||
        `Request failed with status ${res.status}`;
      return {
        data: null,
        error: errMsg,
        status: res.status,
      };
    }

    // Backend responds in ResponseEnvelope format: { data: T, error: null }
    const responseData = body?.data !== undefined ? body.data : body;

    return {
      data: responseData as T,
      error: null,
      status: res.status,
    };
  } catch (err: any) {
    // Network or CORS error
    return {
      data: null,
      error: err.message || 'Unable to connect to Nexora server',
      status: 0,
    };
  }
}
