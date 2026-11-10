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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { componentSizes, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import { Text } from './Text';

export interface GradientButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  hapticFeedback?: boolean;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = true,
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
    if (disabled || loading) return;
    scale.value = withSpring(0.97, { damping: 16, stiffness: 340 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 16, stiffness: 340 });
  };

  const handlePress = () => {
    if (disabled || loading) return;
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onPress();
  };

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
        styles.wrapper,
        fullWidth ? styles.fullWidth : styles.autoWidth,
        shadows.button,
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      <LinearGradient
        colors={['#A63DE8', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.34)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
          locations={[0, 0.42, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={styles.sheen}
        />
        {loading ? (
          <ActivityIndicator color={colors.textInverse} size="small" />
        ) : (
          <View style={styles.content}>
            {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
            <Text style={[styles.label, textStyle]}>{title}</Text>
            {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
          </View>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    height: componentSizes.buttonHeight,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  autoWidth: {
    alignSelf: 'flex-start',
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
    paddingHorizontal: spacing[24],
  },
  sheen: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.display.extraBold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: 0.15,
    color: colors.textInverse,
  },
  leftIcon: {
    marginRight: spacing[8],
  },
  rightIcon: {
    marginLeft: spacing[8],
  },
  disabled: {
    opacity: 0.48,
  },
});
