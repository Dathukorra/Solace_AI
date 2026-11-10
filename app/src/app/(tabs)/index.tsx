import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView, Pressable, Share } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { HintDot } from '../../components/HintDot';
import { Mascot, MascotPose } from '../../components/Mascot';
import { Skeleton } from '../../components/Skeleton';
import { MoodCheckinModal } from '../../components/MoodCheckinModal';
import { useAuthStore } from '../../store/authStore';
import { useMoodStore } from '../../store/moodStore';
import { useAutoStartTour, useTourScroll, useTourTarget } from '../../features/tour';
import { useFeatureHint } from '../../features/onboarding/useFeatureHint';
import { GettingStartedCard } from '../../features/home/GettingStartedCard';
import {
  homeService,
  HomeDashboardResponse,
  MoodLogPayload,
} from '../../features/home/homeService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const MOOD_EMOJIS = [
  { level: 1, emoji: '😔', label: 'Rough' },
  { level: 2, emoji: '😕', label: 'Low' },
  { level: 3, emoji: '😐', label: 'Okay' },
  { level: 4, emoji: '🙂', label: 'Good' },
  { level: 5, emoji: '😊', label: 'Great' },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const params = useLocalSearchParams<{ openMoodCheckin?: string; focus?: string; t?: string }>();
  const isCheckinModalOpen = useMoodStore((s) => s.isCheckinModalOpen);
  const closeCheckinModal = useMoodStore((s) => s.closeCheckinModal);
  const targetInitialMoodFromStore = useMoodStore((s) => s.targetInitialMood);
  const scrollViewRef = useRef<ScrollView>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [targetInitialMood, setTargetInitialMood] = useState<number>(3);
  const [savedAffirmation, setSavedAffirmation] = useState(false);

  // Sync notification or external mood checkin triggers
  useEffect(() => {
    if (isCheckinModalOpen || params.openMoodCheckin === 'true') {
      setTargetInitialMood(targetInitialMoodFromStore || 3);
      setModalVisible(true);
    }
  }, [isCheckinModalOpen, params.openMoodCheckin, params.t, targetInitialMoodFromStore]);

  // Handle focus on Today's Affirmation card
  useEffect(() => {
    if (params.focus === 'affirmation') {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 220, animated: true });
        setSavedAffirmation(true);
        setTimeout(() => setSavedAffirmation(false), 3000);
      }, 350);
    }
  }, [params.focus, params.t]);

  // Affirmation subtle shimmer
  const shimmerValue = useSharedValue(0.4);
  useEffect(() => {
    shimmerValue.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [shimmerValue]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerValue.value,
  }));

  // Fetch Home Dashboard data
  const { data, isLoading, refetch, isRefetching } = useQuery<HomeDashboardResponse>({
    queryKey: ['homeDashboard'],
    queryFn: () => homeService.getHomeDashboard(),
  });

  // Refresh the checklist counts whenever Home is revisited. The first focus
  // is already covered by the initial query.
  const hasFocusedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedRef.current) {
        hasFocusedRef.current = true;
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ['homeDashboard'] });
    }, [queryClient])
  );

  // First-run tour targets. The mood faces only exist before today's check-in;
  // the tour skips that stop if it has already been completed.
  const moodFacesTarget = useTourTarget('home-mood-faces');
  const bellTarget = useTourTarget('home-reminders-bell');
  const bellHint = useFeatureHint('home-reminders-bell');
  const tourScrollProps = useTourScroll();
  useAutoStartTour({ enabled: !isLoading, delayMs: 600 });

  // Mood mutation
  const moodMutation = useMutation({
    mutationFn: (payload: MoodLogPayload) => homeService.postMoodCheckin(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['homeDashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['progress'] });
      void queryClient.invalidateQueries({ queryKey: ['moodHistory30d'] });
    },
  });

  const handleOpenMoodFace = (level: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setTargetInitialMood(level);
    setModalVisible(true);
  };

  const handleEditMood = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTargetInitialMood(data?.todayCheckin?.mood ?? 3);
    setModalVisible(true);
  };

  const handleSaveMood = async (checkinData: {
    mood: number;
    emotions: string[];
    note?: string;
  }) => {
    await moodMutation.mutateAsync({
      mood: checkinData.mood,
      emotions: checkinData.emotions,
      note: checkinData.note,
    });
  };

  const handleTalkToSola = (context: { mood: number; emotions: string[]; note?: string }) => {
    const moodNames: Record<number, string> = {
      1: 'rough',
      2: 'a bit low',
      3: 'okay',
      4: 'pretty good',
      5: 'great',
    };
    const moodText = moodNames[context.mood] || 'okay';
    const emotionsText =
      context.emotions.length > 0 ? `feeling ${context.emotions.join(', ')}` : '';
    const noteText = context.note ? ` Note: "${context.note}".` : '';
    const initialPrompt = `I just checked in with my mood as ${moodText}${emotionsText ? ` (${emotionsText})` : ''}.${noteText} Can we talk about it?`;

    router.push({
      pathname: '/(tabs)/chat',
      params: { initialPrompt },
    });
  };

  const handleShareAffirmation = async () => {
    const textToShare = data?.todayAffirmation?.personalized || data?.todayAffirmation?.base;
    if (!textToShare) return;

    Haptics.selectionAsync().catch(() => {});
    setSavedAffirmation(true);
    setTimeout(() => setSavedAffirmation(false), 2500);

    try {
      await Share.share({
        message: `"${textToShare}" — Solace Affirmation`,
      });
    } catch {
      // ignore
    }
  };

  const handleOpenSuggestion = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const sType = data?.suggestion?.type;
    if (sType === 'breathing') {
      router.push('/(tabs)/activities');
    } else if (sType === 'reflection') {
      router.push('/(tabs)/chat');
    } else {
      router.push('/(tabs)/activities');
    }
  };

  // Header dynamic gradient based on local hour
  const currentHour = new Date().getHours();
  const getHeaderGradient = (): readonly [string, string, ...string[]] => {
    if (currentHour < 12) {
      return ['#F3E8FB', '#F6DDEB', '#FDE8ED'];
    } else if (currentHour < 18) {
      return ['#F6ECFC', '#E9D5F5', '#FBD9E4'];
    } else {
      return ['#E9D5F5', '#F2E4F7', '#FBD9E4'];
    }
  };

  // Mascot reaction to today's mood
  const getMascotPose = (): MascotPose => {
    if (!data?.todayCheckin) return 'happy';
    const m = data.todayCheckin.mood;
    if (m >= 4) return 'happy';
    if (m === 3) return 'thinking';
    if (m === 2) return 'sleepy';
    return 'sad';
  };

  return (
    <Screen style={styles.rootScreen}>
      <ScrollView
        ref={scrollViewRef}
        {...tourScrollProps}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.sm }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              void refetch();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Dynamic Gradient Header with Personalized Greeting & Sola Mascot */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.headerWrapper}>
          <LinearGradient
            colors={getHeaderGradient()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerTextGroup}>
                <Text variant="display" style={styles.greetingTitle}>
                  {data?.greeting || `Welcome, ${user?.name || 'Friend'}`}
                </Text>
                <Text variant="body" color={colors.textSecondary} style={styles.greetingSubtitle}>
                  {data?.todayCheckinDone
                    ? "You've checked in today. Sola is keeping you grounded."
                    : 'Take a soft breath and listen to how you feel.'}
                </Text>
              </View>

              <View style={styles.headerRight}>
                <View
                  ref={bellTarget.ref}
                  onLayout={bellTarget.onLayout}
                  collapsable={false}
                  testID="home-reminders-bell"
                >
                  <Pressable
                    onPress={() => {
                      bellHint.dismiss();
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      router.push('/reminders');
                    }}
                    style={({ pressed }) => [styles.bellButton, pressed && styles.pressedFace]}
                    accessibilityRole="button"
                    accessibilityLabel="Gentle reminders"
                  >
                    <Text style={styles.bellButtonIcon}>🔔</Text>
                    <HintDot visible={bellHint.visible} style={styles.bellHint} />
                  </Pressable>
                </View>

                <View style={styles.solaMascotBox}>
                  <Mascot pose={getMascotPose()} size={66} />
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {data?.counts && <GettingStartedCard counts={data.counts} />}

        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <Skeleton height={140} borderRadius={24} style={styles.skeletonItem} />
            <Skeleton height={120} borderRadius={24} style={styles.skeletonItem} />
            <Skeleton height={130} borderRadius={24} style={styles.skeletonItem} />
            <Skeleton height={90} borderRadius={24} style={styles.skeletonItem} />
          </View>
        ) : (
          <>
            {/* 1. Daily Mood Check-in Card */}
            <Animated.View entering={FadeInDown.delay(100).duration(450)}>
              <Card variant="frosted" style={styles.moodCard}>
                <View style={styles.cardHeaderRow}>
                  <Text variant="caption" color={colors.textSecondary} style={styles.cardEyebrow}>
                    DAILY MOOD CHECK-IN
                  </Text>
                  {data?.todayCheckinDone && (
                    <Pressable
                      onPress={handleEditMood}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Edit check-in"
                    >
                      <Text variant="bodySm" color={colors.primaryDark} style={styles.editLink}>
                        Edit
                      </Text>
                    </Pressable>
                  )}
                </View>

                {data?.todayCheckinDone && data.todayCheckin ? (
                  <View style={styles.checkedInRow}>
                    <Text style={styles.todayEmoji}>
                      {MOOD_EMOJIS.find((m) => m.level === data.todayCheckin?.mood)?.emoji || '✨'}
                    </Text>
                    <View style={styles.checkedInDetails}>
                      <Text variant="title">
                        Feeling{' '}
                        {MOOD_EMOJIS.find((m) => m.level === data.todayCheckin?.mood)?.label}
                      </Text>
                      {data.todayCheckin.emotions.length > 0 && (
                        <Text variant="bodySm" color={colors.textSecondary}>
                          {data.todayCheckin.emotions.join(' · ')}
                        </Text>
                      )}
                      {data.todayCheckin.note && (
                        <Text variant="caption" color={colors.textMuted} numberOfLines={2}>
                          "{data.todayCheckin.note}"
                        </Text>
                      )}
                    </View>
                  </View>
                ) : (
                  <View
                    ref={moodFacesTarget.ref}
                    onLayout={moodFacesTarget.onLayout}
                    collapsable={false}
                    testID="home-mood-faces"
                    style={styles.moodFacesRow}
                  >
                    {MOOD_EMOJIS.map((item) => (
                      <Pressable
                        key={item.level}
                        onPress={() => handleOpenMoodFace(item.level)}
                        style={({ pressed }) => [styles.moodFaceBtn, pressed && styles.pressedFace]}
                        accessibilityRole="button"
                        accessibilityLabel={item.label}
                      >
                        <Text style={styles.faceEmoji}>{item.emoji}</Text>
                        <Text variant="caption" color={colors.textSecondary}>
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </Card>
            </Animated.View>

            {/* 2. Today's Affirmation Card (Tap to share/save, subtle shimmer) */}
            <Animated.View entering={FadeInDown.delay(180).duration(450)}>
              <Pressable onPress={handleShareAffirmation} accessibilityRole="button">
                <Card variant="surface" style={styles.affirmationCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text variant="caption" color={colors.primaryDark} style={styles.cardEyebrow}>
                      TODAY'S AFFIRMATION
                    </Text>
                    <Animated.View style={shimmerStyle}>
                      <Text style={styles.shimmerSparkle}>✨</Text>
                    </Animated.View>
                  </View>

                  <Text variant="title" style={styles.affirmationText}>
                    "
                    {data?.todayAffirmation?.personalized ||
                      data?.todayAffirmation?.base ||
                      'I honor my pace and give myself room to breathe.'}
                    "
                  </Text>

                  <View style={styles.affirmationActionRow}>
                    <Text variant="caption" color={colors.textSecondary}>
                      {savedAffirmation ? 'Copied & saved! ✨' : 'Tap to share or save'}
                    </Text>
                    <Text style={styles.shareIcon}>↗</Text>
                  </View>
                </Card>
              </Pressable>
            </Animated.View>

            {/* 3. 'Sola suggests' AI Recommendation Card */}
            <Animated.View entering={FadeInDown.delay(260).duration(450)}>
              <Card variant="softSage" style={styles.suggestionCard}>
                <View style={styles.suggestionHeader}>
                  <Text variant="caption" color={colors.primaryDark} style={styles.cardEyebrow}>
                    SOLA SUGGESTS
                  </Text>
                  <Text style={styles.suggestionTag}>AI Wellness</Text>
                </View>

                <Text variant="title" style={styles.suggestionTitle}>
                  {data?.suggestion?.title || 'Mindful Breathing Pause'}
                </Text>
                <Text variant="body" color={colors.textSecondary} style={styles.suggestionReason}>
                  {data?.suggestion?.reason ||
                    'Take two quiet minutes to align with your inner center.'}
                </Text>

                <Button
                  title={
                    data?.suggestion?.type === 'breathing'
                      ? 'Begin Breathing'
                      : data?.suggestion?.type === 'reflection'
                        ? 'Talk to Sola'
                        : 'Start Activity'
                  }
                  variant="primary"
                  size="md"
                  onPress={handleOpenSuggestion}
                  style={styles.suggestionButton}
                />
              </Card>
            </Animated.View>

            {/* 4. Quick Actions Row (Breathe, Reflect, Talk to Sola) */}
            <Animated.View entering={FadeInDown.delay(340).duration(450)}>
              <Text variant="caption" color={colors.textSecondary} style={styles.quickActionsLabel}>
                QUICK CALM ACTIONS
              </Text>
              <View style={styles.quickActionsGrid}>
                {/* Breathe */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    router.push('/(tabs)/activities');
                  }}
                  style={styles.actionPill}
                  accessibilityRole="button"
                  accessibilityLabel="Breathe"
                >
                  <Text style={styles.actionIcon}>🌬️</Text>
                  <Text variant="bodyMedium">Breathe</Text>
                </Pressable>

                {/* Reflect */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    router.push('/(tabs)/mood');
                  }}
                  style={styles.actionPill}
                  accessibilityRole="button"
                  accessibilityLabel="Reflect"
                >
                  <Text style={styles.actionIcon}>🪞</Text>
                  <Text variant="bodyMedium">Reflect</Text>
                </Pressable>

                {/* Talk to Sola */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    router.push('/(tabs)/chat');
                  }}
                  style={[styles.actionPill, styles.actionPillHighlight]}
                  accessibilityRole="button"
                  accessibilityLabel="Talk to Sola"
                >
                  <Text style={styles.actionIcon}>💬</Text>
                  <Text variant="bodyMedium">Talk to Sola</Text>
                </Pressable>
              </View>
            </Animated.View>

            {/* 5. Streak Card with Week Dots View */}
            <Animated.View entering={FadeInDown.delay(420).duration(450)}>
              <Card variant="frosted" style={styles.streakCard}>
                <View style={styles.streakTopRow}>
                  <View style={styles.streakNumberBox}>
                    <Text style={styles.flameIcon}>🔥</Text>
                    <View>
                      <Text variant="title" style={styles.streakCount}>
                        {data?.streak ?? 0} {data?.streak === 1 ? 'day' : 'days'}
                      </Text>
                      <Text variant="caption" color={colors.textSecondary}>
                        Current wellness streak
                      </Text>
                    </View>
                  </View>

                  {data?.nextReminder && (
                    <View style={styles.nextReminderBadge}>
                      <Text style={styles.bellIcon}>🔔</Text>
                      <Text variant="caption" color={colors.primaryDark}>
                        {data.nextReminder.formattedTime}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Week Dots Indicator */}
                <View style={styles.weekDotsContainer}>
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                    // Check if day matches today or recent streak days
                    const isFilled =
                      (data?.streak ?? 0) > 0 && idx <= (new Date().getDay() + 6) % 7;
                    return (
                      <View key={`${day}-${idx}`} style={styles.dayDotColumn}>
                        <View style={[styles.dayDot, isFilled && styles.dayDotFilled]} />
                        <Text variant="captionSm" color={colors.textMuted}>
                          {day}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            </Animated.View>
          </>
        )}

        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>

      {/* Interactive Mood Check-in Sheet */}
      <MoodCheckinModal
        visible={modalVisible}
        initialMood={targetInitialMood}
        initialEmotions={data?.todayCheckin?.emotions || []}
        initialNote={data?.todayCheckin?.note || ''}
        onClose={() => {
          setModalVisible(false);
          closeCheckinModal();
        }}
        onSubmit={handleSaveMood}
        onTalkToSola={handleTalkToSola}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rootScreen: {
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  headerWrapper: {
    borderRadius: 28,
    marginBottom: spacing.xs,
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 5,
  },
  headerGradient: {
    padding: spacing.lg,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  headerRight: {
    alignItems: 'center',
    gap: 2,
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1.5,
    borderColor: colors.glassBorderSoft,
  },
  bellButtonIcon: {
    fontSize: 16,
  },
  bellHint: {
    position: 'absolute',
    top: -3,
    right: -3,
  },
  greetingTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    color: colors.text,
    marginBottom: 4,
  },
  greetingSubtitle: {
    lineHeight: 20,
    fontSize: 14,
  },
  solaMascotBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonContainer: {
    gap: spacing.md,
  },
  skeletonItem: {
    width: '100%',
  },
  moodCard: {
    padding: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardEyebrow: {
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 0.8,
  },
  editLink: {
    fontFamily: 'Nunito_700Bold',
  },
  moodFacesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  moodFaceBtn: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    borderWidth: 1.5,
    borderColor: colors.glassBorderSoft,
  },
  pressedFace: {
    opacity: 0.6,
  },
  faceEmoji: {
    fontSize: 32,
    marginBottom: 2,
  },
  checkedInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  todayEmoji: {
    fontSize: 40,
  },
  checkedInDetails: {
    flex: 1,
    gap: 2,
  },
  affirmationCard: {
    padding: spacing.lg,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
    backgroundColor: 'rgba(253, 232, 237, 0.34)',
  },
  shimmerSparkle: {
    fontSize: 16,
  },
  affirmationText: {
    fontStyle: 'italic',
    lineHeight: 28,
    color: colors.text,
    marginVertical: spacing.xs,
  },
  affirmationActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  shareIcon: {
    fontSize: 16,
    color: colors.textMuted,
  },
  suggestionCard: {
    padding: spacing.lg,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  suggestionTag: {
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
    color: colors.primaryDark,
    backgroundColor: 'rgba(166, 61, 232, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  suggestionTitle: {
    marginBottom: 4,
  },
  suggestionReason: {
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  suggestionButton: {
    width: '100%',
  },
  quickActionsLabel: {
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    borderRadius: 22,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  actionPillHighlight: {
    backgroundColor: 'rgba(243, 232, 251, 0.72)',
    borderColor: 'rgba(166, 61, 232, 0.22)',
  },
  actionIcon: {
    fontSize: 22,
  },
  streakCard: {
    padding: spacing.lg,
  },
  streakTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  streakNumberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flameIcon: {
    fontSize: 28,
  },
  streakCount: {
    fontFamily: 'Nunito_800ExtraBold',
    color: colors.text,
  },
  nextReminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(199, 155, 232, 0.2)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
  },
  bellIcon: {
    fontSize: 12,
  },
  weekDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  dayDotColumn: {
    alignItems: 'center',
    gap: 6,
  },
  dayDot: {
    width: 28,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(199, 155, 232, 0.28)',
  },
  dayDotFilled: {
    backgroundColor: colors.primary,
  },
});
