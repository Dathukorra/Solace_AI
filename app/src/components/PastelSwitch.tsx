import React from 'react';
import { Platform, Switch, SwitchProps } from 'react-native';
import { colors } from '../theme/colors';

/**
 * A pastel-themed switch.
 *
 * React Native Web ignores `thumbColor` for the active state and uses
 * `activeThumbColor` instead, so we pass that web-only prop to keep the
 * thumb white across platforms.
 */
const webProps = (Platform.OS === 'web' ? { activeThumbColor: '#FFFFFF' } : {}) as SwitchProps;

export const PastelSwitch: React.FC<SwitchProps> = (props) => (
  <Switch
    thumbColor="#FFFFFF"
    trackColor={{ false: 'rgba(199, 155, 232, 0.35)', true: colors.primary }}
    {...webProps}
    {...props}
  />
);
