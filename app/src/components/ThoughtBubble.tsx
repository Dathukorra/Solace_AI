import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Circle } from 'react-native-svg';

export interface ThoughtBubbleProps {
  children: React.ReactNode;
  style?: React.ComponentProps<typeof View>['style'];
  minHeight?: number;
}

/**
 * Cloud-shaped translucent caption bubble with two trailing thought circles.
 * The SVG is the surface; content sits above it.
 */
export const ThoughtBubble: React.FC<ThoughtBubbleProps> = ({
  children,
  style,
  minHeight = 84,
}) => {
  const instanceId = React.useId().replace(/:/g, '');
  const fillId = `thoughtCloudFill-${instanceId}`;

  return (
    <View style={[styles.wrapper, { minHeight }, style]}>
      <Svg
        pointerEvents="none"
        width="100%"
        height="100%"
        viewBox="0 0 280 116"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id={fillId} x1="0.08" y1="0.05" x2="0.85" y2="0.95">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.82)" />
            <Stop offset="55%" stopColor="rgba(255,255,255,0.62)" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0.42)" />
          </LinearGradient>
        </Defs>
        <Path
          d="M 62 16
             C 46 16 32 26 26 40
             C 14 44 7 55 10 67
             C 12 78 22 86 34 88
             C 38 98 49 104 60 103
             C 75 103 86 93 89 81
             L 218 81
             C 225 90 236 96 248 94
             C 261 92 271 81 271 68
             C 271 54 260 43 247 42
             C 245 27 233 15 219 14
             C 206 13 195 21 190 33
             C 183 23 172 17 160 17
             C 147 17 136 24 130 35
             C 122 24 108 16 93 16
             C 82 16 72 21 66 29
             C 65 24 64 20 62 16 Z"
          fill={`url(#${fillId})`}
          stroke="rgba(255,255,255,0.78)"
          strokeWidth="3"
        />
        <Circle
          cx="28"
          cy="101"
          r="7"
          fill="rgba(255,255,255,0.68)"
          stroke="rgba(255,255,255,0.72)"
          strokeWidth="2"
        />
        <Circle cx="17" cy="114" r="4" fill="rgba(255,255,255,0.58)" />
      </Svg>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 22,
  },
});

export default ThoughtBubble;
