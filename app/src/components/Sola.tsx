import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Circle, Path, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

export type SolaMood = 'calm' | 'happy' | 'sad' | 'sleepy' | 'listening' | 'thinking';

export interface SolaProps {
  /** Sola's current emotional state */
  mood?: SolaMood;
  /** Width and height in points. Defaults to 120 */
  size?: number;
  /** Whether to render the soft outer luminous glow aura */
  showGlow?: boolean;
  /** Gently wave a little hand hello */
  waving?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const AnimatedG = Animated.createAnimatedComponent(G) as React.ComponentType<any>;
const AnimatedView = Animated.createAnimatedComponent(View);

export const Sola: React.FC<SolaProps> = ({
  mood = 'calm',
  size = 120,
  showGlow = true,
  waving = false,
  style,
  testID = 'sola-mascot',
}) => {
  // --- 1. Idle Animations: Slow Breathing & Gentle Floating ---
  const breathScale = useSharedValue(1);
  const floatY = useSharedValue(0);

  // --- 2. Periodic Blinking ---
  const blinkScaleY = useSharedValue(1);

  // --- 3. Mood Reaction: Tilt for 'listening' ---
  const tiltRotate = useSharedValue(0);

  // --- 4. Thinking Dots Opacity Pulses ---
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  // --- 5. Friendly Hello Wave ---
  const waveRotate = useSharedValue(0);

  // Idle breath & float loops
  useEffect(() => {
    // Breathing: expands and contracts gently (3.2s cycle)
    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.045, {
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0.985, {
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      true
    );

    // Float: subtly ascends and descends (2.6s cycle, offset from breath)
    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, {
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(2, {
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
        })
      ),
      -1,
      true
    );
  }, [breathScale, floatY]);

  // Periodic Blink Loop (every 3.8 seconds)
  useEffect(() => {
    if (mood === 'sleepy') {
      blinkScaleY.value = 0.08; // Eyes remain closed/sleepy
      return;
    }

    blinkScaleY.value = 1;
    const blinkInterval = setInterval(() => {
      // Rapid close (80ms) and open (120ms)
      blinkScaleY.value = withSequence(
        withTiming(0.08, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) })
      );
    }, 3800);

    return () => clearInterval(blinkInterval);
  }, [mood, blinkScaleY]);

  // Handle 'listening' tilt & 'thinking' dots
  useEffect(() => {
    if (mood === 'listening') {
      tiltRotate.value = withSpring(8.5, { damping: 14, stiffness: 180 });
    } else {
      tiltRotate.value = withSpring(0, { damping: 16, stiffness: 200 });
    }

    if (mood === 'thinking') {
      // Staggered pulsation for 3 thinking bubbles
      dot1Opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.25, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      setTimeout(() => {
        dot2Opacity.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.25, { duration: 500, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
      }, 200);
      setTimeout(() => {
        dot3Opacity.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.25, { duration: 500, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
      }, 400);
    } else {
      dot1Opacity.value = 0;
      dot2Opacity.value = 0;
      dot3Opacity.value = 0;
    }
  }, [mood, tiltRotate, dot1Opacity, dot2Opacity, dot3Opacity]);

  // Friendly wave loop (slightly delayed so it feels like a greeting)
  useEffect(() => {
    if (!waving) {
      waveRotate.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
      return;
    }

    waveRotate.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(18, { duration: 260, easing: Easing.inOut(Easing.quad) }),
          withTiming(-8, { duration: 260, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
  }, [waving, waveRotate]);

  // Animated styles for container and parts
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value },
      { scale: breathScale.value },
      { rotate: `${tiltRotate.value}deg` },
    ],
  }));

  const eyeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: blinkScaleY.value }],
  }));

  const dot1AnimatedStyle = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
  }));
  const dot2AnimatedStyle = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }));
  const dot3AnimatedStyle = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }));

  const waveAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${waveRotate.value}deg` }],
  }));

  // Palette based on mood state
  const getMoodColors = () => {
    switch (mood) {
      case 'happy':
        return {
          glowColor: colors.accent,
          blobStart: '#F8B4C5',
          blobEnd: '#F26B8A',
          accent: colors.accent,
        };
      case 'sad':
        return {
          glowColor: colors.moodColors.sad,
          blobStart: '#FFE9A8',
          blobEnd: '#FFD66B',
          accent: colors.moodColors.sad,
        };
      case 'sleepy':
        return {
          glowColor: colors.secondary,
          blobStart: '#DDC3F3',
          blobEnd: '#A67AD8',
          accent: colors.secondary,
        };
      case 'listening':
        return {
          glowColor: colors.primary,
          blobStart: '#C9A7EC',
          blobEnd: '#8B5CF6',
          accent: colors.primary,
        };
      case 'thinking':
        return {
          glowColor: colors.primaryDark,
          blobStart: '#BD91EA',
          blobEnd: '#A63DE8',
          accent: colors.secondary,
        };
      case 'calm':
      default:
        return {
          glowColor: colors.moodColors.calm,
          blobStart: '#B7E7D8',
          blobEnd: '#9ED8C6',
          accent: colors.moodColors.calm,
        };
    }
  };

  const currentTheme = getMoodColors();

  // SVG gradient ids must be unique per instance. When two Sola mascots are
  // mounted together (e.g. during a navigation transition), shared ids make
  // the browser resolve every fill to the first mascot's gradients.
  const instanceId = React.useId().replace(/:/g, '');
  const blobGradientId = `solaBlobGrad-${instanceId}`;
  const highlightGradientId = `solaHighlight-${instanceId}`;
  const auraGradientId = `solaAuraGlow-${instanceId}`;

  // Eye and Mouth path definitions per expression
  const renderFace = () => {
    switch (mood) {
      case 'happy':
        return (
          <>
            {/* Happy crescent eyes */}
            <Path
              d="M 33 46 Q 39 39 45 46"
              stroke={colors.text}
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M 55 46 Q 61 39 67 46"
              stroke={colors.text}
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
            {/* Rosy blush cheeks */}
            <Circle cx="29" cy="53" r="5" fill={colors.accent} opacity={0.6} />
            <Circle cx="71" cy="53" r="5" fill={colors.accent} opacity={0.6} />
            {/* Joyful open smile */}
            <Path
              d="M 40 56 Q 50 69 60 56"
              stroke={colors.text}
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );

      case 'sad':
        return (
          <>
            {/* Soft droopy eyes */}
            <AnimatedG style={eyeAnimatedStyle} origin="50, 46">
              <Circle cx="39" cy="46" r="3.8" fill={colors.text} />
              <Circle cx="61" cy="46" r="3.8" fill={colors.text} />
              {/* Little reflective sparkle */}
              <Circle cx="37.5" cy="44.5" r="1.3" fill="#FFFFFF" />
              <Circle cx="59.5" cy="44.5" r="1.3" fill="#FFFFFF" />
            </AnimatedG>
            {/* Subtle tear drop sparkle */}
            <Circle cx="66" cy="54" r="2" fill="#6B7280" opacity={0.65} />
            {/* Small gentle downward smile */}
            <Path
              d="M 42 63 Q 50 58 58 63"
              stroke={colors.text}
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );

      case 'sleepy':
        return (
          <>
            {/* Relaxed closed eye curves */}
            <Path
              d="M 33 46 Q 39 52 45 46"
              stroke={colors.text}
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M 55 46 Q 61 52 67 46"
              stroke={colors.text}
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
            />
            {/* Soft pink cheeks */}
            <Circle cx="30" cy="52" r="4.5" fill={colors.accent} opacity={0.4} />
            <Circle cx="70" cy="52" r="4.5" fill={colors.accent} opacity={0.4} />
            {/* Tiny relaxed mouth */}
            <Path
              d="M 46 58 Q 50 61 54 58"
              stroke={colors.text}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );

      case 'thinking':
        return (
          <>
            {/* Eyes looking up and slightly right */}
            <AnimatedG style={eyeAnimatedStyle} origin="50, 44">
              <Circle cx="40" cy="43" r="4" fill={colors.text} />
              <Circle cx="62" cy="43" r="4" fill={colors.text} />
              {/* Specular highlights looking upward */}
              <Circle cx="41.5" cy="41.5" r="1.5" fill="#FFFFFF" />
              <Circle cx="63.5" cy="41.5" r="1.5" fill="#FFFFFF" />
            </AnimatedG>
            {/* Curious little mouth */}
            <Path
              d="M 44 60 Q 51 58 57 59"
              stroke={colors.text}
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );

      case 'listening':
        return (
          <>
            {/* Attentive round open eyes with warm twinkle */}
            <AnimatedG style={eyeAnimatedStyle} origin="50, 44">
              <Circle cx="39" cy="45" r="4.3" fill={colors.text} />
              <Circle cx="61" cy="45" r="4.3" fill={colors.text} />
              <Circle cx="40.5" cy="43" r="1.8" fill="#FFFFFF" />
              <Circle cx="62.5" cy="43" r="1.8" fill="#FFFFFF" />
            </AnimatedG>
            {/* Gentle attentive smile */}
            <Path
              d="M 41 58 Q 50 66 59 58"
              stroke={colors.text}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            {/* Soft listening blush */}
            <Circle cx="31" cy="52" r="4.5" fill={colors.secondary} opacity={0.45} />
            <Circle cx="69" cy="52" r="4.5" fill={colors.secondary} opacity={0.45} />
          </>
        );

      case 'calm':
      default:
        return (
          <>
            {/* Calm, warm open eyes */}
            <AnimatedG style={eyeAnimatedStyle} origin="50, 45">
              <Circle cx="39" cy="45" r="4.2" fill={colors.text} />
              <Circle cx="61" cy="45" r="4.2" fill={colors.text} />
              <Circle cx="40.5" cy="43.2" r="1.6" fill="#FFFFFF" />
              <Circle cx="62.5" cy="43.2" r="1.6" fill="#FFFFFF" />
            </AnimatedG>
            {/* Soft pink cheeks */}
            <Circle cx="30" cy="52" r="4.5" fill={colors.accent} opacity={0.45} />
            <Circle cx="70" cy="52" r="4.5" fill={colors.accent} opacity={0.45} />
            {/* Sweet peaceful smile */}
            <Path
              d="M 42 58 Q 50 65 58 58"
              stroke={colors.text}
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );
    }
  };

  return (
    <View testID={testID} style={[styles.wrapper, { width: size, height: size }, style]}>
      <AnimatedView style={[styles.animatedContainer, containerAnimatedStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 100" style={styles.svg}>
          <Defs>
            {/* Core Organic Blob Gradient */}
            <LinearGradient id={blobGradientId} x1="0.2" y1="0.1" x2="0.8" y2="0.9">
              <Stop offset="0%" stopColor={currentTheme.blobStart} stopOpacity="1" />
              <Stop offset="100%" stopColor={currentTheme.blobEnd} stopOpacity="1" />
            </LinearGradient>

            {/* Inner highlight for jelly/glass-like depth */}
            <RadialGradient id={highlightGradientId} cx="0.4" cy="0.3" r="0.6">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <Stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.05" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>

            {/* Ambient Aura Glow Radial Gradient */}
            <RadialGradient id={auraGradientId} cx="0.5" cy="0.5" r="0.5">
              <Stop offset="40%" stopColor={currentTheme.glowColor} stopOpacity="0.35" />
              <Stop offset="75%" stopColor={currentTheme.glowColor} stopOpacity="0.12" />
              <Stop offset="100%" stopColor={currentTheme.glowColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* --- Outer Soft Glowing Rings / Aura --- */}
          {showGlow && (
            <>
              <Circle cx="50" cy="50" r="46" fill={`url(#${auraGradientId})`} />
              <Circle cx="50" cy="50" r="40" fill={currentTheme.glowColor} opacity={0.15} />
            </>
          )}

          {/* --- Main Sola Blob Body --- */}
          {/* Smooth, soft rounded organic droplet blob path */}
          <Path
            d="M 50 16 
               C 68 16, 83 28, 84 48 
               C 85 68, 71 83, 50 84 
               C 29 83, 15 68, 16 48 
               C 17 28, 32 16, 50 16 Z"
            fill={`url(#${blobGradientId})`}
          />

          {/* Soft inner light highlight */}
          <Path
            d="M 50 17 
               C 66 17, 80 28, 81 47 
               C 82 65, 69 79, 50 80 
               C 31 79, 18 65, 19 47 
               C 20 28, 34 17, 50 17 Z"
            fill={`url(#${highlightGradientId})`}
          />

          {/* --- Animated Facial Expression --- */}
          {renderFace()}

          {/* --- Three Softly Pulsing Dots Nearby (when thinking) --- */}
          {mood === 'thinking' && (
            <>
              <AnimatedG style={dot1AnimatedStyle}>
                <Circle cx="81" cy="27" r="3" fill={colors.secondaryDark} />
              </AnimatedG>
              <AnimatedG style={dot2AnimatedStyle}>
                <Circle cx="89" cy="20" r="4.2" fill={colors.secondary} />
              </AnimatedG>
              <AnimatedG style={dot3AnimatedStyle}>
                <Circle cx="94" cy="11" r="5.2" fill={colors.accent} />
              </AnimatedG>
            </>
          )}
        </Svg>
      </AnimatedView>

      {waving && (
        <AnimatedView
          pointerEvents="none"
          style={[
            styles.waveArm,
            {
              width: size * 0.58,
              height: size * 0.58,
              left: size * 0.55,
              top: size * 0.13,
            },
            waveAnimatedStyle,
          ]}
        >
          <Svg width="100%" height="100%" viewBox="0 0 58 58" style={styles.svg}>
            {/* Little arm with a soft bend */}
            <Path
              d="M 29 34 C 33 27, 36 23, 40 20"
              stroke={currentTheme.blobEnd}
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            {/* Rounded mitten hand + thumb */}
            <Circle cx="44" cy="15" r="7" fill={currentTheme.blobEnd} />
            <Circle cx="39.5" cy="18" r="3" fill={currentTheme.blobEnd} />
            <Path
              d="M 41 11.5 C 43 10 46 10 48.5 12"
              stroke={currentTheme.blobStart}
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
              opacity={0.85}
            />
            <Path
              d="M 44.5 9 v 4 M 48 10.5 v 4"
              stroke={currentTheme.blobStart}
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity={0.55}
            />
            <Circle cx="41" cy="12.5" r="2" fill="#FFFFFF" opacity={0.7} />
          </Svg>
        </AnimatedView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  waveArm: {
    position: 'absolute',
  },
  animatedContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    overflow: 'visible',
  },
});

export default Sola;
