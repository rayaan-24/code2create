import {
  apiRequest,
  setAuthToken,
  removeAuthToken,
  setStoredUser,
  getStoredUser,
  getAuthToken,
  ApiResponse,
} from './client';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthUser {
  id: string;
  community_id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'FACULTY' | 'USER';
  department?: string | null;
  year?: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at?: string | null;
}

export interface AuthResponseData {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  community_name: string;
  role?: string;
  department?: string;
  year?: string;
}

export const authApi = {
  async login(email: string, password: string): Promise<ApiResponse<AuthResponseData>> {
    const res = await apiRequest<AuthResponseData>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.data && res.data.tokens) {
      setAuthToken(res.data.tokens.access_token);
      setStoredUser(res.data.user);
    }

    return res;
  },

  async register(payload: RegisterPayload): Promise<ApiResponse<AuthResponseData>> {
    const res = await apiRequest<AuthResponseData>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.data && res.data.tokens) {
      setAuthToken(res.data.tokens.access_token);
      setStoredUser(res.data.user);
    }

    return res;
  },

  async getMe(): Promise<ApiResponse<AuthUser>> {
    const res = await apiRequest<AuthUser>('/api/v1/auth/me');
    if (res.data) {
      setStoredUser(res.data);
    }
    return res;
  },

  async getGuestToken(): Promise<ApiResponse<AuthResponseData>> {
    const res = await apiRequest<AuthResponseData>('/api/v1/auth/guest-token', {
      method: 'POST',
    });

    if (res.data && res.data.tokens) {
      setAuthToken(res.data.tokens.access_token);
      setStoredUser(res.data.user);
    }

    return res;
  },

  async logout(): Promise<void> {
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      removeAuthToken();
    }
  },

  isAuthenticated(): boolean {
    return !!getAuthToken();
  },

  getCurrentUser(): AuthUser | null {
    return getStoredUser<AuthUser>();
  },
};
