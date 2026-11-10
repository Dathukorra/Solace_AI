import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { getDismissedFeatureHints, markFeatureHintDismissed } from './onboardingStorage';

/**
 * A single-use hint dot. It stays hidden until the local dismissal map has
 * loaded, appears on the first visit, and disappears forever once the feature
 * is used (or the dot itself is acknowledged).
 */
export function useFeatureHint(hintId?: string): {
  visible: boolean;
  dismiss: () => void;
} {
  const userId = useAuthStore((s) => s.user?.id);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;

    if (!userId || !hintId) {
      setVisible(false);
      return () => {
        active = false;
      };
    }

    setVisible(false);
    void getDismissedFeatureHints(userId).then((dismissed) => {
      if (active) setVisible(!dismissed.includes(hintId));
    });

    return () => {
      active = false;
    };
  }, [hintId, userId]);

  const dismiss = useCallback(() => {
    setVisible(false);
    if (userId && hintId) {
      void markFeatureHintDismissed(userId, hintId);
    }
  }, [hintId, userId]);

  return { visible, dismiss };
}
