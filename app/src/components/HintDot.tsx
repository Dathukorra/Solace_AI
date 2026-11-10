import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

export interface HintDotProps {
  visible: boolean;
  /** Position overrides for the dot's container. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * A soft, repeating pulse used to point out a feature once. The parent owns
 * dismissal; this component is purely visual.
 */
export const HintDot: React.FC<HintDotProps> = ({ visible, style, testID }) => {
  const pulse = useSharedValue(0.4);
  const ring = useSharedValue(0.6);

  useEffect(() => {
    if (!visible) {
      cancelAnimation(pulse);
      cancelAnimation(ring);
      return;
    }

    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.45, { duration: 900, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    ring.value = withRepeat(
      withSequence(
        withTiming(1.55, { duration: 1400, easing: Easing.out(Easing.quad) }),
        withTiming(0.8, { duration: 0 })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(pulse);
      cancelAnimation(ring);
    };
  }, [pulse, ring, visible]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.9 + pulse.value * 0.15 }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: (1 - (ring.value - 0.8) / 0.75) * 0.38,
    transform: [{ scale: ring.value }],
  }));

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={[styles.container, style]} testID={testID}>
      <Animated.View style={[styles.ring, ringStyle]} />
      <Animated.View style={[styles.dot, dotStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.cardSolid,
  },
  ring: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
});
