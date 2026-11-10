import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { radii } from '../theme/spacing';
import { shadows, ShadowKey } from '../theme/shadows';

export type GlassCardVariant =
  'frosted' | 'surface' | 'solid' | 'softSage' | 'softLavender' | 'softPeach' | 'mint';

export interface GlassCardProps {
  children: React.ReactNode;
  variant?: GlassCardVariant;
  radius?: number;
  shadow?: ShadowKey;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: ViewStyle;
  blurIntensity?: number;
  hapticFeedback?: boolean;
  accessibilityLabel?: string;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const overlayForVariant = (variant: GlassCardVariant): string => {
  switch (variant) {
    case 'surface':
      return 'rgba(255, 255, 255, 0.72)';
    case 'solid':
      return 'rgba(255, 255, 255, 0.94)';
    case 'softLavender':
      return 'rgba(243, 232, 251, 0.62)';
    case 'softPeach':
      return 'rgba(253, 232, 237, 0.62)';
    case 'softSage':
    case 'mint':
      return 'rgba(232, 247, 242, 0.62)';
    case 'frosted':
    default:
      return colors.glass;
  }
};

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'frosted',
  radius = radii.card,
  shadow = 'frosted',
  onPress,
  style,
  contentStyle,
  blurIntensity = 34,
  hapticFeedback = true,
  accessibilityLabel,
  disabled = false,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!onPress || disabled) return;
    scale.value = withSpring(0.98, { damping: 18, stiffness: 320 });
  };

  const handlePressOut = () => {
    if (!onPress || disabled) return;
    scale.value = withSpring(1, { damping: 18, stiffness: 320 });
  };

  const handlePress = () => {
    if (!onPress || disabled) return;
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  const layerRadius = { borderRadius: radius };

  const surface = (
    <>
      <BlurView
        intensity={blurIntensity}
        tint="light"
        style={[StyleSheet.absoluteFill, layerRadius, styles.clip]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          layerRadius,
          { backgroundColor: overlayForVariant(variant) },
        ]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
        locations={[0, 0.38, 0.72]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.65, y: 1 }}
        style={[StyleSheet.absoluteFill, layerRadius]}
      />
      <View style={contentStyle}>{children}</View>
    </>
  );

  const cardStyle = [
    styles.card,
    layerRadius,
    shadows[shadow] || shadows.frosted,
    disabled && styles.disabled,
    style,
  ];

  return onPress ? (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[...cardStyle, animatedStyle]}
    >
      {surface}
    </AnimatedPressable>
  ) : (
    <View style={cardStyle}>{surface}</View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    minHeight: 44,
  },
  clip: {
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.5,
  },
});
