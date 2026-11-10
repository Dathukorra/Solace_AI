import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';
import { GlassCard } from '../../components/GlassCard';
import { Mascot } from '../../components/Mascot';
import { Text } from '../../components/Text';
import { useAuthStore } from '../../store/authStore';
import { useMoodStore } from '../../store/moodStore';
import type { HomeChecklistCounts } from './homeService';
import { dismissGettingStarted, hasDismissedGettingStarted } from '../onboarding/onboardingStorage';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type ChecklistKey = 'mood' | 'conversation' | 'activity' | 'reminder';

interface ChecklistItem {
  key: ChecklistKey;
  title: string;
  emoji: string;
  complete: boolean;
  onPress: () => void;
}

interface GettingStartedCardProps {
  counts: HomeChecklistCounts;
}

const RING_SIZE = 46;
const RING_STROKE = 4;

const ProgressRing: React.FC<{ completed: number; total: number }> = ({ completed, total }) => {
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(1, completed / total) : 0;

  return (
    <View style={styles.ringWrap}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          stroke="rgba(166, 61, 232, 0.16)"
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          stroke={colors.primary}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          fill="none"
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>
      <Text variant="captionSm" color={colors.primaryDark} style={styles.ringLabel}>
        {completed}/{total}
      </Text>
    </View>
  );
};

const ChecklistRow: React.FC<{
  item: ChecklistItem;
  justTicked: boolean;
}> = ({ item, justTicked }) => {
  const checkScale = useSharedValue(1);

  useEffect(() => {
    if (!justTicked) return;
    checkScale.value = withSequence(
      withSpring(1.45, { damping: 9, stiffness: 320 }),
      withSpring(1, { damping: 14, stiffness: 240 })
    );
  }, [checkScale, justTicked]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        item.onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${item.complete ? ', completed' : ''}`}
      testID={`home-getting-started-item-${item.key}`}
      style={({ pressed }) => [styles.itemRow, pressed && styles.itemPressed]}
    >
      <Animated.View
        style={[styles.checkCircle, item.complete && styles.checkCircleDone, checkStyle]}
      >
        <Text style={[styles.checkMark, item.complete && styles.checkMarkDone]}>
          {item.complete ? '✓' : item.emoji}
        </Text>
      </Animated.View>

      <View style={styles.itemTextBlock}>
        <Text
          variant="bodySm"
          color={item.complete ? colors.textMuted : colors.text}
          style={item.complete ? styles.itemTitleDone : undefined}
        >
          {item.title}
        </Text>
        {item.complete && (
          <Text variant="captionSm" color={colors.success}>
            Done
          </Text>
        )}
      </View>

      <Text style={styles.itemChevron}>›</Text>
    </Pressable>
  );
};

/**
 * Home's first-run checklist. Completion comes entirely from the counts in
 * GET /home, so no extra progress tracking is needed. Dismissal is stored per
 * user on the device.
 */
export const GettingStartedCard: React.FC<GettingStartedCardProps> = ({ counts }) => {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const openCheckinModal = useMoodStore((s) => s.openCheckinModal);

  const [dismissed, setDismissed] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [ticked, setTicked] = useState<ChecklistKey[]>([]);
  const [celebrationVisible, setCelebrationVisible] = useState(false);

  const previousCompletedRef = useRef<Set<ChecklistKey> | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setDismissed(true);
      return () => {
        active = false;
      };
    }

    setDismissed(true);
    void hasDismissedGettingStarted(userId).then((value) => {
      if (active) setDismissed(value);
    });

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(
    () => () => {
      if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    },
    []
  );

  const items: ChecklistItem[] = [
    {
      key: 'mood',
      title: 'Do your first mood check-in',
      emoji: '😊',
      complete: counts.moods > 0,
      onPress: () => openCheckinModal(),
    },
    {
      key: 'conversation',
      title: 'Say hello to Sola',
      emoji: '💬',
      complete: counts.conversations > 0,
      onPress: () => router.navigate('/(tabs)/chat'),
    },
    {
      key: 'activity',
      title: 'Try a 1-minute breathing exercise',
      emoji: '🌬️',
      complete: counts.activities > 0,
      onPress: () => router.push('/breathing'),
    },
    {
      key: 'reminder',
      title: 'Set a reminder',
      emoji: '🔔',
      complete: counts.reminders > 0,
      onPress: () => router.push('/reminders'),
    },
  ];

  const completedItems = items.filter((item) => item.complete);
  const completedCount = completedItems.length;
  const allComplete = completedCount === items.length;

  // Celebrate only on a real transition after the first data load. A user who
  // already finished everything does not need an unexpected confetti burst.
  useEffect(() => {
    const completedKeys = new Set(items.filter((item) => item.complete).map((item) => item.key));
    const previous = previousCompletedRef.current;

    if (previous !== null) {
      const newlyCompleted = [...completedKeys].filter((key) => !previous.has(key));

      if (newlyCompleted.length > 0) {
        setTicked(newlyCompleted);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
        tickTimerRef.current = setTimeout(() => setTicked([]), 1000);
      }

      if (completedKeys.size === items.length && previous.size < items.length) {
        setCelebrationVisible(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
        celebrationTimerRef.current = setTimeout(() => setCelebrationVisible(false), 4200);
      }
    }

    previousCompletedRef.current = completedKeys;
    // The four counts fully describe checklist progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts.moods, counts.conversations, counts.activities, counts.reminders]);

  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setDismissed(true);
    if (userId) void dismissGettingStarted(userId);
  }, [userId]);

  return (
    <>
      {!dismissed && !allComplete && (
        <Animated.View entering={FadeInDown.duration(400)} testID="home-getting-started">
          <GlassCard variant="softLavender" radius={28} shadow="frosted" style={styles.card}>
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setCollapsed((value) => !value);
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  collapsed ? 'Expand getting started' : 'Collapse getting started'
                }
                accessibilityState={{ expanded: !collapsed }}
                testID="home-getting-started-toggle"
                style={styles.headerMain}
              >
                <ProgressRing completed={completedCount} total={items.length} />
                <View style={styles.headerText}>
                  <Text variant="titleSm" color={colors.text}>
                    Getting started
                  </Text>
                  <Text variant="caption" color={colors.textSecondary}>
                    {completedCount === 0
                      ? 'Four small steps to feel at home'
                      : `${completedCount} of ${items.length} gentle steps done`}
                  </Text>
                </View>
                <Text style={styles.chevron}>{collapsed ? '⌄' : '⌃'}</Text>
              </Pressable>

              <Pressable
                onPress={handleDismiss}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Dismiss getting started"
                testID="home-getting-started-dismiss"
                style={({ pressed }) => [styles.dismissBtn, pressed && styles.itemPressed]}
              >
                <Text style={styles.dismissText}>✕</Text>
              </Pressable>
            </View>

            {!collapsed && (
              <Animated.View entering={FadeIn.duration(220)} style={styles.items}>
                {items.map((item) => (
                  <ChecklistRow key={item.key} item={item} justTicked={ticked.includes(item.key)} />
                ))}
              </Animated.View>
            )}
          </GlassCard>
        </Animated.View>
      )}

      <Modal
        visible={celebrationVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCelebrationVisible(false)}
      >
        <View style={styles.celebrationBackdrop}>
          <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.celebrationWrap}>
            <GlassCard variant="solid" radius={30} shadow="lg" style={styles.celebrationCard}>
              <View style={styles.sparkleRow}>
                <Text style={styles.sparkle}>✨</Text>
                <Text style={styles.sparkleMain}>🎉</Text>
                <Text style={styles.sparkle}>✨</Text>
              </View>
              <Mascot pose="waving" size={128} />
              <Text variant="title" style={styles.celebrationTitle}>
                You did it!
              </Text>
              <Text variant="bodySm" color={colors.textSecondary} style={styles.celebrationBody}>
                Your first four steps are complete. Sola is cheering for you — this is the start of
                something gentle.
              </Text>
              <Pressable
                onPress={() => setCelebrationVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close celebration"
                style={({ pressed }) => [styles.celebrationButton, pressed && styles.itemPressed]}
              >
                <Text variant="bodyMedium" color={colors.textInverse}>
                  Lovely
                </Text>
              </Pressable>
            </GlassCard>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  chevron: {
    fontSize: 16,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  dismissBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dismissText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    position: 'absolute',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
  },
  items: {
    gap: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 16,
  },
  itemPressed: {
    opacity: 0.65,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderWidth: 1.5,
    borderColor: colors.glassBorderSoft,
  },
  checkCircleDone: {
    backgroundColor: 'rgba(102, 191, 164, 0.18)',
    borderColor: colors.success,
  },
  checkMark: {
    fontSize: 15,
  },
  checkMarkDone: {
    color: colors.success,
    fontSize: 17,
    fontFamily: 'Nunito_800ExtraBold',
  },
  itemTextBlock: {
    flex: 1,
    gap: 1,
  },
  itemTitleDone: {
    textDecorationLine: 'line-through',
  },
  itemChevron: {
    fontSize: 20,
    color: colors.textMuted,
  },
  celebrationBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 46, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  celebrationWrap: {
    width: '100%',
    maxWidth: 360,
  },
  celebrationCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sparkle: {
    fontSize: 22,
  },
  sparkleMain: {
    fontSize: 34,
  },
  celebrationTitle: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  celebrationBody: {
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 21,
  },
  celebrationButton: {
    minWidth: 150,
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
});
