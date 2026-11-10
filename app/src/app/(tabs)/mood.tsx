import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, RefreshControl, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeInDown,
} from 'react-native-reanimated';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Header';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Sola } from '../../components/Sola';
import { Skeleton } from '../../components/Skeleton';
import { progressService, ProgressSummary, BadgeItem } from '../../features/home/progressService';
import { homeService } from '../../features/home/homeService';
import { useMoodStore } from '../../store/moodStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const CHART_HEIGHT = 160;
const CHART_PADDING_X = 12;
const CHART_PADDING_TOP = 16;
const CHART_PADDING_BOTTOM = 34;
const DAY_MS = 24 * 60 * 60 * 1000;

function getUtcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function parseDateKey(dateKey: string): Date | null {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function formatFriendlyDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// ─── Badge Card with Unlock Animation & Modal ────────────────────────────────
interface BadgeCardProps {
  badge: BadgeItem;
  onPress: (badge: BadgeItem) => void;
}

const BadgeCard: React.FC<BadgeCardProps> = ({ badge, onPress }) => {
  const scale = useSharedValue(1);

  const getBadgeIcon = (id: string) => {
    switch (id) {
      case 'first_checkin':
        return '🌱';
      case 'streak_3':
        return '🔥';
      case 'streak_7':
        return '⭐';
      case 'streak_30':
        return '👑';
      case 'breathing_10':
        return '🌬️';
      default:
        return '✨';
    }
  };

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(1.15, { damping: 10, stiffness: 350 }),
      withSpring(1, { damping: 12, stiffness: 300 })
    );
    Haptics.impactAsync(
      badge.earned ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    ).catch(() => {});
    onPress(badge);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.badgeItemWrap, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        style={[styles.badgeCard, !badge.earned && styles.badgeCardLocked]}
        accessibilityRole="button"
        accessibilityLabel={`${badge.title}, ${badge.earned ? 'unlocked' : 'locked'}`}
      >
        <View style={[styles.badgeIconCircle, !badge.earned && styles.badgeIconCircleLocked]}>
          <Text style={[styles.badgeEmoji, !badge.earned && styles.badgeEmojiLocked]}>
            {getBadgeIcon(badge.id)}
          </Text>
        </View>
        <Text
          variant="caption"
          numberOfLines={1}
          style={[styles.badgeTitle, !badge.earned && styles.badgeTitleLocked]}
        >
          {badge.title}
        </Text>
        <Text variant="captionSm" color={badge.earned ? colors.primaryDark : colors.textMuted}>
          {badge.earned ? 'Unlocked' : 'Locked 🔒'}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

// ─── 30-Day Mood SVG Chart ───────────────────────────────────────────────────
interface MoodChartProps {
  moods: { mood: number; date: string }[];
  today?: string;
}

const ThirtyDayMoodChart: React.FC<MoodChartProps> = ({ moods, today }) => {
  const [selectedPoint, setSelectedPoint] = useState<{ mood: number; date: string } | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

  // Generate 30 day slots, anchored to the account's local "today" so the
  // chart lines up with the localDate values returned by the API.
  const chartPoints = useMemo(() => {
    const points: { mood: number | null; date: string; x: number; y: number }[] = [];
    if (chartWidth <= 0) return points;

    const totalDays = 30;
    const plotWidth = Math.max(1, chartWidth - CHART_PADDING_X * 2);
    const stepX = plotWidth / (totalDays - 1);
    const todayDate = parseDateKey(today || getUtcDateKey()) || new Date();
    const plotHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(todayDate.getTime() - i * DAY_MS);
      const dateStr = getUtcDateKey(d);
      const match = moods.find((m) => m.date === dateStr);

      const moodVal = match ? match.mood : null;
      const x = CHART_PADDING_X + (totalDays - 1 - i) * stepX;
      // y-scale: mood 1 to 5 maps to the bottom and top of the plot area.
      const y =
        moodVal !== null
          ? CHART_HEIGHT - CHART_PADDING_BOTTOM - ((moodVal - 1) / 4) * plotHeight
          : 0;

      points.push({ mood: moodVal, date: dateStr, x, y });
    }
    return points;
  }, [moods, today, chartWidth]);

  const activePoints = useMemo(() => chartPoints.filter((p) => p.mood !== null), [chartPoints]);

  // Break the line wherever a day is missing so it never implies a continuous
  // mood across a gap in check-ins.
  const pathSegments = useMemo(() => {
    const segments: string[] = [];
    let current = '';
    for (const point of chartPoints) {
      if (point.mood === null) {
        if (current) {
          segments.push(current);
          current = '';
        }
        continue;
      }
      current += `${current ? ' L' : 'M'} ${point.x} ${point.y}`;
    }
    if (current) segments.push(current);
    return segments;
  }, [chartPoints]);

  return (
    <View
      style={styles.chartWrapper}
      onLayout={(event) => setChartWidth(Math.round(event.nativeEvent.layout.width))}
    >
      {chartWidth > 0 && (
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          {/* Horizontal grid guide lines */}
          {[1, 2, 3, 4, 5].map((lvl) => {
            const y =
              CHART_HEIGHT -
              CHART_PADDING_BOTTOM -
              ((lvl - 1) / 4) * (CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM);
            return (
              <Line
                key={lvl}
                x1={CHART_PADDING_X}
                y1={y}
                x2={chartWidth - CHART_PADDING_X}
                y2={y}
                stroke="rgba(107, 100, 120, 0.16)"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Continuous mood curve, split across missing days */}
          {pathSegments.map((segment, index) => (
            <Path
              key={`segment-${index}`}
              d={segment}
              stroke={colors.primary}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}

          {/* Individual point dots */}
          {activePoints.map((pt, i) => (
            <Circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={selectedPoint?.date === pt.date ? 6.5 : 4}
              fill={selectedPoint?.date === pt.date ? '#FFFFFF' : colors.primary}
              stroke={colors.primaryDark}
              strokeWidth={2}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setSelectedPoint({ mood: pt.mood!, date: pt.date });
              }}
            />
          ))}

          {/* Axis labels */}
          <SvgText
            x={2}
            y={CHART_HEIGHT - 6}
            fill={colors.textMuted}
            fontSize={10}
            fontFamily="Nunito_700Bold"
          >
            30d ago
          </SvgText>
          <SvgText
            x={chartWidth - 2}
            y={CHART_HEIGHT - 6}
            fill={colors.textMuted}
            fontSize={10}
            fontFamily="Nunito_700Bold"
            textAnchor="end"
          >
            Today
          </SvgText>
        </Svg>
      )}

      {/* Selected point details callout */}
      {selectedPoint && (
        <View style={styles.chartTooltip}>
          <Text variant="captionSm" color={colors.primaryDark}>
            {formatFriendlyDate(selectedPoint.date)} · Mood {selectedPoint.mood}/5
          </Text>
        </View>
      )}
    </View>
  );
};

// ─── Main Mood & Progress Screen ─────────────────────────────────────────────
export default function MoodScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const openCheckinModal = useMoodStore((s) => s.openCheckinModal);
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);

  // Insights can stay mounted while a check-in or activity happens on another
  // tab, so refresh both datasets whenever the screen regains focus.
  const hasFocusedInsightsRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedInsightsRef.current) {
        hasFocusedInsightsRef.current = true;
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ['progress'] });
      void queryClient.invalidateQueries({ queryKey: ['moodHistory30d'] });
    }, [queryClient])
  );

  // 1. Fetch Progress Summary (Streaks, Badges, Activity Counts)
  const {
    data: progressData,
    isLoading: isProgressLoading,
    isError: isProgressError,
    refetch: refetchProgress,
    isRefetching,
  } = useQuery<ProgressSummary>({
    queryKey: ['progress'],
    queryFn: () => progressService.getProgress(),
  });

  // 2. Fetch 30-Day Mood Check-in History for SVG Chart
  const {
    data: moodHistoryData,
    isLoading: isMoodHistoryLoading,
    isError: isMoodHistoryError,
    refetch: refetchMoodHistory,
  } = useQuery({
    queryKey: ['moodHistory30d'],
    queryFn: () => homeService.getMoodHistory('30d'),
  });

  const moodsList = useMemo(() => {
    return (moodHistoryData?.moods || []).map((m) => ({
      mood: m.mood,
      date: m.localDate || m.createdAt.split('T')[0],
    }));
  }, [moodHistoryData?.moods]);

  // Insights unlock after three distinct check-in days. The 30-day window is
  // enough for the first-run pattern reveal and mirrors the chart's range.
  const uniqueCheckinDays = useMemo(() => {
    const days = new Set<string>();
    for (const item of moodHistoryData?.moods || []) {
      const day = item.localDate || item.createdAt.split('T')[0];
      if (day) days.add(day);
    }
    return days.size;
  }, [moodHistoryData?.moods]);

  const insightsUnlocked = uniqueCheckinDays >= 3;
  const isInsightsLoading = isProgressLoading || isMoodHistoryLoading;
  const isInsightsUnavailable =
    (isProgressError && !progressData) || (isMoodHistoryError && !moodHistoryData);

  const handleCheckInNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    openCheckinModal();
    router.navigate('/(tabs)');
  };

  const handleRetryInsights = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    void refetchProgress();
    void refetchMoodHistory();
  };

  // Warm weekly mood summary text
  const weeklySummaryText = useMemo(() => {
    const weeklyAverages = progressData?.weeklyMoodAverages || [];
    if (weeklyAverages.length === 0) {
      return 'Every mindful check-in brings clarity. Take quiet pride in taking time for yourself.';
    }

    const latestWeek = weeklyAverages[weeklyAverages.length - 1];
    if (!latestWeek || latestWeek.averageMood === null || latestWeek.count === 0) {
      return 'A quieter week with no new check-ins. Your past reflections are safe here, and one gentle check-in can begin a new chapter whenever you are ready.';
    }

    const avg = latestWeek.averageMood;
    if (avg >= 4) {
      return `You had a warm and uplifting week, averaging ${avg}/5 across your check-ins. You’re meeting life with grounded presence and gratitude.`;
    } else if (avg >= 3) {
      return `A steady, balanced week averaging ${avg}/5. You gave yourself permission to just be, honoring both the quiet and active moments.`;
    } else {
      return `This was a gentler, more tender week averaging ${avg}/5. Remember that tough days are part of being human—give yourself extra grace and patience.`;
    }
  }, [progressData?.weeklyMoodAverages]);

  const activityCounts = progressData?.activityCountsByType || {};

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        title="Your Insights"
        subtitle="Your mood patterns & streak over time"
        rightAction={<Sola mood="happy" size={42} showGlow={true} />}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetchProgress();
              void refetchMoodHistory();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {isInsightsLoading ? (
          <View style={styles.loadingContainer}>
            <Skeleton height={110} borderRadius={24} />
            <Skeleton height={210} borderRadius={24} />
            <Skeleton height={90} borderRadius={24} />
            <Skeleton height={140} borderRadius={24} />
          </View>
        ) : isInsightsUnavailable ? (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.insightsEmptyWrap}>
            <Card variant="frosted" style={styles.insightsEmptyCard}>
              <Sola mood="thinking" size={112} showGlow={true} />
              <Text variant="title" style={styles.insightsEmptyTitle}>
                Sola couldn&apos;t gather your insights
              </Text>
              <Text variant="bodySm" color={colors.textSecondary} style={styles.insightsEmptyBody}>
                Your patterns are safe. Check your connection and try again in a moment.
              </Text>

              <Button
                title="Try again"
                variant="primary"
                size="lg"
                onPress={handleRetryInsights}
                style={styles.insightsCheckinButton}
              />
            </Card>
          </Animated.View>
        ) : !insightsUnlocked ? (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.insightsEmptyWrap}>
            <Card variant="frosted" style={styles.insightsEmptyCard}>
              <Sola mood="listening" size={112} showGlow={true} />
              <Text variant="title" style={styles.insightsEmptyTitle}>
                Check in for 3 days to unlock your patterns
              </Text>
              <Text variant="bodySm" color={colors.textSecondary} style={styles.insightsEmptyBody}>
                A few gentle check-ins help Sola notice what supports you and what weighs on you.
              </Text>

              <View
                style={styles.insightsProgressRow}
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 0,
                  max: 3,
                  now: Math.min(uniqueCheckinDays, 3),
                }}
              >
                <View style={styles.insightsProgressTrack}>
                  <View
                    style={[
                      styles.insightsProgressFill,
                      { width: `${Math.min(100, (uniqueCheckinDays / 3) * 100)}%` },
                    ]}
                  />
                </View>
                <Text variant="captionSm" color={colors.primaryDark}>
                  {Math.min(uniqueCheckinDays, 3)} of 3 days
                </Text>
              </View>

              <Button
                title="Check in now"
                variant="primary"
                size="lg"
                onPress={handleCheckInNow}
                style={styles.insightsCheckinButton}
              />
            </Card>
          </Animated.View>
        ) : (
          <>
            {/* 1. Streak Flame Card: Current & Best */}
            <Animated.View entering={FadeInDown.duration(350)}>
              <Card variant="frosted" style={styles.streakCard}>
                <View style={styles.streakFlameHeader}>
                  <Text style={styles.flameEmoji}>🔥</Text>
                  <View style={styles.streakTextGroup}>
                    <Text variant="title" style={styles.streakMainTitle}>
                      {progressData?.currentStreak ?? 0}{' '}
                      {progressData?.currentStreak === 1 ? 'Day Streak' : 'Days Streak'}
                    </Text>
                    <Text variant="bodySm" color={colors.textSecondary}>
                      Personal best: {progressData?.bestStreak ?? 0} days of consistent care
                    </Text>
                  </View>
                </View>

                {/* Progress bar visual */}
                <View style={styles.streakProgressTrack}>
                  <View
                    style={[
                      styles.streakProgressFill,
                      {
                        width: `${Math.min(
                          100,
                          Math.max(
                            10,
                            ((progressData?.currentStreak ?? 0) /
                              Math.max(progressData?.bestStreak || 7, 7)) *
                              100
                          )
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </Card>
            </Animated.View>

            {/* 2. 30-Day Mood Trend SVG Chart */}
            <Animated.View entering={FadeInDown.delay(100).duration(350)}>
              <Card variant="surface" style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text variant="caption" color={colors.primaryDark} style={styles.sectionEyebrow}>
                    30-DAY MOOD FLOW
                  </Text>
                  <Text variant="captionSm" color={colors.textMuted}>
                    Tap a node to inspect
                  </Text>
                </View>

                <ThirtyDayMoodChart moods={moodsList} today={moodHistoryData?.today} />
              </Card>
            </Animated.View>

            {/* 3. Warmly Written Weekly Summary */}
            <Animated.View entering={FadeInDown.delay(180).duration(350)}>
              <Card variant="softSage" style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryIcon}>🕊️</Text>
                  <Text variant="caption" color={colors.primaryDark} style={styles.sectionEyebrow}>
                    WEEKLY MOOD INSIGHT
                  </Text>
                </View>
                <Text variant="body" color={colors.text} style={styles.summaryText}>
                  {weeklySummaryText}
                </Text>
              </Card>
            </Animated.View>

            {/* 4. Activity Counts Row */}
            <Animated.View entering={FadeInDown.delay(260).duration(350)}>
              <Text variant="caption" color={colors.textSecondary} style={styles.sectionHeading}>
                COMPLETED MINDFUL ACTIVITIES
              </Text>
              <View style={styles.activityGrid}>
                <Card variant="frosted" style={styles.activityStatPill}>
                  <Text style={styles.activityStatIcon}>🌬️</Text>
                  <Text variant="titleSm" style={styles.activityStatNum}>
                    {activityCounts['BREATHING'] || 0}
                  </Text>
                  <Text variant="captionSm" color={colors.textMuted}>
                    Breathing
                  </Text>
                </Card>

                <Card variant="frosted" style={styles.activityStatPill}>
                  <Text style={styles.activityStatIcon}>✍️</Text>
                  <Text variant="titleSm" style={styles.activityStatNum}>
                    {(activityCounts['JOURNALING'] || 0) + (activityCounts['REFLECTION'] || 0)}
                  </Text>
                  <Text variant="captionSm" color={colors.textMuted}>
                    Reflections
                  </Text>
                </Card>

                <Card variant="frosted" style={styles.activityStatPill}>
                  <Text style={styles.activityStatIcon}>🧘</Text>
                  <Text variant="titleSm" style={styles.activityStatNum}>
                    {(activityCounts['MEDITATION'] || 0) +
                      (activityCounts['MOVEMENT'] || 0) +
                      (activityCounts['BODY_SCAN'] || 0)}
                  </Text>
                  <Text variant="captionSm" color={colors.textMuted}>
                    Self-Care
                  </Text>
                </Card>

                <Card variant="frosted" style={styles.activityStatPill}>
                  <Text style={styles.activityStatIcon}>✨</Text>
                  <Text variant="titleSm" style={styles.activityStatNum}>
                    {moodsList.length}
                  </Text>
                  <Text variant="captionSm" color={colors.textMuted}>
                    Check-ins
                  </Text>
                </Card>
              </View>
            </Animated.View>

            {/* 5. Achievements Grid with Locked/Unlocked States */}
            <Animated.View entering={FadeInDown.delay(340).duration(350)}>
              <View style={styles.badgesHeader}>
                <Text variant="caption" color={colors.textSecondary} style={styles.sectionHeading}>
                  MINDFUL ACHIEVEMENTS
                </Text>
                <Text variant="captionSm" color={colors.primaryDark}>
                  {progressData?.badges.filter((b) => b.earned).length || 0}/
                  {progressData?.badges.length || 5} unlocked
                </Text>
              </View>

              <View style={styles.badgesGrid}>
                {(progressData?.badges || []).map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} onPress={(b) => setSelectedBadge(b)} />
                ))}
              </View>
            </Animated.View>
          </>
        )}

        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>

      {/* Badge Detail Modal Dialog */}
      {selectedBadge && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedBadge(null)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedBadge(null)}>
            <Card variant="surface" style={styles.badgeDetailCard}>
              <View style={styles.modalCenter}>
                <Sola
                  mood={selectedBadge.earned ? 'happy' : 'thinking'}
                  size={88}
                  showGlow={true}
                />
                <Text variant="title" style={styles.badgeModalTitle}>
                  {selectedBadge.title}
                </Text>
                <Text variant="body" color={colors.textSecondary} style={styles.badgeModalDesc}>
                  {selectedBadge.description}
                </Text>

                <View
                  style={[
                    styles.statusPill,
                    selectedBadge.earned ? styles.statusPillUnlocked : styles.statusPillLocked,
                  ]}
                >
                  <Text
                    variant="captionSm"
                    color={selectedBadge.earned ? colors.primaryDark : colors.textMuted}
                    style={styles.statusPillText}
                  >
                    {selectedBadge.earned ? '✓ Unlocked Achievement' : '🔒 Locked Achievement'}
                  </Text>
                </View>

                <Button
                  title="Close"
                  variant="primary"
                  size="md"
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedBadge(null)}
                />
              </View>
            </Card>
          </Pressable>
        </Modal>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  loadingContainer: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  insightsEmptyWrap: {
    marginTop: spacing.sm,
  },
  insightsEmptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
  },
  insightsEmptyTitle: {
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  insightsEmptyBody: {
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: spacing.sm,
  },
  insightsProgressRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  insightsProgressTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(166, 61, 232, 0.14)',
    overflow: 'hidden',
  },
  insightsProgressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  insightsCheckinButton: {
    width: '100%',
  },
  streakCard: {
    padding: spacing.lg,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
  },
  streakFlameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  flameEmoji: {
    fontSize: 40,
  },
  streakTextGroup: {
    flex: 1,
  },
  streakMainTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    color: colors.text,
  },
  streakProgressTrack: {
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(199, 155, 232, 0.22)',
    overflow: 'hidden',
  },
  streakProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  chartCard: {
    padding: spacing.md,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionEyebrow: {
    fontFamily: 'Nunito_800ExtraBold',
    letterSpacing: 0.8,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  chartTooltip: {
    backgroundColor: 'rgba(243, 232, 251, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginTop: 6,
  },
  summaryCard: {
    padding: spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  summaryIcon: {
    fontSize: 18,
  },
  summaryText: {
    lineHeight: 22,
  },
  sectionHeading: {
    fontFamily: 'Nunito_800ExtraBold',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  activityGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  activityStatPill: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityStatIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  activityStatNum: {
    fontFamily: 'Nunito_800ExtraBold',
    color: colors.text,
  },
  badgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  badgeItemWrap: {
    width: '48%',
  },
  badgeCard: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.52)',
    gap: 4,
  },
  badgeCardLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    borderColor: 'rgba(255, 255, 255, 0.42)',
    opacity: 0.72,
  },
  badgeIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(243, 232, 251, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badgeIconCircleLocked: {
    backgroundColor: 'rgba(199, 155, 232, 0.16)',
  },
  badgeEmoji: {
    fontSize: 26,
  },
  badgeEmojiLocked: {
    opacity: 0.45,
  },
  badgeTitle: {
    fontFamily: 'Nunito_700Bold',
    color: colors.text,
    textAlign: 'center',
  },
  badgeTitleLocked: {
    color: colors.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 46, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  badgeDetailCard: {
    width: '100%',
    maxWidth: 360,
    padding: spacing.xl,
    borderRadius: 28,
  },
  modalCenter: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  badgeModalTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    textAlign: 'center',
    color: colors.text,
  },
  badgeModalDesc: {
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  statusPillUnlocked: {
    backgroundColor: 'rgba(158, 216, 198, 0.26)',
  },
  statusPillLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
  },
  statusPillText: {
    fontFamily: 'Nunito_700Bold',
  },
  modalCloseBtn: {
    width: '100%',
    marginTop: spacing.md,
  },
});
