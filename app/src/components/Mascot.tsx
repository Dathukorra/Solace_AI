import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Image,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ImageSourcePropType,
  Text as RNText,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, palette } from '../theme/colors';
import { fonts } from '../theme/typography';

export type MascotPose = 'happy' | 'sad' | 'thinking' | 'waving' | 'sleepy';

export interface MascotProps {
  /** The current emotional or action pose */
  pose?: MascotPose;
  /** Width and height in points. Defaults to 120 */
  size?: number;
  /** Optional callback fired when the mascot is tapped */
  onPress?: () => void;
  /** Whether to show the reactive ground shadow. Defaults to true */
  showShadow?: boolean;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Test identifier */
  testID?: string;
}

const MASCOT_ASSETS: Record<MascotPose, ImageSourcePropType> = {
  happy: require('../../assets/mascot/happy.png'),
  sad: require('../../assets/mascot/sad.png'),
  thinking: require('../../assets/mascot/thinking.png'),
  waving: require('../../assets/mascot/waving.png'),
  sleepy: require('../../assets/mascot/sleepy.png'),
};

interface PoseFallbackConfig {
  emoji: string;
  colors: [string, string];
  label: string;
}

const FALLBACK_CONFIGS: Record<MascotPose, PoseFallbackConfig> = {
  happy: {
    emoji: '✨😊✨',
    colors: ['#FDE8ED', '#F6DDEB'],
    label: 'Happy',
  },
  sad: {
    emoji: '🥺💙',
    colors: ['#E9D9F5', '#E2E8F0'],
    label: 'Gentle',
  },
  thinking: {
    emoji: '💭🤔',
    colors: ['#F3E8FB', '#E9D5F5'],
    label: 'Thinking',
  },
  waving: {
    emoji: '👋✨',
    colors: ['#E6F9F0', '#FDE8ED'],
    label: 'Hello!',
  },
  sleepy: {
    emoji: '🌙😴',
    colors: ['#E0E7FF', '#EDE9FE'],
    label: 'Resting',
  },
};

export const Mascot: React.FC<MascotProps> = ({
  pose = 'happy',
  size = 120,
  onPress,
  showShadow = true,
  style,
  testID = 'sola-mascot-3d',
}) => {
  // --- 1. Cross-Fade State & Transitions ---
  const [currentPose, setCurrentPose] = useState<MascotPose>(pose);
  const [outgoingPose, setOutgoingPose] = useState<MascotPose | null>(null);
  const [imageErrors, setImageErrors] = useState<Partial<Record<MascotPose, boolean>>>({});
  const crossFadeProgress = useSharedValue(1);

  // Keep track of active pose transitions
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (pose !== currentPose) {
      setOutgoingPose(currentPose);
      setCurrentPose(pose);
      crossFadeProgress.value = 0;
      crossFadeProgress.value = withTiming(
        1,
        {
          duration: 320,
          easing: Easing.inOut(Easing.ease),
        },
        (finished) => {
          if (finished) {
            runOnJS(setOutgoingPose)(null);
          }
        }
      );
    }
  }, [pose, currentPose, crossFadeProgress]);

  // --- 2. Idle Animation: Organic Floating (Ascending & Descending) ---
  const floatY = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, {
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(3, {
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      true
    );
  }, [floatY]);

  // --- 3. Tap Reaction: Cartoon Squash, Stretch & Spring Bounce ---
  const tapScaleX = useSharedValue(1);
  const tapScaleY = useSharedValue(1);
  const tapBounceY = useSharedValue(0);

  const handlePress = () => {
    // Soft haptic pulse
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // Squash wide & compress into ground
    tapScaleX.value = withSequence(
      withTiming(1.18, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(0.88, { duration: 130, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 11, stiffness: 220 })
    );

    tapScaleY.value = withSequence(
      withTiming(0.82, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(1.16, { duration: 130, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 11, stiffness: 220 })
    );

    // Spring jump upwards then settle
    tapBounceY.value = withSequence(
      withTiming(3, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(-16, { duration: 140, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 10, stiffness: 180 })
    );

    onPress?.();
  };

  // --- 4. Animated Styles ---
  const mascotAnimatedStyle = useAnimatedStyle(() => {
    const totalY = floatY.value + tapBounceY.value;
    return {
      transform: [{ translateY: totalY }, { scaleX: tapScaleX.value }, { scaleY: tapScaleY.value }],
    };
  });

  // Soft ground shadow scales OPPOSITE to mascot float
  const shadowAnimatedStyle = useAnimatedStyle(() => {
    const totalY = floatY.value + tapBounceY.value;
    // Higher up -> smaller & lighter shadow; Closer down -> wider & deeper shadow
    const scale = interpolate(totalY, [-20, 6], [0.72, 1.18], Extrapolation.CLAMP);
    const opacity = interpolate(totalY, [-20, 6], [0.12, 0.36], Extrapolation.CLAMP);

    return {
      transform: [{ scaleX: scale * (tapScaleX.value * 0.4 + 0.6) }, { scaleY: scale }],
      opacity,
    };
  });

  const incomingLayerStyle = useAnimatedStyle(() => {
    return {
      opacity: crossFadeProgress.value,
    };
  });

  const outgoingLayerStyle = useAnimatedStyle(() => {
    return {
      opacity: 1 - crossFadeProgress.value,
    };
  });

  // --- 5. Render Individual Pose Layer (With Placeholder Fallback) ---
  const renderPoseContent = (p: MascotPose) => {
    const hasError = imageErrors[p];
    const assetSource = MASCOT_ASSETS[p];

    if (!assetSource || hasError) {
      // Fallback placeholder with soft pastel gradient and emotional cue
      const config = FALLBACK_CONFIGS[p] || FALLBACK_CONFIGS.happy;
      return (
        <View
          style={[styles.placeholderCard, { width: size, height: size, borderRadius: size * 0.32 }]}
        >
          <LinearGradient
            colors={config.colors}
            style={[StyleSheet.absoluteFill, { borderRadius: size * 0.32 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <RNText style={[styles.placeholderEmoji, { fontSize: size * 0.36 }]}>
            {config.emoji}
          </RNText>
          <View style={styles.placeholderBadge}>
            <RNText style={styles.placeholderLabel}>{config.label}</RNText>
          </View>
        </View>
      );
    }

    return (
      <Image
        source={assetSource}
        style={{ width: size, height: size }}
        resizeMode="contain"
        onError={() => {
          setImageErrors((prev) => ({ ...prev, [p]: true }));
        }}
      />
    );
  };

  const shadowWidth = size * 0.64;
  const shadowHeight = Math.max(8, size * 0.12);

  return (
    <View style={[styles.root, style]} testID={testID}>
      {/* Tap reaction Pressable wrapper */}
      <Pressable
        onPress={handlePress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Sola mascot, ${pose} pose`}
        style={styles.pressable}
      >
        <Animated.View
          style={[styles.mascotContainer, mascotAnimatedStyle, { width: size, height: size }]}
        >
          {/* Outgoing Pose Layer (cross-fades out) */}
          {outgoingPose && (
            <Animated.View
              style={[StyleSheet.absoluteFill, outgoingLayerStyle, styles.layerCentered]}
            >
              {renderPoseContent(outgoingPose)}
            </Animated.View>
          )}

          {/* Current/Incoming Pose Layer (cross-fades in) */}
          <Animated.View
            style={[incomingLayerStyle, styles.layerCentered, { width: size, height: size }]}
          >
            {renderPoseContent(currentPose)}
          </Animated.View>
        </Animated.View>
      </Pressable>

      {/* Reactive Soft Ground Shadow (scales opposite to mascot float) */}
      {showShadow && (
        <Animated.View
          style={[
            styles.shadow,
            {
              width: shadowWidth,
              height: shadowHeight,
              borderRadius: shadowWidth / 2,
              marginTop: -shadowHeight * 0.3,
            },
            shadowAnimatedStyle,
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  layerCentered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    backgroundColor: 'rgba(26, 18, 43, 0.22)',
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 1,
  },
  placeholderCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  placeholderEmoji: {
    textAlign: 'center',
  },
  placeholderBadge: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  placeholderLabel: {
    fontFamily: fonts.body.bold,
    fontSize: 10,
    color: palette.violetDark,
    letterSpacing: 0.3,
  },
});
