import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export type TextVariant =
  | 'display'
  | 'displayLg'
  | 'title'
  | 'titleSm'
  | 'subtitle' // alias for titleSm
  | 'body'
  | 'bodyMedium'
  | 'bodySm'
  | 'caption'
  | 'captionSm'
  | 'bold'; // alias for body bold

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = colors.text,
  align,
  style,
  children,
  ...props
}) => {
  const getVariantStyle = (): TextStyle => {
    switch (variant) {
      case 'display':
        return typography.display;
      case 'displayLg':
        return typography.displayLg;
      case 'title':
        return typography.title;
      case 'titleSm':
      case 'subtitle':
        return typography.titleSm;
      case 'bodyMedium':
        return typography.bodyMedium;
      case 'bodySm':
        return typography.bodySm;
      case 'caption':
        return typography.caption;
      case 'captionSm':
        return typography.captionSm;
      case 'bold':
        return typography.bodyMedium;
      case 'body':
      default:
        return typography.body;
    }
  };

  return (
    <RNText
      style={[getVariantStyle(), { color }, align ? { textAlign: align } : undefined, style]}
      {...props}
    >
      {children}
    </RNText>
  );
};
