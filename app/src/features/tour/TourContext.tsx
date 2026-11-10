import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/authStore';
import { persistTourCompletion } from './tourCompletion';
import type { TourCompletionReason, TourStep, TourTargetRect, TourTargetRef } from './types';

export interface TourContextValue {
  /** The ordered list of stops for this tour. */
  steps: TourStep[];
  /** Index into `steps`. */
  currentStep: number;
  isActive: boolean;
  /** True once the current stop's target has been measured. */
  isTargetReady: boolean;
  /** Latest window-space rectangle for every registered target. */
  targetRects: Readonly<Record<string, TourTargetRect>>;
  start: () => void;
  next: () => void;
  back: () => void;
  skip: () => void;
  finish: () => void;
  /** Used by `useTourTarget` to make a target available for measuring. */
  registerTarget: (id: string, ref: TourTargetRef) => void;
  unregisterTarget: (id: string) => void;
  /** Measures one target with `ref.measureInWindow()`. */
  measureTarget: (id: string) => boolean;
  measureCurrentTarget: () => void;
  measureAll: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used inside a TourProvider');
  }
  return context;
}

export interface TourProviderProps {
  children: React.ReactNode;
  steps?: TourStep[];
  onComplete?: (reason: TourCompletionReason) => void;
}

const RECT_EPSILON = 0.5;
/** Stable identity for providers that do not pass steps yet. */
const NO_STEPS: TourStep[] = [];
/** How long a newly opened step waits for its target to mount/measure. */
const TARGET_WAIT_MS = 1000;
const TARGET_POLL_MS = 80;

function rectsMatch(a: TourTargetRect | undefined, b: TourTargetRect): boolean {
  if (!a) return false;
  return (
    Math.abs(a.x - b.x) < RECT_EPSILON &&
    Math.abs(a.y - b.y) < RECT_EPSILON &&
    Math.abs(a.width - b.width) < RECT_EPSILON &&
    Math.abs(a.height - b.height) < RECT_EPSILON
  );
}

export const TourProvider: React.FC<TourProviderProps> = ({
  children,
  steps = NO_STEPS,
  onComplete,
}) => {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isTargetReady, setIsTargetReady] = useState(false);
  const [targetRects, setTargetRects] = useState<Record<string, TourTargetRect>>({});

  const targetRefs = useRef(new Map<string, TourTargetRef>());
  const targetRectsRef = useRef<Record<string, TourTargetRect>>({});
  const completionStartedRef = useRef(false);
  const isActiveRef = useRef(false);
  const currentStepRef = useRef(0);
  const activeRunRef = useRef(0);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  const registerTarget = useCallback((id: string, ref: TourTargetRef) => {
    targetRefs.current.set(id, ref);
  }, []);

  const unregisterTarget = useCallback((id: string) => {
    targetRefs.current.delete(id);
    if (id in targetRectsRef.current) {
      const nextRects = { ...targetRectsRef.current };
      delete nextRects[id];
      targetRectsRef.current = nextRects;
    }
    setTargetRects((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const measureTarget = useCallback((id: string): boolean => {
    const ref = targetRefs.current.get(id);
    const node = ref?.current as View | null | undefined;

    if (!node || typeof node.measureInWindow !== 'function') {
      return false;
    }

    node.measureInWindow((x, y, width, height) => {
      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
      ) {
        return;
      }

      const rect: TourTargetRect = { x, y, width, height };
      const previous = targetRectsRef.current[id];
      if (!rectsMatch(previous, rect)) {
        targetRectsRef.current = { ...targetRectsRef.current, [id]: rect };
        setTargetRects((prev) => (rectsMatch(prev[id], rect) ? prev : { ...prev, [id]: rect }));
      }
    });

    return true;
  }, []);

  const forgetRect = useCallback((id: string) => {
    if (!(id in targetRectsRef.current)) return;
    const next = { ...targetRectsRef.current };
    delete next[id];
    targetRectsRef.current = next;
    setTargetRects((prev) => {
      if (!(id in prev)) return prev;
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  }, []);

  const measureAll = useCallback(() => {
    for (const step of steps) {
      measureTarget(step.targetId);
    }
  }, [measureTarget, steps]);

  const measureCurrentTarget = useCallback(() => {
    if (!isActiveRef.current) return;
    const step = steps[currentStepRef.current];
    if (step) measureTarget(step.targetId);
  }, [measureTarget, steps]);

  const complete = useCallback(
    (reason: TourCompletionReason) => {
      if (!isActiveRef.current) return;

      isActiveRef.current = false;
      activeRunRef.current += 1;
      clearAutoAdvanceTimer();

      setIsActive(false);
      setIsTargetReady(false);
      setCurrentStep(0);
      currentStepRef.current = 0;

      if (userId) {
        void persistTourCompletion(userId);
      }

      // Every branch of the tour ends back on Home, including an early skip.
      try {
        router.navigate('/(tabs)');
      } catch {
        // A navigation may race with unmount; the flag is already saved.
      }

      onComplete?.(reason);
    },
    [clearAutoAdvanceTimer, onComplete, router, userId]
  );

  const finish = useCallback(() => {
    if (!isActiveRef.current || completionStartedRef.current) return;
    completionStartedRef.current = true;
    complete('finish');
  }, [complete]);

  const skip = useCallback(() => {
    if (!isActiveRef.current || completionStartedRef.current) return;
    completionStartedRef.current = true;
    complete('skip');
  }, [complete]);

  const activateStepRef = useRef<(index: number) => void>(() => {});

  const activateStep = useCallback(
    (index: number) => {
      if (!isActiveRef.current || steps.length === 0) return;

      if (index >= steps.length) {
        finish();
        return;
      }

      const safeIndex = Math.max(0, index);
      const step = steps[safeIndex];
      if (!step) {
        finish();
        return;
      }

      const run = ++activeRunRef.current;
      clearAutoAdvanceTimer();

      currentStepRef.current = safeIndex;
      setCurrentStep(safeIndex);
      setIsTargetReady(false);
      forgetRect(step.targetId);

      if (step.route) {
        try {
          router.navigate(step.route);
        } catch {
          // A failed route change simply lets the retry loop skip the step.
        }
      }

      const deadline = Date.now() + TARGET_WAIT_MS;

      const attempt = () => {
        if (run !== activeRunRef.current || !isActiveRef.current) return;

        measureTarget(step.targetId);
        if (targetRectsRef.current[step.targetId]) {
          setIsTargetReady(true);
          return;
        }

        if (Date.now() >= deadline) {
          // The target never showed up (for example, a check-in already hid
          // the mood faces). Move on instead of breaking the whole tour.
          if (safeIndex >= steps.length - 1) {
            finish();
          } else {
            activateStepRef.current(safeIndex + 1);
          }
          return;
        }

        autoAdvanceTimerRef.current = setTimeout(attempt, TARGET_POLL_MS);
      };

      // Give the navigator a frame to start the route transition.
      autoAdvanceTimerRef.current = setTimeout(attempt, 30);
    },
    [clearAutoAdvanceTimer, finish, forgetRect, measureTarget, router, steps]
  );

  activateStepRef.current = activateStep;

  const start = useCallback(() => {
    if (steps.length === 0 || isActiveRef.current) return;

    completionStartedRef.current = false;
    isActiveRef.current = true;
    setIsActive(true);
    setIsTargetReady(false);
    setCurrentStep(0);
    currentStepRef.current = 0;

    activateStepRef.current(0);
  }, [steps.length]);

  const next = useCallback(() => {
    if (!isActiveRef.current) return;
    if (currentStepRef.current >= steps.length - 1) {
      finish();
      return;
    }
    activateStepRef.current(currentStepRef.current + 1);
  }, [finish, steps.length]);

  const back = useCallback(() => {
    if (!isActiveRef.current || currentStepRef.current <= 0) return;
    activateStepRef.current(currentStepRef.current - 1);
  }, []);

  // A light impact on every step change, including the first step.
  useEffect(() => {
    if (!isActive) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [currentStep, isActive]);

  // Keep the index valid if a caller swaps in a shorter steps array.
  useEffect(() => {
    if (currentStep > steps.length - 1) {
      const nextIndex = Math.max(0, steps.length - 1);
      currentStepRef.current = nextIndex;
      setCurrentStep(nextIndex);
    }
  }, [currentStep, steps.length]);

  // A different account gets its own tour, so unlock completion again.
  useEffect(() => {
    completionStartedRef.current = false;
  }, [userId]);

  // Stop the wait loop if the provider tree unmounts mid-tour.
  useEffect(
    () => () => {
      activeRunRef.current += 1;
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    },
    []
  );

  const value = useMemo<TourContextValue>(
    () => ({
      steps,
      currentStep,
      isActive,
      isTargetReady,
      targetRects,
      start,
      next,
      back,
      skip,
      finish,
      registerTarget,
      unregisterTarget,
      measureTarget,
      measureCurrentTarget,
      measureAll,
    }),
    [
      steps,
      currentStep,
      isActive,
      isTargetReady,
      targetRects,
      start,
      next,
      back,
      skip,
      finish,
      registerTarget,
      unregisterTarget,
      measureTarget,
      measureCurrentTarget,
      measureAll,
    ]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};
