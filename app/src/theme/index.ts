import {
  colors,
  palette,
  moodColors,
  moodGradients,
  backgroundGradients,
  primaryGradient,
  ThemeColors,
} from './colors';
import { fonts, typography, fontSizes, TypographyVariant } from './typography';
import { spacing, radii, componentSizes, SpacingValue, RadiiValue } from './spacing';
import { shadows, ShadowKey } from './shadows';

export const theme = {
  colors,
  palette,
  moodColors,
  moodGradients,
  backgroundGradients,
  primaryGradient,
  typography,
  fonts,
  fontSizes,
  spacing,
  radii,
  componentSizes,
  shadows,
};

export {
  colors,
  palette,
  moodColors,
  moodGradients,
  backgroundGradients,
  primaryGradient,
  typography,
  fonts,
  fontSizes,
  spacing,
  radii,
  componentSizes,
  shadows,
};

export type { ThemeColors, TypographyVariant, SpacingValue, RadiiValue, ShadowKey };
export default theme;
