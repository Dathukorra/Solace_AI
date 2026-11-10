import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  FadeIn,
  FadeInDown,
  cancelAnimation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Sola } from '../components/Sola';
import { activityService } from '../features/activities/activityService';
import { homeService } from '../features/home/homeService';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

// ─── Breathing Pattern Definitions ───────────────────────────────────────────

export type BreathingPatternId = 'box' | '478' | 'calm';

interface BreathingPhase {
  name: 'Breathe in' | 'Hold' | 'Breathe out';
  durationSec: number;
  targetScale: number; // 0 = fully contracted, 1 = fully expanded
  haptic: 'impact' | 'selection';
}

interface BreathingPattern {
  id: BreathingPatternId;
  name: string;
  subtitle: string;
  phases: BreathingPhase[];
  cycleTotalSec: number;
}

const BREATHING_PATTERNS: BreathingPattern[] = [
  {
    id: 'box',
    name: 'Box Breathing',
    subtitle: '4-4-4-4 reset stress & sharpen focus',
    cycleTotalSec: 16,
    phases: [
      { name: 'Breathe in', durationSec: 4, targetScale: 1, haptic: 'impact' },
      { name: 'Hold', durationSec: 4, targetScale: 1, haptic: 'selection' },
      { name: 'Breathe out', durationSec: 4, targetScale: 0.25, haptic: 'impact' },
      { name: 'Hold', durationSec: 4, targetScale: 0.25, haptic: 'selection' },
    ],
  },
  {
    id: '478',
    name: '4-7-8 Relax',
    subtitle: 'Deep nervous system tranquility & wind down',
    cycleTotalSec: 19,
    phases: [
      { name: 'Breathe in', durationSec: 4, targetScale: 1, haptic: 'impact' },
      { name: 'Hold', durationSec: 7, targetScale: 1, haptic: 'selection' },
      { name: 'Breathe out', durationSec: 8, targetScale: 0.25, haptic: 'impact' },
    ],
  },
  {
    id: 'calm',
    name: 'Calm 4-6',
    subtitle: 'Lengthened exhale to soothe anxious thoughts',
    cycleTotalSec: 10,
    phases: [
      { name: 'Breathe in', durationSec: 4, targetScale: 1, haptic: 'impact' },
      { name: 'Breathe out', durationSec: 6, targetScale: 0.25, haptic: 'impact' },
    ],
  },
];

const DURATION_OPTIONS = [
  { label: '1 min', minutes: 1, seconds: 60 },
  { label: '3 min', minutes: 3, seconds: 180 },
  { label: '5 min', minutes: 5, seconds: 300 },
];

const MOOD_AFTER_CHOICES = [
  { mood: 5, emoji: '😊', label: 'Lighter' },
  { mood: 4, emoji: '😌', label: 'Calmer' },
  { mood: 3, emoji: '😐', label: 'Centered' },
  { mood: 2, emoji: '🥱', label: 'Sleepy' },
];

export default function GuidedBreathingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  // Configuration state
  const [selectedPattern, setSelectedPattern] = useState<BreathingPattern>(BREATHING_PATTERNS[0]);
  const [selectedDuration, setSelectedDuration] = useState<number>(60); // in seconds
  const [sessionActive, setSessionActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Runtime state
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [phaseSecondsRemaining, setPhaseSecondsRemaining] = useState<number>(
    BREATHING_PATTERNS[0].phases[0].durationSec
  );
  const [moodAfterSelected, setMoodAfterSelected] = useState<number | null>(null);

  // Animation values
  const circleScale = useSharedValue(0.25);
  const rippleOpacity = useSharedValue(0.4);
  const holdPulse = useSharedValue(0);
  const ambientPulse = useSharedValue(0);

  // Mutable timer values keep ticking accurate without restarting the interval.
  const sessionRemainingRef = useRef(selectedDuration);
  const phaseRemainingRef = useRef(BREATHING_PATTERNS[0].phases[0].durationSec);
  const phaseIndexRef = useRef(0);
  const hasFinishedRef = useRef(false);

  const currentPhase = selectedPattern.phases[currentPhaseIndex];

  // ─── Phase Animation & Haptics Transition ──────────────────────────────────

  const runPhaseAnimation = useCallback(
    (phase: BreathingPhase, durationMs = phase.durationSec * 1000, playHaptic = true) => {
      // Trigger subtle haptic pulse on phase change
      if (playHaptic) {
        if (phase.haptic === 'impact') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        } else {
          Haptics.selectionAsync().catch(() => {});
        }
      }

      // Smooth Reanimated circle scaling
      circleScale.value = withTiming(phase.targetScale, {
        duration: durationMs,
        easing: Easing.inOut(Easing.sin),
      });

      rippleOpacity.value = withTiming(phase.targetScale === 1 ? 0.8 : 0.35, {
        duration: durationMs,
        easing: Easing.inOut(Easing.sin),
      });

      // Keep the circle gently alive during hold phases instead of freezing.
      if (phase.name === 'Hold') {
        holdPulse.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          false
        );
      } else {
        cancelAnimation(holdPulse);
        holdPulse.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.quad) });
      }
    },
    [circleScale, rippleOpacity, holdPulse]
  );

  // Ambient halo pulse runs throughout the active session.
  useEffect(() => {
    if (!sessionActive || isPaused) {
      cancelAnimation(ambientPulse);
      return;
    }

    ambientPulse.value = 0;
    ambientPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    return () => cancelAnimation(ambientPulse);
  }, [sessionActive, isPaused, ambientPulse]);

  // ─── Session Lifecycle ─────────────────────────────────────────────────────

  const handleStartSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const firstPhase = selectedPattern.phases[0];

    sessionRemainingRef.current = selectedDuration;
    phaseRemainingRef.current = firstPhase.durationSec;
    phaseIndexRef.current = 0;
    hasFinishedRef.current = false;

    setSecondsRemaining(selectedDuration);
    setPhaseSecondsRemaining(firstPhase.durationSec);
    setCurrentPhaseIndex(0);
    setIsPaused(false);
    setIsCompleted(false);
    setSessionActive(true);

    cancelAnimation(circleScale);
    cancelAnimation(rippleOpacity);
    cancelAnimation(holdPulse);
    circleScale.value = 0.25;
    rippleOpacity.value = 0.35;
    holdPulse.value = 0;
    runPhaseAnimation(firstPhase);
  };

  const handleFinishSession = useCallback(async () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    cancelAnimation(circleScale);
    cancelAnimation(rippleOpacity);
    cancelAnimation(holdPulse);
    cancelAnimation(ambientPulse);

    setSessionActive(false);
    setIsPaused(false);
    setIsCompleted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const elapsedSec = Math.max(
      1,
      Math.min(selectedDuration, selectedDuration - sessionRemainingRef.current)
    );

    // Save completed exercise to backend
    try {
      await activityService.postActivity({
        type: 'BREATHING',
        durationSec: elapsedSec,
      });
    } catch {
      // Non-blocking fallback
    }
  }, [selectedDuration, circleScale, rippleOpacity, holdPulse, ambientPulse]);

  // Single synchronized one-second clock drives both the session and phase timers.
  useEffect(() => {
    if (!sessionActive || isPaused || isCompleted) return;

    const interval = setInterval(() => {
      if (hasFinishedRef.current) return;

      const nextSessionSeconds = Math.max(0, sessionRemainingRef.current - 1);
      sessionRemainingRef.current = nextSessionSeconds;
      setSecondsRemaining(nextSessionSeconds);

      if (nextSessionSeconds <= 0) {
        void handleFinishSession();
        return;
      }

      const nextPhaseSeconds = phaseRemainingRef.current - 1;
      if (nextPhaseSeconds <= 0) {
        const nextIndex = (phaseIndexRef.current + 1) % selectedPattern.phases.length;
        const nextPhase = selectedPattern.phases[nextIndex];

        phaseIndexRef.current = nextIndex;
        phaseRemainingRef.current = nextPhase.durationSec;
        setCurrentPhaseIndex(nextIndex);
        setPhaseSecondsRemaining(nextPhase.durationSec);
        runPhaseAnimation(nextPhase);
      } else {
        phaseRemainingRef.current = nextPhaseSeconds;
        setPhaseSecondsRemaining(nextPhaseSeconds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    sessionActive,
    isPaused,
    isCompleted,
    selectedPattern,
    runPhaseAnimation,
    handleFinishSession,
  ]);

  const handleTogglePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (!isPaused) {
      cancelAnimation(circleScale);
      cancelAnimation(rippleOpacity);
      cancelAnimation(holdPulse);
      setIsPaused(true);
      return;
    }

    const phase = selectedPattern.phases[phaseIndexRef.current];
    runPhaseAnimation(phase, Math.max(1, phaseRemainingRef.current) * 1000, false);
    setIsPaused(false);
  };

  const handleEndEarly = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Alert.alert('End Breathing Session?', 'Would you like to finish your session now?', [
      { text: 'Keep Breathing', style: 'cancel' },
      {
        text: 'Finish Now',
        style: 'default',
        onPress: () => void handleFinishSession(),
      },
    ]);
  };

  const handleMoodAfterSelect = async (moodLvl: number) => {
    Haptics.selectionAsync().catch(() => {});
    setMoodAfterSelected(moodLvl);
    try {
      await homeService.postMoodCheckin({
        mood: moodLvl,
        emotions: ['calm', 'grounded'],
        note: `Completed ${selectedPattern.name} breathing exercise.`,
      });
    } catch {
      // ignore
    }
  };

  const handleDoneReturn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (returnTo === 'chat') {
      router.replace({
        pathname: '/(tabs)/chat',
        params: { activityCompleted: `${selectedPattern.name} breathing` },
      });
    } else {
      router.replace('/(tabs)/activities');
    }
  };

  // ─── Format Countdown MM:SS ────────────────────────────────────────────────

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Animated styles
  const circleAnimatedStyle = useAnimatedStyle(() => {
    const baseScale = interpolate(circleScale.value, [0, 1], [0.65, 1.28]);
    const holdExpansion = interpolate(holdPulse.value, [0, 1], [0, 0.022]);
    return {
      transform: [{ scale: baseScale * (1 + holdExpansion) }],
    };
  });

  const auraAnimatedStyle = useAnimatedStyle(() => {
    const baseScale = interpolate(circleScale.value, [0, 1], [0.85, 1.48]);
    const holdExpansion = interpolate(holdPulse.value, [0, 1], [0, 0.035]);
    return {
      transform: [{ scale: baseScale * (1 + holdExpansion) }],
      opacity: Math.min(1, rippleOpacity.value + holdPulse.value * 0.08),
    };
  });

  const ambientAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ambientPulse.value, [0, 1], [0.9, 1.12]) }],
    opacity: interpolate(ambientPulse.value, [0, 1], [0.2, 0.55]),
  }));

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Gentle Shift Gradient Atmosphere */}
      <LinearGradient
        colors={['#E9D5F5', '#F6DDEB', '#FBD9E4', '#F3E3F7']}
        locations={[0, 0.35, 0.75, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ════════════════ VIEW 1: ACTIVE SESSION ════════════════ */}
      {sessionActive && (
        <Animated.View entering={FadeIn.duration(320)} style={styles.activeContainer}>
          {/* Top Bar with Pattern Name & Countdown */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.sessionTopBar}>
            <View>
              <Text variant="titleSm" style={styles.sessionPatternName}>
                {selectedPattern.name}
              </Text>
              <Text variant="captionSm" color={colors.textSecondary}>
                {selectedPattern.subtitle}
              </Text>
            </View>

            <View style={styles.countdownBadge}>
              <Text style={styles.timerIcon}>⏱️</Text>
              <Text variant="titleSm" style={styles.countdownText}>
                {formatCountdown(secondsRemaining)}
              </Text>
            </View>
          </Animated.View>

          {/* Central Guided Breathing Circle */}
          <View style={styles.circleCenterArea}>
            {/* Soft Breathing Glow Aura */}
            <Animated.View style={[styles.auraCircle, auraAnimatedStyle]} />
            <Animated.View
              testID="breathing-aura-ring"
              style={[styles.auraRing, ambientAnimatedStyle]}
            />

            {/* Main Guided Scale Circle */}
            <Animated.View
              testID="breathing-circle"
              style={[styles.mainCircle, circleAnimatedStyle]}
            >
              <LinearGradient
                colors={['#A63DE8', '#8B5CF6', '#7426B4']}
                start={{ x: 0.1, y: 0.1 }}
                end={{ x: 0.9, y: 0.9 }}
                style={StyleSheet.absoluteFillObject}
              />

              {/* Text Cues: Breathe in, Hold, Breathe out */}
              <Animated.View
                key={`phase-${selectedPattern.id}-${currentPhaseIndex}`}
                entering={FadeInDown.duration(320)}
                style={styles.circleContent}
              >
                <Text variant="title" style={styles.phaseNameText}>
                  {currentPhase.name}
                </Text>
                <Text variant="captionSm" style={styles.phaseDurationText}>
                  {phaseSecondsRemaining}s
                </Text>
              </Animated.View>
            </Animated.View>
          </View>

          {/* Session Bottom Controls */}
          <Animated.View entering={FadeInDown.delay(120).duration(380)} style={styles.controlsRow}>
            <Button
              title={isPaused ? 'Resume' : 'Pause'}
              variant="outline"
              size="lg"
              style={styles.controlButton}
              onPress={handleTogglePause}
            />
            <Button
              title="End Session"
              variant="ghost"
              size="lg"
              style={styles.controlButton}
              onPress={handleEndEarly}
            />
          </Animated.View>
        </Animated.View>
      )}

      {/* ════════════════ VIEW 2: SETUP SCREEN ════════════════ */}
      {!sessionActive && !isCompleted && (
        <Animated.View entering={FadeIn.duration(320)} style={styles.setupContainer}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.setupHeader}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.backArrow}>←</Text>
            </Pressable>
            <Text variant="display" style={styles.screenHeading}>
              Guided Breathing
            </Text>
            <Text variant="body" color={colors.textSecondary} style={styles.screenSubtitle}>
              Reset your heart rate, anchor your thoughts, and find calm in rhythm.
            </Text>
          </Animated.View>

          {/* Sola Calm Mascot Preview */}
          <Animated.View entering={FadeIn.delay(80).duration(450)} style={styles.mascotPreviewBox}>
            <Sola mood="calm" size={110} showGlow={true} />
          </Animated.View>

          {/* Pattern Selector */}
          <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.sectionBlock}>
            <Text variant="caption" color={colors.textSecondary} style={styles.sectionEyebrow}>
              CHOOSE A PATTERN
            </Text>
            <View style={styles.patternGrid}>
              {BREATHING_PATTERNS.map((p) => {
                const isSelected = selectedPattern.id === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setSelectedPattern(p);
                    }}
                    style={[styles.patternCard, isSelected && styles.patternCardSelected]}
                    accessibilityRole="button"
                    accessibilityLabel={p.name}
                  >
                    <View style={styles.patternCardHeader}>
                      <Text
                        variant="titleSm"
                        style={isSelected ? styles.selectedText : styles.normalText}
                      >
                        {p.name}
                      </Text>
                      {isSelected && (
                        <Animated.View entering={FadeIn.duration(220)}>
                          <Text style={styles.checkmarkIcon}>✓</Text>
                        </Animated.View>
                      )}
                    </View>
                    <Text
                      variant="caption"
                      color={colors.textSecondary}
                      style={styles.patternSubtitle}
                    >
                      {p.subtitle}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          {/* Duration Selector */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.sectionBlock}>
            <Text variant="caption" color={colors.textSecondary} style={styles.sectionEyebrow}>
              DURATION
            </Text>
            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map((d) => {
                const isSelected = selectedDuration === d.seconds;
                return (
                  <Pressable
                    key={d.seconds}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setSelectedDuration(d.seconds);
                    }}
                    style={[styles.durationChip, isSelected && styles.durationChipSelected]}
                    accessibilityRole="button"
                    accessibilityLabel={d.label}
                  >
                    <Text
                      variant="bodyMedium"
                      style={isSelected ? styles.selectedDurationText : styles.normalDurationText}
                    >
                      {d.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          {/* Begin Session Action */}
          <Animated.View
            entering={FadeInDown.delay(280).duration(400)}
            style={styles.setupActionWrapper}
          >
            <Button
              title="Begin Breathing"
              variant="primary"
              size="lg"
              style={styles.fullWidthButton}
              onPress={handleStartSession}
            />
          </Animated.View>
        </Animated.View>
      )}

      {/* ════════════════ VIEW 3: COMPLETION SCREEN ════════════════ */}
      {isCompleted && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.completedContainer}>
          <Animated.View entering={FadeInDown.duration(450)} style={styles.completionCenter}>
            <Sola mood="happy" size={130} showGlow={true} />
            <Text variant="display" style={styles.youDidItTitle}>
              You did it! 🌿
            </Text>
            <Text variant="body" color={colors.textSecondary} style={styles.completedSubtitle}>
              You gifted yourself a mindful space to pause, breathe, and center your thoughts.
            </Text>
          </Animated.View>

          {/* Mood After Quick Tap */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(350)}
            style={styles.moodAfterCardWrapper}
          >
            <Card variant="frosted" style={styles.moodAfterCard}>
              <Text variant="titleSm" style={styles.moodAfterHeading}>
                How does your body feel right now?
              </Text>
              <Text variant="caption" color={colors.textSecondary} style={styles.moodAfterSub}>
                Quick tap to log how you feel after breathing:
              </Text>

              <View style={styles.moodAfterRow}>
                {MOOD_AFTER_CHOICES.map((item) => {
                  const isSelected = moodAfterSelected === item.mood;
                  return (
                    <Pressable
                      key={item.mood}
                      onPress={() => handleMoodAfterSelect(item.mood)}
                      style={[styles.moodAfterBtn, isSelected && styles.moodAfterBtnSelected]}
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                    >
                      <Text style={styles.moodAfterEmoji}>{item.emoji}</Text>
                      <Text
                        variant="captionSm"
                        color={isSelected ? colors.primaryDark : colors.textSecondary}
                        style={isSelected && styles.selectedMoodText}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(320).duration(380)}
            style={styles.completionActions}
          >
            <Button
              title={returnTo === 'chat' ? 'Return to Sola Chat' : 'Complete & Return'}
              variant="primary"
              size="lg"
              style={styles.fullWidthButton}
              onPress={handleDoneReturn}
            />
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  setupContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  setupHeader: {
    paddingTop: spacing.xs,
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 26,
    color: colors.text,
  },
  screenHeading: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 28,
    color: colors.text,
    marginTop: 2,
  },
  screenSubtitle: {
    marginTop: 4,
    lineHeight: 20,
  },
  mascotPreviewBox: {
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  sectionBlock: {
    gap: spacing.xs,
  },
  sectionEyebrow: {
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xs,
  },
  patternGrid: {
    gap: spacing.xs,
  },
  patternCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    borderRadius: 24,
    padding: spacing.md,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
  },
  patternCardSelected: {
    backgroundColor: 'rgba(243, 232, 251, 0.78)',
    borderColor: colors.primary,
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  patternCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  normalText: {
    color: colors.text,
    fontFamily: 'Nunito_700Bold',
  },
  selectedText: {
    color: colors.primaryDark,
    fontFamily: 'Nunito_800ExtraBold',
  },
  checkmarkIcon: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  patternSubtitle: {
    marginTop: 2,
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  durationChip: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
  },
  durationChipSelected: {
    backgroundColor: 'rgba(243, 232, 251, 0.9)',
    borderColor: colors.primary,
  },
  normalDurationText: {
    color: colors.textSecondary,
  },
  selectedDurationText: {
    color: colors.primaryDark,
    fontFamily: 'Nunito_800ExtraBold',
  },
  setupActionWrapper: {
    marginTop: spacing.sm,
  },
  fullWidthButton: {
    width: '100%',
  },
  activeContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  sessionTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  sessionPatternName: {
    fontFamily: 'Nunito_800ExtraBold',
    color: colors.text,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
  },
  timerIcon: {
    fontSize: 14,
  },
  countdownText: {
    fontFamily: 'Nunito_800ExtraBold',
    color: colors.text,
  },
  circleCenterArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraCircle: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(199, 155, 232, 0.38)',
  },
  auraRing: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1.5,
    borderColor: 'rgba(166, 61, 232, 0.32)',
  },
  mainCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 34,
    elevation: 10,
  },
  circleContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseNameText: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    textAlign: 'center',
  },
  phaseDurationText: {
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  controlButton: {
    flex: 1,
  },
  completedContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  completionCenter: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  youDidItTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 32,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  completedSubtitle: {
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  moodAfterCardWrapper: {
    width: '100%',
  },
  moodAfterCard: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  moodAfterHeading: {
    fontFamily: 'Nunito_700Bold',
    color: colors.text,
    textAlign: 'center',
  },
  moodAfterSub: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  moodAfterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  moodAfterBtn: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    borderWidth: 1.5,
    borderColor: colors.glassBorderSoft,
    minWidth: 64,
  },
  moodAfterBtnSelected: {
    backgroundColor: 'rgba(243, 232, 251, 0.9)',
    borderColor: colors.primary,
  },
  moodAfterEmoji: {
    fontSize: 26,
    marginBottom: 2,
  },
  selectedMoodText: {
    fontFamily: 'Nunito_700Bold',
  },
  completionActions: {
    paddingBottom: spacing.sm,
  },
});
