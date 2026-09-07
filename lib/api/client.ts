/**
 * Nexora API Client Foundation
 * Full-stack HTTP client for FastAPI backend with fallback and token management.
 */

function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
  }
  return 'http://localhost:8000';
}

export const API_BASE_URL = getBaseUrl();

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

const DEFAULT_TIMEOUT_MS = 60000;

/**
 * Universal API dispatcher that connects to FastAPI with finite timeout and error handling.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  console.log(`[Nexora API] ${options.method || 'GET'} ${url} (timeout: ${timeoutMs}ms)`);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    clearTimeout(timer);

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      let errMsg =
        body?.error?.message ||
        (typeof body?.detail === 'string' ? body.detail : body?.detail?.message) ||
        (typeof body?.error === 'string' ? body.error : null) ||
        body?.message;

      if (!errMsg) {
        if (res.status === 401) {
          errMsg = 'Invalid credentials or authentication required. Please check your email and password.';
        } else if (res.status === 404) {
          errMsg = `Requested resource not found at ${endpoint}.`;
        } else if (res.status === 408) {
          errMsg = 'The request timed out (60s limit). Please check backend connection or try again.';
        } else if (res.status === 503) {
          errMsg = 'Nexora AI service is currently degraded or unreachable.';
        } else if (res.status >= 500) {
          errMsg = 'Nexora AI backend server error. Please try again in a few moments.';
        } else {
          errMsg = `Request failed with status ${res.status}`;
        }
      }

      console.warn(`[Nexora API Error] ${res.status} ${url}: ${errMsg}`);

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
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      console.warn(`[Nexora API Timeout] AbortError on ${url}`);
      return {
        data: null,
        error: 'The chat request timed out (60s limit). Please check backend connection or try again.',
        status: 408,
      };
    }

    console.warn(`[Nexora API Network Error] ${url}:`, err);
    return {
      data: null,
      error: err.message || 'Unable to connect to Nexora backend. Check that the server is running at http://localhost:8001.',
      status: 0,
    };
  }
}
