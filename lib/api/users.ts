import { ApiResponse, createSuccessResponse } from './client';
import { User, UserPreferences } from '../types';
import { mockCurrentUser } from '../mock-data';

let currentUserState = { ...mockCurrentUser };

export const usersApi = {
  async getCurrentUser(): Promise<ApiResponse<User>> {
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
    return createSuccessResponse<User>(currentUserState);
  },
};
