import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { shadows } from '../theme/shadows';

export interface BrandMarkProps {
  /** Width and height of the rounded logo tile. Defaults to 44 */
  size?: number;
}

/**
 * Solace logo tile: a soft violet squircle with a hand-drawn "S" and a tiny
 * spark of blush. Used in welcome sheets and the onboarding header.
 */
export const BrandMark: React.FC<BrandMarkProps> = ({ size = 44 }) => {
  const radius = size * 0.32;

  return (
    <View style={[styles.wrapper, { width: size, height: size, borderRadius: radius }, shadows.sm]}>
      <LinearGradient
        colors={['#A63DE8', '#8B5CF6']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <View
        pointerEvents="none"
        style={[styles.highlight, { borderRadius: radius, width: size * 0.7, height: size * 0.42 }]}
      />
      <Svg
        pointerEvents="none"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={StyleSheet.absoluteFill}
      >
        <Path
          d="M16.9 7.3c-1.2-1.2-3.4-1.4-5.1-.5-1.8.9-2.1 3.1-.6 4.3 1.2.9 3 .9 4.2 1.6 1.7 1 1.6 3.3-.2 4.3-1.8 1-4.2.7-5.7-.8"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx="17.8" cy="17" r="1.5" fill="#FDE8ED" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 1,
    left: '15%',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    transform: [{ rotate: '-18deg' }],
  },
});

export default BrandMark;
