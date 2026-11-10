import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuroraBackground } from '../../components/AuroraBackground';
import { BrandMark } from '../../components/BrandMark';
import { GlassCard } from '../../components/GlassCard';
import { GradientButton } from '../../components/GradientButton';
import { Sola, SolaMood } from '../../components/Sola';
import { Text } from '../../components/Text';
import { ThoughtBubble } from '../../components/ThoughtBubble';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  requestNotificationPermissions,
  getExpoPushTokenAsync,
} from '../../features/reminders/notificationService';

const HAS_LAUNCHED_KEY = 'solace_has_launched';

interface OnboardingSlide {
  id: string;
  headline: string;
  body: string;
  mood: SolaMood;
  waving?: boolean;
}

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'sola_companion',
    headline: 'Meet Sola, your companion',
    body: 'A thoughtful friend who listens without judging and helps you untangle your thoughts.',
    mood: 'happy',
    waving: true,
  },
  {
    id: 'daily_checkin',
    headline: 'Check in with your feelings',
    body: 'Take a quiet moment each day to name your emotions and uncover meaningful patterns.',
    mood: 'listening',
  },
  {
    id: 'calming_activities',
    headline: 'Small calming activities',
    body: 'Gentle breathing exercises, thoughtful reflections, and daily affirmations whenever you need them.',
    mood: 'calm',
  },
  {
    id: 'in_control_privacy',
    headline: 'You are always in control',
    body: 'Private and secure by design, with memory settings you can change anytime.',
    mood: 'thinking',
  },
];

interface ProgressDotProps {
  index: number;
  pageWidth: number;
  scrollX: SharedValue<number>;
}

const ProgressDot: React.FC<ProgressDotProps> = ({ index, pageWidth, scrollX }) => {
  const animatedDotStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];

    return {
      width: interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP),
      opacity: interpolate(scrollX.value, inputRange, [0.32, 1, 0.32], Extrapolation.CLAMP),
    };
  });

  return <Animated.View style={[styles.dot, animatedDotStyle]} />;
};

interface SlideItemProps {
  slide: OnboardingSlide;
  index: number;
  pageWidth: number;
  pageHeight: number;
  mascotSize: number;
  scrollX: SharedValue<number>;
}

const OnboardingSlideItem: React.FC<SlideItemProps> = ({
  slide,
  index,
  pageWidth,
  pageHeight,
  mascotSize,
  scrollX,
}) => {
  const bubbleAnimatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];

    return {
      opacity: interpolate(scrollX.value, inputRange, [0.35, 1, 0.35], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(scrollX.value, inputRange, [-16, 0, 16], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const mascotAnimatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];

    return {
      transform: [
        {
          translateX: interpolate(scrollX.value, inputRange, [42, 0, -42], Extrapolation.CLAMP),
        },
        {
          scale: interpolate(scrollX.value, inputRange, [0.94, 1, 0.94], Extrapolation.CLAMP),
        },
        {
          rotate: `${interpolate(scrollX.value, inputRange, [-3, 0, 3], Extrapolation.CLAMP)}deg`,
        },
      ],
    };
  });

  return (
    <View style={[styles.slide, { width: pageWidth, height: pageHeight || undefined }]}>
      <Animated.View style={[styles.slideBubble, bubbleAnimatedStyle]}>
        <ThoughtBubble minHeight={92}>
          <Text align="center" style={styles.headline}>
            {slide.headline}
          </Text>
        </ThoughtBubble>
      </Animated.View>

      <View style={styles.slideMascotArea}>
        <Animated.View style={mascotAnimatedStyle}>
          <Sola mood={slide.mood} size={mascotSize} showGlow waving={slide.waving} />
        </Animated.View>
      </View>
    </View>
  );
};

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);

  const pageWidth = width;
  const mascotSize = Math.max(140, Math.min(width * 0.5, height * 0.24, 210));

  const scrollX = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const [listHeight, setListHeight] = useState(0);

  const sheetOpacity = useSharedValue(0);
  const sheetY = useSharedValue(42);
  const bodyOpacity = useSharedValue(1);

  useEffect(() => {
    sheetOpacity.value = withDelay(
      180,
      withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) })
    );
    sheetY.value = withDelay(
      180,
      withTiming(0, { duration: 620, easing: Easing.out(Easing.cubic) })
    );
  }, [sheetOpacity, sheetY]);

  // Crossfade the sheet body whenever the active slide changes.
  useEffect(() => {
    if (activeIndex === displayedIndex) return;

    bodyOpacity.value = withTiming(
      0,
      { duration: 140, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (finished) {
          runOnJS(setDisplayedIndex)(activeIndex);
        }
      }
    );
  }, [activeIndex, displayedIndex, bodyOpacity]);

  useEffect(() => {
    if (displayedIndex === activeIndex) {
      bodyOpacity.value = withTiming(1, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [activeIndex, displayedIndex, bodyOpacity]);

  const handleFinishOnboarding = useCallback(
    async (targetRoute: '/(auth)/register' | '/(auth)/login') => {
      try {
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined') {
            localStorage.setItem(HAS_LAUNCHED_KEY, 'true');
          }
        } else {
          await SecureStore.setItemAsync(HAS_LAUNCHED_KEY, 'true');
        }

        // Ask for notification permission after the onboarding explanation.
        await requestNotificationPermissions();
        const token = await getExpoPushTokenAsync().catch(() => null);
        if (token) {
          await SecureStore.setItemAsync('solace_push_token', token).catch(() => {});
        }
      } catch {
        // Non-blocking fallback
      }

      router.replace(targetRoute);
    },
    [router]
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollX.value = event.nativeEvent.contentOffset.x;
    },
    [scrollX]
  );

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const newIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
        Haptics.selectionAsync().catch(() => {});
      }
    },
    [activeIndex, pageWidth]
  );

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const finalIndex = ONBOARDING_SLIDES.length - 1;
    flatListRef.current?.scrollToOffset({ offset: finalIndex * pageWidth, animated: true });
    setActiveIndex(finalIndex);
  }, [pageWidth]);

  const handleNext = useCallback(() => {
    if (activeIndex < ONBOARDING_SLIDES.length - 1) {
      const nextIndex = activeIndex + 1;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      flatListRef.current?.scrollToOffset({ offset: nextIndex * pageWidth, animated: true });
      setActiveIndex(nextIndex);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      void handleFinishOnboarding('/(auth)/register');
    }
  }, [activeIndex, handleFinishOnboarding, pageWidth]);

  const handleLogin = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    void handleFinishOnboarding('/(auth)/login');
  }, [handleFinishOnboarding]);

  const isFinalScreen = activeIndex === ONBOARDING_SLIDES.length - 1;
  const displayedSlide = ONBOARDING_SLIDES[displayedIndex];

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetY.value }],
  }));

  const bodyAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bodyOpacity.value,
  }));

  return (
    <View style={styles.root}>
      <AuroraBackground />

      <View
        style={[
          styles.safeArea,
          { paddingTop: insets.top + spacing.xs, paddingBottom: insets.bottom + spacing.sm },
        ]}
      >
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <BrandMark size={28} />
            <Text style={styles.brandWord}>Solace</Text>
          </View>

          {!isFinalScreen ? (
            <Pressable
              onPress={handleSkip}
              hitSlop={12}
              style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
            >
              <Text variant="bodyMedium" color={colors.textSecondary}>
                Skip
              </Text>
            </Pressable>
          ) : (
            <View style={styles.skipPlaceholder} />
          )}
        </View>

        <FlatList
          ref={flatListRef}
          data={ONBOARDING_SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          onLayout={(event) => setListHeight(event.nativeEvent.layout.height)}
          renderItem={({ item, index }) => (
            <OnboardingSlideItem
              slide={item}
              index={index}
              pageWidth={pageWidth}
              pageHeight={listHeight}
              mascotSize={mascotSize}
              scrollX={scrollX}
            />
          )}
        />

        <Animated.View style={[styles.sheetWrap, sheetAnimatedStyle]}>
          <GlassCard variant="frosted" radius={32} style={styles.sheet} blurIntensity={40}>
            <View style={styles.dotsRow}>
              {ONBOARDING_SLIDES.map((slide, index) => (
                <ProgressDot key={slide.id} index={index} pageWidth={pageWidth} scrollX={scrollX} />
              ))}
            </View>

            <View style={styles.bodyWrap}>
              <Animated.View style={bodyAnimatedStyle}>
                <Text
                  variant="body"
                  color={colors.textSecondary}
                  align="center"
                  style={styles.bodyText}
                >
                  {displayedSlide.body}
                </Text>
              </Animated.View>
            </View>

            <GradientButton
              title={isFinalScreen ? 'Get Started' : 'Next'}
              onPress={handleNext}
              accessibilityLabel={isFinalScreen ? 'Get started with Solace' : 'Next slide'}
            />

            {isFinalScreen && (
              <Pressable
                onPress={handleLogin}
                accessibilityRole="link"
                accessibilityLabel="Already have an account? Log in"
                style={({ pressed }) => [styles.loginLink, pressed && styles.pressed]}
              >
                <Text variant="body" color={colors.textSecondary}>
                  Already have an account?{' '}
                </Text>
                <Text
                  variant="bodyMedium"
                  color={colors.primaryDark}
                  style={styles.loginLinkStrong}
                >
                  Log in
                </Text>
              </Pressable>
            )}
          </GlassCard>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    height: 48,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandWord: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    letterSpacing: -0.3,
    color: colors.text,
  },
  skipButton: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipPlaceholder: {
    width: 44,
  },
  pressed: {
    opacity: 0.6,
  },
  slide: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  slideBubble: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
  headline: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: -0.2,
    color: colors.text,
  },
  slideMascotArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.sm,
  },
  sheetWrap: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  sheet: {
    padding: 22,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 12,
    gap: 6,
    marginBottom: spacing.md,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  bodyWrap: {
    minHeight: 48,
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 21,
  },
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  loginLinkStrong: {
    fontFamily: 'Nunito_700Bold',
    textDecorationLine: 'underline',
  },
});
