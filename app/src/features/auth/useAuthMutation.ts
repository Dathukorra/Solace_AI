import { useMutation } from '@tanstack/react-query';
import { authService } from './authService';
import { LoginCredentials, RegisterCredentials } from './types';
import { useAuthStore } from '../../store/authStore';

export const useLoginMutation = () => {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: async (response) => {
      if (response && response.user && response.accessToken) {
        await setAuth(response.user, response.accessToken, response.refreshToken);
      }
    },
  });
};

export const useRegisterMutation = () => {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (credentials: RegisterCredentials) => authService.signup(credentials),
    onSuccess: async (response) => {
      if (response && response.user && response.accessToken) {
        await setAuth(response.user, response.accessToken, response.refreshToken);
      }
    },
  });
};
