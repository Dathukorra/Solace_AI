import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { GlassCard, GlassCardVariant } from './GlassCard';
import { ShadowKey } from '../theme/shadows';

export type CardVariant =
  'frosted' | 'surface' | 'solid' | 'softSage' | 'softLavender' | 'softPeach' | 'mint';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  radius?: number;
  shadow?: ShadowKey;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: ViewStyle;
  hapticFeedback?: boolean;
  accessibilityLabel?: string;
  disabled?: boolean;
}

/**
 * Backward-compatible Card wrapper around the glass surface.
 * Screens can keep using `Card`; new code can reach for `GlassCard` directly.
 */
export const Card: React.FC<CardProps> = ({
  variant = 'frosted',
  radius = 28,
  shadow = 'frosted',
  ...props
}) => {
  const glassVariant: GlassCardVariant =
    variant === 'softSage' ? 'mint' : (variant as GlassCardVariant);

  return <GlassCard {...props} variant={glassVariant} radius={radius} shadow={shadow} />;
};
