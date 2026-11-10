import { useCallback, useRef } from 'react';
import type { ScrollViewProps } from 'react-native';
import { useTour } from './TourContext';

type TourScrollProps = Pick<
  ScrollViewProps,
  'onScroll' | 'onScrollEndDrag' | 'onMomentumScrollEnd' | 'scrollEventThrottle'
>;

/**
 * ScrollView props that keep the active tour cutout aligned while the page
 * scrolls. Spread them onto any ScrollView that contains tour targets:
 *
 *   const tourScroll = useTourScroll();
 *   <ScrollView {...tourScroll} />
 *
 * Measurements are throttled so a fast fling does not flood measureInWindow.
 */
export function useTourScroll(): TourScrollProps {
  const { isActive, measureCurrentTarget } = useTour();
  const lastMeasureRef = useRef(0);

  const handleScroll = useCallback(() => {
    if (!isActive) return;

    const now = Date.now();
    if (now - lastMeasureRef.current < 80) return;
    lastMeasureRef.current = now;
    measureCurrentTarget();
  }, [isActive, measureCurrentTarget]);

  const handleScrollEnd = useCallback(() => {
    if (!isActive) return;
    lastMeasureRef.current = Date.now();
    measureCurrentTarget();
  }, [isActive, measureCurrentTarget]);

  return {
    onScroll: handleScroll,
    onScrollEndDrag: handleScrollEnd,
    onMomentumScrollEnd: handleScrollEnd,
    scrollEventThrottle: 16,
  };
}
