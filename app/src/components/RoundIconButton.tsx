import React from 'react';
import { Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { shadows } from '../theme/shadows';

export type RoundIconButtonVariant = 'glass' | 'gradient' | 'plain';

export interface RoundIconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: RoundIconButtonVariant;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  hapticFeedback?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const RoundIconButton: React.FC<RoundIconButtonProps> = ({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'glass',
  size = 48,
  disabled = false,
  style,
  hapticFeedback = true,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.92, { damping: 16, stiffness: 360 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 16, stiffness: 360 });
  };

  const handlePress = () => {
    if (disabled) return;
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  const dimension = { width: size, height: size, borderRadius: size / 2 };

  const content =
    variant === 'gradient' ? (
      <LinearGradient
        colors={['#A63DE8', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.fill, dimension]}
      >
        {icon}
      </LinearGradient>
    ) : (
      icon
    );

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[
        styles.base,
        dimension,
        variant === 'glass' && styles.glass,
        variant === 'plain' && styles.plain,
        variant === 'gradient' && shadows.button,
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {content}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
  },
  plain: {
    backgroundColor: 'transparent',
  },
  fill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});
