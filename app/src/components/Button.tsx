import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { Text } from './Text';
import { GradientButton } from './GradientButton';

export type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'secondary' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  hapticFeedback?: boolean;
  accessibilityLabel?: string;
  /** Opt into the full-width 56px gradient action. Legacy inline buttons stay compact. */
  fullWidth?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  hapticFeedback = true,
  accessibilityLabel,
  fullWidth = false,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withSpring(0.97, { damping: 16, stiffness: 340 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 16, stiffness: 340 });
  };

  const handlePress = () => {
    if (disabled || loading) return;
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  if (variant === 'primary') {
    return (
      <GradientButton
        title={title}
        onPress={onPress}
        loading={loading}
        disabled={disabled}
        leftIcon={leftIcon}
        rightIcon={rightIcon}
        style={style}
        textStyle={textStyle}
        hapticFeedback={hapticFeedback}
        accessibilityLabel={accessibilityLabel}
        fullWidth={fullWidth}
      />
    );
  }

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle; loaderColor: string } => {
    switch (variant) {
      case 'soft':
        return {
          container: {
            backgroundColor: 'rgba(255, 255, 255, 0.48)',
            borderWidth: 1.5,
            borderColor: colors.glassBorder,
          },
          text: { color: colors.primaryDark },
          loaderColor: colors.primaryDark,
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: 'rgba(199, 155, 232, 0.26)',
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.62)',
          },
          text: { color: colors.secondaryDark },
          loaderColor: colors.secondaryDark,
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
            borderWidth: 1.5,
            borderColor: colors.primary,
          },
          text: { color: colors.primary },
          loaderColor: colors.primary,
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: 'transparent',
          },
          text: { color: colors.textMuted },
          loaderColor: colors.textMuted,
        };
      default:
        return {
          container: {
            backgroundColor: colors.primary,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.32)',
          },
          text: { color: colors.textInverse },
          loaderColor: colors.textInverse,
        };
    }
  };

  const variantStyle = getVariantStyles();

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      accessibilityLabel={accessibilityLabel || title}
      style={[
        styles.base,
        size === 'sm' && styles.sizeSm,
        size === 'md' && styles.sizeMd,
        size === 'lg' && styles.sizeLg,
        variantStyle.container,
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.loaderColor} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
          <Text
            style={[
              styles.text,
              size === 'sm' && styles.textSm,
              size === 'lg' && styles.textLg,
              variantStyle.text,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
        </View>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  sizeSm: {
    minHeight: 44,
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
  },
  sizeMd: {
    minHeight: 52,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[24],
  },
  sizeLg: {
    minHeight: 56,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[32],
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIconContainer: {
    marginRight: spacing[8],
  },
  rightIconContainer: {
    marginLeft: spacing[8],
  },
  text: {
    fontFamily: fonts.display.bold,
    fontSize: 16,
    letterSpacing: 0.1,
  },
  textSm: {
    fontSize: 14,
  },
  textLg: {
    fontSize: 17,
    fontFamily: fonts.display.extraBold,
  },
  disabled: {
    opacity: 0.45,
  },
});
