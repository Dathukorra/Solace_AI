import React, { useCallback, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuroraBackground } from '../components/AuroraBackground';
import { BrandMark } from '../components/BrandMark';
import { GlassCard } from '../components/GlassCard';
import { GradientButton } from '../components/GradientButton';
import { Mascot } from '../components/Mascot';
import { Text } from '../components/Text';
import { ThoughtBubble } from '../components/ThoughtBubble';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { getAuthToken } from '../api/client';
import {
  consumePendingNotification,
  handleNotificationNavigation,
} from '../features/reminders/notificationService';

const HAS_LAUNCHED_KEY = 'solace_has_launched';
const WELCOME_THOUGHT = 'Daily mood insights for a better you';

async function hasLaunchedBefore(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' && localStorage.getItem(HAS_LAUNCHED_KEY) === 'true';
    }
    return (await SecureStore.getItemAsync(HAS_LAUNCHED_KEY)) === 'true';
  } catch {
    return false;
  }
}

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const mascotSize = Math.max(150, Math.min(width * 0.55, height * 0.27, 220));

  // Entrance choreography
  const bubbleOpacity = useSharedValue(0);
  const bubbleY = useSharedValue(-10);
  const mascotOpacity = useSharedValue(0);
  const mascotScale = useSharedValue(0.72);
  const sheetOpacity = useSharedValue(0);
  const sheetY = useSharedValue(52);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    bubbleOpacity.value = withDelay(
      140,
      withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) })
    );
    bubbleY.value = withDelay(
      140,
      withTiming(0, { duration: 720, easing: Easing.out(Easing.cubic) })
    );

    mascotOpacity.value = withDelay(280, withTiming(1, { duration: 500 }));
    mascotScale.value = withDelay(280, withSpring(1, { damping: 12, stiffness: 120, mass: 0.9 }));

    sheetOpacity.value = withDelay(
      440,
      withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) })
    );
    sheetY.value = withDelay(
      440,
      withTiming(0, { duration: 650, easing: Easing.out(Easing.cubic) })
    );
  }, [bubbleOpacity, bubbleY, mascotOpacity, mascotScale, sheetOpacity, sheetY]);

  // Signed-in users only pause on the welcome screen long enough to see Sola
  // wave, then continue into the app.
  useEffect(() => {
    let cancelled = false;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;

    const bootstrap = async () => {
      const token = await getAuthToken();
      if (!token || cancelled) return;

      exitTimer = setTimeout(() => {
        if (cancelled) return;
        containerOpacity.value = withTiming(0, {
          duration: 380,
          easing: Easing.out(Easing.quad),
        });
        exitTimer = setTimeout(() => {
          const pendingScreen = consumePendingNotification();
          if (pendingScreen) {
            handleNotificationNavigation(pendingScreen, router);
          } else {
            router.replace('/(tabs)');
          }
        }, 400);
      }, 1200);
    };

    void bootstrap();

    return () => {
      cancelled = true;
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, [containerOpacity, router]);

  const handleGetStarted = useCallback(async () => {
    const alreadyLaunched = await hasLaunchedBefore();
    router.push(alreadyLaunched ? '/(auth)/register' : '/(auth)/onboarding');
  }, [router]);

  const handleLogin = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/(auth)/login');
  }, [router]);

  const bubbleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [{ translateY: bubbleY.value }],
  }));

  const mascotAnimatedStyle = useAnimatedStyle(() => ({
    opacity: mascotOpacity.value,
    transform: [{ scale: mascotScale.value }],
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetY.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.root, containerAnimatedStyle]}>
      <AuroraBackground />

      <View
        style={[
          styles.safeArea,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.sm },
        ]}
      >
        <Animated.View style={[styles.bubbleWrap, bubbleAnimatedStyle]}>
          <ThoughtBubble minHeight={82}>
            <Text align="center" style={styles.thoughtText}>
              {WELCOME_THOUGHT}
            </Text>
          </ThoughtBubble>
        </Animated.View>

        <View style={styles.mascotArea}>
          <Animated.View style={mascotAnimatedStyle}>
            <Mascot pose="waving" size={mascotSize} />
          </Animated.View>
        </View>

        <Animated.View style={[styles.sheetWrap, sheetAnimatedStyle]}>
          <GlassCard variant="frosted" radius={32} style={styles.sheet} blurIntensity={40}>
            <View style={styles.logoRow}>
              <BrandMark size={44} />
              <Text style={styles.wordmark}>Solace</Text>
            </View>

            <Text style={styles.title}>Small steps for better mental health</Text>
            <Text variant="body" color={colors.textSecondary} style={styles.subtext}>
              Your calm space to grow, one day at a time.
            </Text>

            <GradientButton
              title="Get Started"
              onPress={handleGetStarted}
              accessibilityLabel="Get started with Solace"
            />

            <Pressable
              onPress={handleLogin}
              accessibilityRole="link"
              accessibilityLabel="Already have an account? Log in"
              style={({ pressed }) => [styles.loginLink, pressed && styles.loginLinkPressed]}
            >
              <Text variant="body" color={colors.textSecondary}>
                Already have an account?{' '}
              </Text>
              <Text variant="bodyMedium" color={colors.primaryDark} style={styles.loginLinkStrong}>
                Log in
              </Text>
            </Pressable>
          </GlassCard>
        </Animated.View>
      </View>
    </Animated.View>
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
  bubbleWrap: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
  },
  thoughtText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 19,
    lineHeight: 26,
    letterSpacing: 0.1,
    color: colors.text,
  },
  mascotArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetWrap: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    padding: 22,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  wordmark: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: colors.text,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtext: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: spacing.lg,
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
  loginLinkPressed: {
    opacity: 0.6,
  },
  loginLinkStrong: {
    fontFamily: 'Nunito_700Bold',
    textDecorationLine: 'underline',
  },
});
