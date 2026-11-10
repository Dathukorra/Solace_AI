import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { Href } from 'expo-router';

/**
 * One stop in an app tour. `targetId` links the step to a component that has
 * registered itself through `useTourTarget(targetId)`.
 */
export interface TourStep {
  id: string;
  targetId: string;
  title: string;
  /** Keep this to one short sentence. */
  description: string;
  /**
   * Screen to open before measuring `targetId`. The tour waits up to one
   * second for the target to appear on that screen.
   */
  route?: Href;
  /** Extra breathing room around the measured target. Defaults to 8. */
  padding?: number;
  /** Corner radius of the cutout. Defaults to 24. */
  radius?: number;
}

export interface TourTargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TourTargetRef = RefObject<View>;

export type TourCompletionReason = 'skip' | 'finish';
