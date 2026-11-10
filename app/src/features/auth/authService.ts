import { apiClient } from '../../api/client';
import {
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  UpdateProfilePayload,
  AuthUser,
  ForgotPasswordResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
} from './types';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  signup: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    return apiClient<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  // Backward-compatibility alias
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    return authService.signup(credentials);
  },

  forgotPassword: async (email: string): Promise<ForgotPasswordResponse> => {
    return apiClient<ForgotPasswordResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (payload: ResetPasswordPayload): Promise<ResetPasswordResponse> => {
    return apiClient<ResetPasswordResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMe: async (): Promise<{ user: AuthUser }> => {
    return apiClient<{ user: AuthUser }>('/auth/me', {
      method: 'GET',
    });
  },

  updateProfile: async (payload: UpdateProfilePayload): Promise<{ user: AuthUser }> => {
    return apiClient<{ user: AuthUser }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  registerPushToken: async (token: string, deviceId?: string): Promise<{ success: boolean }> => {
    return apiClient<{ success: boolean }>('/push-tokens', {
      method: 'POST',
      body: JSON.stringify({ token, deviceId }),
    });
  },

  /**
   * Mirrors the local first-run tour flag to the server so it survives an
   * app reinstall or signing in on another device.
   */
  markTourSeen: async (): Promise<{ user: AuthUser }> => {
    return apiClient<{ user: AuthUser }>('/me', {
      method: 'PATCH',
      body: JSON.stringify({ hasSeenTour: true }),
    });
  },
};
