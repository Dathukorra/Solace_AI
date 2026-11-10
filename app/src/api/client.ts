import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'solace_auth_token';
const REFRESH_TOKEN_KEY = 'solace_refresh_token';

// In development, Android emulator uses 10.0.2.2, iOS simulator uses localhost
const DEFAULT_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:5000/api',
  ios: 'http://localhost:5000/api',
  default: 'http://localhost:5000/api',
});

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_BASE_URL;

export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
  [key: string]: any;
}

// ─── Token Storage ────────────────────────────────────────────────────────────

export async function getAuthToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
    }
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
    }
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAuthTokens(accessToken: string, refreshToken?: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      return;
    }
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch (error) {
    console.error('Failed to store auth tokens', error);
  }
}

// Backward-compat alias
export async function setAuthToken(token: string): Promise<void> {
  return setAuthTokens(token);
}

export async function removeAuthTokens(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
      return;
    }
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {}),
    ]);
  } catch (error) {
    console.error('Failed to remove auth tokens', error);
  }
}

// Backward-compat alias
export async function removeAuthToken(): Promise<void> {
  return removeAuthTokens();
}

// ─── Token Refresh Orchestration ──────────────────────────────────────────────

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const currentRefresh = await getRefreshToken();
      if (!currentRefresh) {
        await removeAuthTokens();
        return null;
      }

      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefresh }),
      });

      if (!res.ok) {
        await removeAuthTokens();
        return null;
      }

      const data = await res.json();
      if (data.accessToken) {
        await setAuthTokens(data.accessToken, data.refreshToken || currentRefresh);
        return data.accessToken;
      }
      return null;
    } catch {
      await removeAuthTokens();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ─── Resilient API Client with Auto-Refresh on 401 ────────────────────────────

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized with token refresh (once per request)
  if (
    response.status === 401 &&
    !isRetry &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/signup') &&
    !endpoint.includes('/auth/forgot-password') &&
    !endpoint.includes('/auth/reset-password') &&
    !endpoint.includes('/auth/refresh')
  ) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      // Retry original request with new access token
      return apiClient<T>(endpoint, options, true);
    }
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = json.message || json.error || `Request failed with status ${response.status}`;
    const error: any = new Error(errorMsg);
    error.status = response.status;
    error.data = json;
    throw error;
  }

  return json as T;
}
