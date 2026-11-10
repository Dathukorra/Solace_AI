import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle, TextStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { Text } from './Text';

export type ChipVariant = 'sage' | 'lavender' | 'peach' | 'neutral' | 'outline';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  variant?: ChipVariant;
  icon?: React.ReactNode;
  emoji?: string;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  hapticFeedback?: boolean;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  variant = 'sage',
  icon,
  emoji,
  disabled = false,
  style,
  textStyle,
  hapticFeedback = true,
  accessibilityLabel,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled || !onPress) return;
    scale.value = withSpring(0.95, { damping: 16, stiffness: 360 });
  };

  const handlePressOut = () => {
    if (disabled || !onPress) return;
    scale.value = withSpring(1, { damping: 16, stiffness: 360 });
  };

  const handlePress = () => {
    if (disabled || !onPress) return;
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  const unselectedBackground = (): string => {
    switch (variant) {
      case 'lavender':
        return 'rgba(246, 236, 252, 0.68)';
      case 'peach':
        return 'rgba(253, 232, 237, 0.68)';
      case 'neutral':
        return 'rgba(255, 255, 255, 0.42)';
      case 'outline':
        return 'rgba(255, 255, 255, 0.22)';
      case 'sage':
      default:
        return 'rgba(255, 255, 255, 0.48)';
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel || label}
      style={[styles.wrapper, animatedStyle, style]}
    >
      <View
        style={[
          styles.pill,
          {
            backgroundColor: unselectedBackground(),
            borderColor: variant === 'outline' ? colors.borderStrong : colors.glassBorder,
          },
          selected && styles.pillSelected,
          disabled && styles.disabled,
        ]}
      >
        {selected && (
          <LinearGradient
            colors={['#A63DE8', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {emoji && <Text style={styles.emoji}>{emoji}</Text>}
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text
          style={[
            styles.label,
            { color: selected ? colors.textInverse : colors.textSecondary },
            selected && styles.labelSelected,
            textStyle,
          ]}
        >
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: spacing[16],
    borderRadius: 999,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  pillSelected: {
    borderColor: 'rgba(255, 255, 255, 0.52)',
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  emoji: {
    fontSize: 16,
    marginRight: spacing[4],
  },
  iconContainer: {
    marginRight: spacing[4],
  },
  label: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    lineHeight: 18,
  },
  labelSelected: {
    fontFamily: fonts.body.semiBold,
  },
  disabled: {
    opacity: 0.45,
  },
});
