/**
 * Solace Design System - Typography
 * One rounded family across the whole experience: Nunito.
 * Weights: 500 (body), 700 (headings), 800 (display).
 */

export const fonts = {
  display: {
    regular: 'Nunito_500Medium',
    medium: 'Nunito_500Medium',
    semiBold: 'Nunito_700Bold',
    bold: 'Nunito_700Bold',
    extraBold: 'Nunito_800ExtraBold',
  },
  body: {
    regular: 'Nunito_500Medium',
    medium: 'Nunito_500Medium',
    semiBold: 'Nunito_700Bold',
    bold: 'Nunito_700Bold',
  },
  heading: {
    regular: 'Nunito_500Medium',
    semiBold: 'Nunito_700Bold',
    bold: 'Nunito_700Bold',
    extraBold: 'Nunito_800ExtraBold',
  },
} as const;

/**
 * Requested Typography Scale:
 * display, title, body, caption
 */
export const typography = {
  display: {
    fontFamily: fonts.display.bold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  displayLg: {
    fontFamily: fonts.display.extraBold,
    fontSize: 38,
    lineHeight: 46,
    letterSpacing: -0.8,
  },
  title: {
    fontFamily: fonts.display.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  titleSm: {
    fontFamily: fonts.display.bold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  body: {
    fontFamily: fonts.body.regular,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyMedium: {
    fontFamily: fonts.body.medium,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodySm: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  captionSm: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.3,
  },
} as const;

export const fontSizes = {
  xs: 11,
  caption: 12,
  sm: 14,
  base: 16,
  titleSm: 18,
  title: 24,
  display: 32,
  displayLg: 38,
} as const;

export type TypographyVariant = keyof typeof typography;
