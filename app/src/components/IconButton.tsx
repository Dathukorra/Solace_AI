import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { RoundIconButton } from './RoundIconButton';

export type IconButtonVariant = 'ghost' | 'soft' | 'primary' | 'surface';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  hapticFeedback?: boolean;
}

/**
 * Backward-compatible wrapper. Every icon action becomes a soft translucent
 * circle, with the primary variant using the violet gradient.
 */
export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  style,
  hapticFeedback = true,
}) => {
  const dimension = size === 'sm' ? 44 : size === 'lg' ? 56 : 48;

  return (
    <RoundIconButton
      icon={icon}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      variant={variant === 'primary' ? 'gradient' : 'glass'}
      size={dimension}
      disabled={disabled}
      style={style}
      hapticFeedback={hapticFeedback}
    />
  );
};
