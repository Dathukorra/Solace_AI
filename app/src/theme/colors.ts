/**
 * Solace Design System - Soft Glassmorphism Pastel Tokens
 *
 * Lavender-to-blush canvas, violet primary gradient, translucent glass
 * surfaces, deep plum text, and gentle mood accents.
 */

export const palette = {
  // Pastel Canvas
  lavenderBg: '#E9D5F5',
  blushBg: '#F6DDEB',
  pinkBg: '#FBD9E4',
  glass: 'rgba(255, 255, 255, 0.55)',
  glassStrong: 'rgba(255, 255, 255, 0.78)',
  glassSoft: 'rgba(255, 255, 255, 0.38)',
  glassBorder: 'rgba(255, 255, 255, 0.7)',
  glassBorderSoft: 'rgba(255, 255, 255, 0.45)',

  // Brand Violets
  violet: '#A63DE8',
  violetDeep: '#8B5CF6',
  violetDark: '#7426B4',
  violetLight: '#F3E8FB',
  violetMuted: '#E4D0F7',

  // Secondary Soft Purple
  softPurple: '#C79BE8',
  softPurpleDark: '#9B6BC9',
  softPurpleLight: '#F6ECFC',
  softPurpleMuted: '#E9D9F5',

  // Blush Accent
  blush: '#F26B8A',
  blushDark: '#D94E70',
  blushLight: '#FDE8ED',
  blushMuted: '#F9CBD6',

  // Ink & Neutrals
  ink: '#1E1B2E',
  inkSecondary: '#4B455C',
  inkMuted: '#6B6478',
  inkSubtle: '#A9A2B5',

  // Mood Accents
  moodHappy: '#F26B8A',
  moodSad: '#FFD66B',
  moodAngry: '#F59A4E',
  moodCry: '#6B7280',
  moodCalm: '#9ED8C6',

  // Functional / Feedback
  success: '#66BFA4',
  warning: '#F59A4E',
  error: '#E05A7A',
  info: '#8B5CF6',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Backward-compatible aliases (soft pastel remap)
  sage: '#8B5CF6',
  sageDark: '#7426B4',
  sageLight: '#F3E8FB',
  sageMuted: '#E4D0F7',
  cream: '#F6DDEB',
  creamDark: '#E9D5F5',
  creamSurface: 'rgba(255, 255, 255, 0.55)',
  creamCard: 'rgba(255, 255, 255, 0.55)',
  lavender: '#C79BE8',
  lavenderDark: '#9B6BC9',
  lavenderLight: '#F6ECFC',
  lavenderMuted: '#E9D9F5',
  peach: '#F26B8A',
  peachDark: '#D94E70',
  peachLight: '#FDE8ED',
  peachMuted: '#F9CBD6',
  indigoGray: '#1E1B2E',
  indigoGraySecondary: '#4B455C',
  indigoGrayMuted: '#6B6478',
  indigoGraySubtle: '#A9A2B5',
} as const;

export const moodColors = {
  happy: palette.moodHappy,
  sad: palette.moodSad,
  angry: palette.moodAngry,
  cry: palette.moodCry,
  calm: palette.moodCalm,
} as const;

export const moodGradients = {
  /** Mood 1: Sad - warm butter yellow */
  1: ['#FFE7A0', '#FFD66B'] as const,
  /** Mood 2: Low / tender - hazy slate */
  2: ['#D9DCE4', '#B0B4C1'] as const,
  /** Mood 3: Neutral - soft lilac */
  3: ['#E3CBF4', '#C79BE8'] as const,
  /** Mood 4: Good / calm - mint glass */
  4: ['#C8EFE3', '#9ED8C6'] as const,
  /** Mood 5: Happy - rosy blush */
  5: ['#F8A6B8', '#F26B8A'] as const,
} as const;

export const backgroundGradients = {
  /** Default pastel lavender -> blush -> pink canvas */
  screen: ['#E9D5F5', '#F6DDEB', '#FBD9E4'] as const,
  /** Soft lilac wash */
  lavenderGlow: ['#E9D5F5', '#F6DDEB'] as const,
  /** Soft rose wash */
  blushGlow: ['#F6DDEB', '#FBD9E4'] as const,
  /** Mint calm wash */
  calmGlow: ['#E8F7F2', '#F6DDEB'] as const,
  /** Backward-compatible aliases */
  sageGlow: ['#E8F7F2', '#F6DDEB'] as const,
  peachGlow: ['#FBD9E4', '#F6DDEB'] as const,
  /** Frosted glass fill */
  frosted: ['rgba(255, 255, 255, 0.68)', 'rgba(255, 255, 255, 0.42)'] as const,
  /** Primary action gradient */
  primary: ['#A63DE8', '#8B5CF6'] as const,
} as const;

export const primaryGradient = backgroundGradients.primary;

export const colors = {
  // Canvas & Surfaces
  background: '#F6DDEB',
  backgroundSecondary: '#E9D5F5',
  surface: 'rgba(255, 255, 255, 0.55)',
  surfaceStrong: 'rgba(255, 255, 255, 0.78)',
  card: 'rgba(255, 255, 255, 0.55)',
  cardFrosted: 'rgba(255, 255, 255, 0.55)',
  cardSolid: '#FFFFFF',

  // Brand / Actions
  primary: palette.violet,
  primaryDark: palette.violetDark,
  primaryLight: palette.violetLight,
  primaryMuted: palette.violetMuted,
  primaryGradient,
  primaryGradientHorizontal: ['#A63DE8', '#8B5CF6', '#C79BE8'] as const,
  primarySoftGradient: ['rgba(166, 61, 232, 0.14)', 'rgba(139, 92, 246, 0.1)'] as const,

  // Secondary & Accents
  secondary: palette.softPurple,
  secondaryDark: palette.softPurpleDark,
  secondaryLight: palette.softPurpleLight,
  secondaryMuted: palette.softPurpleMuted,
  accent: palette.blush,
  accentDark: palette.blushDark,
  accentLight: palette.blushLight,
  accentMuted: palette.blushMuted,
  mint: palette.moodCalm,

  // Text Tokens (Deep Plum)
  text: palette.ink,
  textSecondary: palette.inkSecondary,
  textMuted: palette.inkMuted,
  textSubtle: palette.inkSubtle,
  textInverse: palette.white,

  // Borders & Dividers
  border: 'rgba(255, 255, 255, 0.7)',
  borderStrong: 'rgba(199, 155, 232, 0.42)',
  borderFrosted: 'rgba(255, 255, 255, 0.7)',
  divider: 'rgba(107, 100, 120, 0.12)',

  // Glass-specific helpers
  glass: palette.glass,
  glassStrong: palette.glassStrong,
  glassSoft: palette.glassSoft,
  glassBorder: palette.glassBorder,
  glassBorderSoft: palette.glassBorderSoft,
  glassHighlight: 'rgba(255, 255, 255, 0.82)',
  blobLavender: 'rgba(199, 155, 232, 0.55)',
  blobBlush: 'rgba(242, 107, 138, 0.32)',

  // Feedback
  success: palette.success,
  warning: palette.warning,
  error: palette.error,
  info: palette.info,

  // Mood
  moodColors,
  moodGradients,

  // Gradients
  backgroundGradients,

  // Backward compatibility alias for light mode
  light: {
    background: '#F6DDEB',
    card: 'rgba(255, 255, 255, 0.55)',
    text: palette.ink,
    textSecondary: palette.inkSecondary,
    textMuted: palette.inkMuted,
    border: 'rgba(255, 255, 255, 0.7)',
    primary: palette.violet,
    primaryGradient,
    secondary: palette.softPurple,
    accent: palette.blush,
    success: palette.success,
    warning: palette.warning,
    error: palette.error,
    tabBar: 'rgba(255, 255, 255, 0.72)',
    tabBarBorder: 'rgba(255, 255, 255, 0.7)',
  },
};

export type ThemeColors = typeof colors;
export type MoodName = keyof typeof moodColors;
