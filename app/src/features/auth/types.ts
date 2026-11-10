export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  goals?: string[];
  timezone?: string;
}

export type ProfileGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  goals?: string[];
  timezone?: string | null;
  aiMemoryEnabled?: boolean;
  age?: number | null;
  gender?: ProfileGender | null;
  dateOfBirth?: string | null;
  phoneNumber?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
  /** True once the user has completed or skipped the first-run app tour. */
  hasSeenTour?: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  goals?: string[];
  timezone?: string;
  aiMemoryEnabled?: boolean;
  age?: number | null;
  gender?: ProfileGender | null;
  dateOfBirth?: string | null;
  phoneNumber?: string | null;
  location?: string | null;
  /** Base64 data URL for a new picture, null to remove it, omitted to keep it. */
  avatar?: string | null;
  /** Set after the first-run app tour is skipped or finished. */
  hasSeenTour?: boolean;
}

export interface ForgotPasswordResponse {
  message: string;
  resetToken?: string;
  resetUrl?: string;
  expiresInMinutes?: number;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface ResetPasswordResponse {
  message: string;
  email?: string;
}
