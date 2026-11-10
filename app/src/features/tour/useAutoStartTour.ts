import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTour } from './TourContext';
import { persistTourCompletion } from './tourCompletion';
import { hasCompletedTour, markTourCompleted } from './tourStorage';

interface UseAutoStartTourOptions {
  /** Gate this on the screen's data being ready. */
  enabled: boolean;
  /** Delay after the screen is ready before the tour opens. Defaults to 600ms. */
  delayMs?: number;
}

/**
 * Opens the tour automatically the first time a screen is ready for the
 * signed-in user. Completion is checked both locally and on the server, so a
 * reinstall or a new device never shows the tour again once it was finished.
 */
export function useAutoStartTour({ enabled, delayMs = 600 }: UseAutoStartTourOptions): void {
  const { start, isActive } = useTour();
  const userId = useAuthStore((s) => s.user?.id);
  const hasSeenTourOnServer = useAuthStore((s) => s.user?.hasSeenTour === true);
  const attemptedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || isActive || !userId) return;
    if (attemptedForUserRef.current === userId) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      // Mark the attempt when the delay actually elapses. If the screen
      // unmounts first, the next mount (or app launch) gets a fresh chance.
      attemptedForUserRef.current = userId;

      void (async () => {
        if (hasSeenTourOnServer) {
          // Keep the local cache in sync so this check is instant next time.
          await markTourCompleted(userId);
          return;
        }

        const completedLocally = await hasCompletedTour(userId);
        if (cancelled) return;

        if (completedLocally) {
          // Recover a completion that happened while offline (or before the
          // server flag existed) so it survives a reinstall.
          void persistTourCompletion(userId);
          return;
        }

        start();
      })();
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [delayMs, enabled, hasSeenTourOnServer, isActive, start, userId]);
}
