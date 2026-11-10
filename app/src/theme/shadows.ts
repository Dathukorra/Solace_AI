import { ViewStyle } from 'react-native';

/**
 * Solace Design System - Purple-Tinted Glass Shadows
 * Soft, diffuse and dreamy. Every surface floats gently above the pastel canvas.
 */

export const shadows: Record<'sm' | 'md' | 'lg' | 'frosted' | 'glow' | 'button', ViewStyle> = {
  sm: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
  md: {
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 5,
  },
  lg: {
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 34,
    elevation: 10,
  },
  frosted: {
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 26,
    elevation: 6,
  },
  glow: {
    shadowColor: '#A63DE8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 8,
  },
  button: {
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 6,
  },
};

export const glassShadow = shadows.frosted;
export const buttonShadow = shadows.button;

export type ShadowKey = keyof typeof shadows;
