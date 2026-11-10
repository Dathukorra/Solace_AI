import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  AnimatedStyle,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

interface GlowProps {
  id: string;
  color: string;
  size: number;
  opacity: number;
  style: StyleProp<ViewStyle>;
  animatedStyle: AnimatedStyle<ViewStyle>;
}

const Glow: React.FC<GlowProps> = ({ id, color, size, opacity, style, animatedStyle }) => (
  <Animated.View
    pointerEvents="none"
    style={[{ position: 'absolute', width: size, height: size, opacity }, style, animatedStyle]}
  >
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0%" stopColor={color} stopOpacity="0.72" />
          <Stop offset="45%" stopColor={color} stopOpacity="0.34" />
          <Stop offset="78%" stopColor={color} stopOpacity="0.08" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
    </Svg>
  </Animated.View>
);

/**
 * Dreamy lavender-to-blush canvas shared by the welcome screen and the
 * onboarding carousel. Two oversized radial glows drift very slowly so the
 * background feels alive without pulling focus.
 */
export const AuroraBackground: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const instanceId = React.useId().replace(/:/g, '');

  const driftOne = useSharedValue(0);
  const driftTwo = useSharedValue(0);

  useEffect(() => {
    driftOne.value = withRepeat(
      withTiming(1, { duration: 18000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    driftTwo.value = withRepeat(
      withTiming(1, { duration: 23000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [driftOne, driftTwo]);

  const glowOneStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(driftOne.value, [0, 1], [-14, 26]) },
      { translateY: interpolate(driftOne.value, [0, 1], [-8, 40]) },
      { scale: interpolate(driftOne.value, [0, 1], [0.98, 1.08]) },
    ],
  }));

  const glowTwoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(driftTwo.value, [0, 1], [12, -30]) },
      { translateY: interpolate(driftTwo.value, [0, 1], [6, -34]) },
      { scale: interpolate(driftTwo.value, [0, 1], [1.06, 0.96]) },
    ],
  }));

  const glowOneSize = Math.max(width * 1.12, 430);
  const glowTwoSize = Math.max(width * 0.94, 360);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#E9D5F5', '#F6DDEB', '#FBD9E4', '#F3E3F7']}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Glow
        id={`auroraLavender-${instanceId}`}
        color="#C79BE8"
        size={glowOneSize}
        opacity={0.8}
        style={{ top: -glowOneSize * 0.38, right: -glowOneSize * 0.3 }}
        animatedStyle={glowOneStyle}
      />
      <Glow
        id={`auroraBlush-${instanceId}`}
        color="#F26B8A"
        size={glowTwoSize}
        opacity={0.5}
        style={{ bottom: -glowTwoSize * 0.3 + (height > 800 ? 24 : 0), left: -glowTwoSize * 0.26 }}
        animatedStyle={glowTwoStyle}
      />
    </View>
  );
};

export default AuroraBackground;
