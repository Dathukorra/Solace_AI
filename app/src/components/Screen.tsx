import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ViewStyle,
  StyleProp,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets, Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

export interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  /** Custom gradient colors or defaults to the pastel lavender/blush canvas */
  gradientColors?: readonly [string, string, ...string[]];
  /** Quick helper to use mood 1-5 gradient */
  moodGradient?: 1 | 2 | 3 | 4 | 5;
  /** Safe area edges to apply (default: ['top', 'bottom', 'left', 'right']) */
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  statusBarStyle?: 'dark' | 'light' | 'auto';
  keyboardAvoiding?: boolean;
  showsVerticalScrollIndicator?: boolean;
  /** Disable the two drifting background blobs when a screen has its own atmosphere */
  showBlobs?: boolean;
}

const AnimatedView = Animated.createAnimatedComponent(View);

interface BlobProps {
  size: number;
  color: string;
  opacity: number;
  style?: StyleProp<ViewStyle>;
  animatedStyle: any;
  gradientId: string;
}

const Blob: React.FC<BlobProps> = ({ size, color, opacity, style, animatedStyle, gradientId }) => (
  <AnimatedView
    pointerEvents="none"
    style={[{ position: 'absolute', width: size, height: size, opacity }, style, animatedStyle]}
  >
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={gradientId} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0%" stopColor={color} stopOpacity="0.82" />
          <Stop offset="46%" stopColor={color} stopOpacity="0.38" />
          <Stop offset="78%" stopColor={color} stopOpacity="0.1" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill={`url(#${gradientId})`} />
    </Svg>
  </AnimatedView>
);

export const Screen: React.FC<ScreenProps> = ({
  children,
  scrollable = false,
  gradientColors,
  moodGradient,
  edges = ['top', 'bottom', 'left', 'right'],
  style,
  contentContainerStyle,
  statusBarStyle = 'dark',
  keyboardAvoiding = Platform.OS === 'ios',
  showsVerticalScrollIndicator = false,
  showBlobs = true,
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const driftOne = useSharedValue(0);
  const driftTwo = useSharedValue(0);

  useEffect(() => {
    if (!showBlobs || reduceMotion) return;
    driftOne.value = withRepeat(
      withTiming(1, { duration: 16000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    driftTwo.value = withRepeat(
      withTiming(1, { duration: 21000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [driftOne, driftTwo, reduceMotion, showBlobs]);

  const blobOneStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(driftOne.value, [0, 1], [-18, 30]) },
      { translateY: interpolate(driftOne.value, [0, 1], [0, 52]) },
      { scale: interpolate(driftOne.value, [0, 1], [0.96, 1.09]) },
    ],
  }));

  const blobTwoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(driftTwo.value, [0, 1], [10, -36]) },
      { translateY: interpolate(driftTwo.value, [0, 1], [0, -46]) },
      { scale: interpolate(driftTwo.value, [0, 1], [1.08, 0.94]) },
    ],
  }));

  const activeGradient =
    gradientColors ??
    (moodGradient ? colors.moodGradients[moodGradient] : colors.backgroundGradients.screen);

  const safePadding: ViewStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  const content = scrollable ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.staticContent, contentContainerStyle]}>{children}</View>
  );

  const blobSize = Math.max(width * 1.15, 430);

  return (
    <LinearGradient
      colors={activeGradient as unknown as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.38, y: 1 }}
      style={[styles.gradient, style]}
    >
      <StatusBar style={statusBarStyle} />
      {showBlobs && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Blob
            gradientId="screenBlobLavender"
            size={blobSize}
            color={colors.secondary}
            opacity={0.72}
            style={{ top: -blobSize * 0.38, left: -blobSize * 0.34 }}
            animatedStyle={blobOneStyle}
          />
          <Blob
            gradientId="screenBlobBlush"
            size={blobSize * 0.9}
            color={colors.accent}
            opacity={0.42}
            style={{
              bottom: -blobSize * 0.34,
              right: -blobSize * 0.3,
            }}
            animatedStyle={blobTwoStyle}
          />
        </View>
      )}
      <View style={[styles.safeArea, safePadding]}>
        {keyboardAvoiding ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.flex}
          >
            {content}
          </KeyboardAvoidingView>
        ) : (
          content
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  staticContent: {
    flex: 1,
  },
});
