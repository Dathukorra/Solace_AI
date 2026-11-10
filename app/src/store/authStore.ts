import { create } from 'zustand';
import { setAuthTokens, removeAuthTokens, getAuthToken } from '../api/client';
import { authService } from '../features/auth/authService';
import { AuthUser } from '../features/auth/types';

export type User = AuthUser;

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnboarding: boolean;
  setAuth: (user: User, accessToken: string, refreshToken?: string) => Promise<void>;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  startOnboarding: () => void;
  finishOnboarding: () => void;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  isOnboarding: false,

  setAuth: async (user, accessToken, refreshToken) => {
    await setAuthTokens(accessToken, refreshToken);
    set({ user, token: accessToken, isAuthenticated: true, isLoading: false });
  },

  setUser: (user) => set({ user }),

  updateUser: (updates) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...updates } });
    }
  },

  startOnboarding: () => set({ isOnboarding: true }),
  finishOnboarding: () => set({ isOnboarding: false }),

  logout: async () => {
    try {
      await removeAuthTokens();
    } catch {
      // ignore
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isOnboarding: false,
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await getAuthToken();
      if (!token) {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        return false;
      }

      // Fetch user profile from /auth/me
      const { user } = await authService.getMe();
      set({ user, token, isAuthenticated: true, isLoading: false });
      return true;
    } catch {
      // Token invalid or network issue; clear tokens
      await removeAuthTokens();
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },
}));
