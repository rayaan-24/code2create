import { apiRequest, ApiResponse, createSuccessResponse } from './client';
import { User, UserPreferences, UserRole } from '../types';
import { mockCurrentUser } from '../mock-data';

let currentUserState: User = { ...mockCurrentUser };

function mapBackendRole(role?: string): UserRole {
  if (!role) return 'student';
  const r = role.toLowerCase();
  if (r === 'user' || r === 'student') return 'student';
  if (r === 'faculty') return 'faculty';
  if (r === 'staff') return 'staff';
  if (r === 'admin' || r === 'super_admin') return 'admin';
  if (r === 'visitor') return 'visitor';
  return 'student';
}

function mapBackendUser(bUser: any): User {
  return {
    id: bUser.id ?? currentUserState.id,
    name: bUser.name ?? currentUserState.name,
    email: bUser.email ?? currentUserState.email,
    role: bUser.role ? mapBackendRole(bUser.role) : currentUserState.role,
    department: bUser.department ?? currentUserState.department,
    community: bUser.community_name || bUser.community || bUser.community_id || currentUserState.community,
    year: bUser.year ?? currentUserState.year,
    avatarUrl: bUser.avatar_url || bUser.avatarUrl || currentUserState.avatarUrl,
    preferences: currentUserState.preferences,
    createdAt: bUser.created_at || bUser.createdAt || currentUserState.createdAt,
  };
}

export const usersApi = {
  async getCurrentUser(): Promise<ApiResponse<User>> {
    const res = await apiRequest<any>('/api/v1/users/me', { method: 'GET' });
    if (res.data) {
      currentUserState = mapBackendUser(res.data);
      return {
        data: currentUserState,
        error: null,
        status: res.status,
      };
    }
    return createSuccessResponse<User>(currentUserState);
  },

  async updateProfile(profileData: Partial<User>): Promise<ApiResponse<User>> {
    currentUserState = {
      ...currentUserState,
      ...profileData,
    };

    const payload: Record<string, any> = {};
    if (profileData.name !== undefined) payload.name = profileData.name;
    if (profileData.department !== undefined) payload.department = profileData.department;
    if (profileData.year !== undefined) payload.year = profileData.year;

    const res = await apiRequest<any>('/api/v1/users/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (res.data) {
      const updated = mapBackendUser(res.data);
      currentUserState = {
        ...updated,
        preferences: currentUserState.preferences,
      };
      return {
        data: currentUserState,
        error: null,
        status: res.status,
      };
    }

    return createSuccessResponse<User>(currentUserState);
  },

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<ApiResponse<User>> {
    currentUserState = {
      ...currentUserState,
      preferences: {
        ...currentUserState.preferences,
        ...preferences,
      },
    };

    const res = await apiRequest<any>('/api/v1/users/me', {
      method: 'PUT',
      body: JSON.stringify({
        name: currentUserState.name,
        department: currentUserState.department,
        year: currentUserState.year,
      }),
    });

    if (res.data) {
      const updated = mapBackendUser(res.data);
      currentUserState = {
        ...updated,
        preferences: currentUserState.preferences,
      };
      return {
        data: currentUserState,
        error: null,
        status: res.status,
      };
    }

    return createSuccessResponse<User>(currentUserState);
  },
};
