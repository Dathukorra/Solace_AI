import { useCallback, useEffect, useRef } from 'react';
import type { View } from 'react-native';
import { useTour } from './TourContext';

/**
 * Registers a component as a tour target and keeps its window-space rectangle
 * fresh.
 *
 * Usage:
 *   const target = useTourTarget('home-mood-faces');
 *   <View ref={target.ref} onLayout={target.onLayout} collapsable={false} />
 *
 * The hook measures on every layout pass, whenever the tour becomes active or
 * changes step, and exposes `measure()` so a ScrollView can refresh positions
 * after scrolling (see `useTourScroll`).
 */
export function useTourTarget(id: string) {
  const { registerTarget, unregisterTarget, measureTarget, isActive } = useTour();
  const ref = useRef<View>(null);

  const measure = useCallback(() => {
    measureTarget(id);
  }, [id, measureTarget]);

  const onLayout = useCallback(() => {
    // Wait one frame so the final layout for this pass is committed.
    requestAnimationFrame(measure);
  }, [measure]);

  useEffect(() => {
    registerTarget(id, ref);
    return () => unregisterTarget(id);
  }, [id, registerTarget, unregisterTarget]);

  // Reposition when the tour opens or the device layout changes underneath it.
  useEffect(() => {
    if (!isActive) return;
    const timer = setTimeout(measure, 80);
    return () => clearTimeout(timer);
  }, [isActive, measure]);

  return { ref, onLayout, measure };
}
