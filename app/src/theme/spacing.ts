/**
 * Solace Design System - Spacing & Radii Scale
 *
 * Spacing Scale: 4, 8, 12, 16, 24, 32
 * Radii Scale: 16, 24, 28 (cards), 32, 999 (pills)
 */

export const spacing = {
  // Numeric keys
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  24: 24,
  32: 32,

  // Semantic aliases
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
} as const;

export const radii = {
  // Numeric keys
  16: 16,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
  56: 56,

  // Semantic aliases
  sm: 16,
  md: 24,
  card: 28,
  lg: 32,
  pill: 999,
  button: 999,
  chip: 999,
  full: 999,
  none: 0,
} as const;

export const componentSizes = {
  buttonHeight: 56,
  iconButton: 48,
  inputHeight: 56,
  tabBarHeight: 68,
} as const;

export type SpacingValue = (typeof spacing)[keyof typeof spacing];
export type RadiiValue = (typeof radii)[keyof typeof radii];
