import { authService } from '../auth/authService';
import { useAuthStore } from '../../store/authStore';
import { markTourCompleted } from './tourStorage';

/**
 * Persists completion locally and mirrors it to `PATCH /me`.
 *
 * Local storage makes the flag available instantly on this device; the server
 * flag is what prevents the tour from returning after an app reinstall or a
 * login on another device.
 */
export async function persistTourCompletion(userId: string): Promise<void> {
  await markTourCompleted(userId);

  const store = useAuthStore.getState();
  if (store.user?.id === userId) {
    store.updateUser({ hasSeenTour: true });
  }

  try {
    const { user } = await authService.markTourSeen();
    useAuthStore.getState().updateUser(user);
  } catch {
    // Offline is fine: the next Home load re-syncs a locally completed tour,
    // and GET /auth/me reconciles the flag after a fresh install.
  }
}
