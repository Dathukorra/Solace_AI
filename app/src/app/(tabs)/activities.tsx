import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, TextInput, Pressable, FlatList, Dimensions, Share } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Header';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { HintDot } from '../../components/HintDot';
import { Sola } from '../../components/Sola';
import { useToast } from '../../components/Toast';
import { useFeatureHint } from '../../features/onboarding/useFeatureHint';
import { useTourTarget } from '../../features/tour';
import { homeService } from '../../features/home/homeService';
import { activityService } from '../../features/activities/activityService';
import { JournalEntry, SelfCareChallenge } from '../../features/activities/wellnessTypes';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Curated Affirmations Pool for Carousel ──────────────────────────────────
const AFFIRMATIONS_POOL = [
  'You do not have to have everything figured out to move forward gently.',
  'Your feelings are valid, even the complicated and quiet ones.',
  'It is safe to slow down and breathe before responding to the world.',
  'Rest is not something you must earn; it is something you naturally need.',
  'One small, kind choice for yourself is enough for this morning.',
  'Peace begins with the breath you are taking right now.',
  'You are resilient, even on the days you feel fragile.',
  'You deserve the same patience you so easily give to others.',
  'When you feel overwhelmed, focus on just the next small thing.',
];

// ─── 5 Daily Self-Care Challenges ────────────────────────────────────────────
const INITIAL_CHALLENGES: SelfCareChallenge[] = [
  {
    id: 'water',
    title: 'Drink a glass of water',
    description: 'Nourish your body and refresh your hydration.',
    emoji: '💧',
    completed: false,
    activityType: 'BODY_SCAN',
    durationSec: 60,
  },
  {
    id: 'outside',
    title: 'Step outside for 3 minutes',
    description: 'Feel the fresh air, daylight, and nature around you.',
    emoji: '🌳',
    completed: false,
    activityType: 'MOVEMENT',
    durationSec: 180,
  },
  {
    id: 'stretch',
    title: 'Gentle neck & shoulder stretch',
    description: 'Release physical tension held throughout your day.',
    emoji: '🧘',
    completed: false,
    activityType: 'MOVEMENT',
    durationSec: 120,
  },
  {
    id: 'friend',
    title: 'Send a kind message to a friend',
    description: 'Share a gentle note or check in with a loved one.',
    emoji: '💌',
    completed: false,
    activityType: 'REFLECTION',
    durationSec: 90,
  },
  {
    id: 'screen_break',
    title: 'Take a 2-minute screen break',
    description: 'Rest your eyes, look out a window, and soften your gaze.',
    emoji: '🌿',
    completed: false,
    activityType: 'MEDITATION',
    durationSec: 120,
  },
];

export default function ActivitiesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; section?: string; t?: string }>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const featuredTarget = useTourTarget('activities-featured');
  const breathingHint = useFeatureHint('breathing-banner');

  // Active view tab: 'reflection' | 'affirmations' | 'selfcare' | 'breathing'
  const [activeTab, setActiveTab] = useState<'reflection' | 'affirmations' | 'selfcare'>(
    'reflection'
  );

  // Synchronize notification or route navigation target tab
  useEffect(() => {
    if (params.tab === 'selfcare' || params.section === 'selfcare') {
      setActiveTab('selfcare');
    } else if (
      params.tab === 'affirmations' ||
      params.tab === 'affirmation' ||
      params.section === 'affirmation'
    ) {
      setActiveTab('affirmations');
    }
  }, [params.tab, params.section, params.t]);

  // 1. Reflection Journal State
  const [journalContent, setJournalContent] = useState('');
  const [journalList, setJournalList] = useState<JournalEntry[]>([]);
  const [savingJournal, setSavingJournal] = useState(false);

  // 2. Affirmations Carousel State
  const [affirmationFavorites, setAffirmationFavorites] = useState<string[]>([]);
  const [activeAffirmationIndex, setActiveAffirmationIndex] = useState(0);

  // 3. Self-care Challenges State
  const [challenges, setChallenges] = useState<SelfCareChallenge[]>(INITIAL_CHALLENGES);

  // Fetch home data for today's mood
  const { data: homeData } = useQuery({
    queryKey: ['homeDashboard'],
    queryFn: () => homeService.getHomeDashboard(),
  });

  // Dynamic AI Reflection Prompt derived from recent mood
  const reflectionPrompt = useMemo(() => {
    const moodScore = homeData?.todayCheckin?.mood ?? 3;
    if (moodScore <= 2) {
      return 'What is one kind boundary or comfort you can offer yourself today?';
    } else if (moodScore >= 4) {
      return 'What gave you a spark of gratitude or energy today?';
    } else {
      return 'What is asking for your patience or attention right now?';
    }
  }, [homeData?.todayCheckin?.mood]);

  // ─── Handlers: Daily Reflection ──────────────────────────────────────────

  const handleSaveReflection = async () => {
    if (!journalContent.trim()) return;
    try {
      setSavingJournal(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      const newEntry: JournalEntry = {
        id: `journal-${Date.now()}`,
        prompt: reflectionPrompt,
        content: journalContent.trim(),
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setJournalList((prev) => [newEntry, ...prev]);
      setJournalContent('');

      // Post to /activities as JOURNALING session to increment streak
      await activityService.postActivity({
        type: 'JOURNALING',
        durationSec: 120,
      });

      // Refresh streaks in home dashboard
      void queryClient.invalidateQueries({ queryKey: ['homeDashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['progress'] });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast({
        message: 'Reflection saved to journal 🌱',
        subtitle: 'Activity counted toward your streak!',
        variant: 'success',
      });
    } catch {
      showToast({ message: 'Saved locally', variant: 'info' });
    } finally {
      setSavingJournal(false);
    }
  };

  // ─── Handlers: Affirmations Carousel ─────────────────────────────────────

  const toggleFavoriteAffirmation = (text: string) => {
    Haptics.selectionAsync().catch(() => {});
    setAffirmationFavorites((prev) =>
      prev.includes(text) ? prev.filter((t) => t !== text) : [...prev, text]
    );
  };

  const handleShareAffirmation = async (text: string) => {
    Haptics.selectionAsync().catch(() => {});
    try {
      await Share.share({
        message: `"${text}" — Solace Mindfulness`,
      });
    } catch {
      // ignore
    }
  };

  // ─── Handlers: Self-Care Checklist ───────────────────────────────────────

  const handleToggleChallenge = async (challenge: SelfCareChallenge) => {
    if (challenge.completed) return; // already completed

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Update challenge state
    setChallenges((prev) =>
      prev.map((c) => (c.id === challenge.id ? { ...c, completed: true } : c))
    );

    // Record activity on backend
    try {
      await activityService.postActivity({
        type: challenge.activityType,
        durationSec: challenge.durationSec,
      });

      // Update streaks in Home and Progress
      void queryClient.invalidateQueries({ queryKey: ['homeDashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['progress'] });

      showToast({
        message: `Completed: ${challenge.title}! ✨`,
        subtitle: 'Counted toward your streak',
        variant: 'success',
        icon: challenge.emoji,
      });
    } catch {
      // non-blocking
    }
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <Header
        title="Mindfulness Hub"
        subtitle="Daily reflections, affirmations, & self-care"
        rightAction={<Sola mood="calm" size={42} showGlow={true} />}
      />

      <View style={styles.container}>
        <View
          ref={featuredTarget.ref}
          onLayout={featuredTarget.onLayout}
          collapsable={false}
          testID="activities-featured"
          style={styles.featuredBlock}
        >
          {/* Navigation Tabs Pill Selector */}
          <View style={styles.tabSelectorRow}>
            <Chip
              label="✍️ Reflection"
              variant="outline"
              selected={activeTab === 'reflection'}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setActiveTab('reflection');
              }}
              style={styles.tabChip}
            />
            <Chip
              label="✨ Affirmations"
              variant="outline"
              selected={activeTab === 'affirmations'}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setActiveTab('affirmations');
              }}
              style={styles.tabChip}
            />
            <Chip
              label="🌱 Self-Care"
              variant="outline"
              selected={activeTab === 'selfcare'}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setActiveTab('selfcare');
              }}
              style={styles.tabChip}
            />
          </View>

          {/* Guided Breathing Shortcut Banner */}
          <Pressable
            onPress={() => {
              breathingHint.dismiss();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              router.push('/breathing');
            }}
            style={styles.breathingBanner}
            accessibilityRole="button"
            accessibilityLabel="Start guided breathing"
          >
            <View style={styles.breathingBannerText}>
              <Text
                variant="titleSm"
                color={colors.primaryDark}
                style={styles.breathingBannerTitle}
              >
                🌬️ Guided Breathing
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                Box 4-4-4-4, 4-7-8, and Calm 4-6 with expanding circle & haptics.
              </Text>
            </View>
            <Text style={styles.bannerArrow}>→</Text>
            <HintDot visible={breathingHint.visible} style={styles.bannerHint} />
          </Pressable>
        </View>

        {/* ════════════════ TAB 1: DAILY REFLECTION ════════════════ */}
        {activeTab === 'reflection' && (
          <View style={styles.tabContentArea}>
            {/* AI Generated Prompt Card */}
            <Animated.View entering={FadeInDown.duration(300)}>
              <Card variant="surface" style={styles.promptCard}>
                <View style={styles.promptHeader}>
                  <Text style={styles.sparkleIcon}>✨</Text>
                  <Text variant="caption" color={colors.primaryDark} style={styles.promptEyebrow}>
                    TODAY'S GENTLE PROMPT
                  </Text>
                </View>
                <Text variant="titleSm" style={styles.promptBody}>
                  "{reflectionPrompt}"
                </Text>
              </Card>
            </Animated.View>

            {/* Reflection Text Area */}
            <Card variant="frosted" style={styles.journalCard}>
              <TextInput
                style={styles.journalInput}
                placeholder="Write whatever comes to mind... No filter, no judgment."
                placeholderTextColor={colors.textMuted}
                value={journalContent}
                onChangeText={setJournalContent}
                multiline
                numberOfLines={4}
              />

              <Button
                title={savingJournal ? 'Saving...' : 'Save to Journal'}
                variant="primary"
                size="md"
                disabled={!journalContent.trim() || savingJournal}
                loading={savingJournal}
                onPress={handleSaveReflection}
                style={styles.saveJournalBtn}
              />
            </Card>

            {/* Saved Journal Entries List */}
            <Text variant="caption" color={colors.textSecondary} style={styles.savedEntriesHeading}>
              TODAY'S SAVED ENTRIES ({journalList.length})
            </Text>

            {journalList.length === 0 ? (
              <View style={styles.emptyJournalBox}>
                <Text variant="bodySm" color={colors.textMuted} style={styles.emptyJournalText}>
                  Your thoughts will be preserved here once saved.
                </Text>
              </View>
            ) : (
              <FlatList
                data={journalList}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.journalListScroll}
                renderItem={({ item }) => (
                  <Card variant="frosted" style={styles.journalEntryCard}>
                    <View style={styles.journalEntryHeader}>
                      <Text
                        variant="captionSm"
                        color={colors.primaryDark}
                        style={styles.journalEntryPrompt}
                      >
                        {item.prompt}
                      </Text>
                      <Text variant="captionSm" color={colors.textMuted}>
                        {item.createdAt}
                      </Text>
                    </View>
                    <Text variant="body" color={colors.text} style={styles.journalEntryContent}>
                      {item.content}
                    </Text>
                  </Card>
                )}
              />
            )}
          </View>
        )}

        {/* ════════════════ TAB 2: AFFIRMATIONS CAROUSEL ════════════════ */}
        {activeTab === 'affirmations' && (
          <View style={styles.tabContentArea}>
            <FlatList
              data={AFFIRMATIONS_POOL}
              keyExtractor={(_, i) => `aff-${i}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 32));
                setActiveAffirmationIndex(idx);
                Haptics.selectionAsync().catch(() => {});
              }}
              contentContainerStyle={styles.affirmationCarouselList}
              renderItem={({ item }) => {
                const isFav = affirmationFavorites.includes(item);
                return (
                  <View style={[styles.affirmationSlide, { width: SCREEN_WIDTH - 32 }]}>
                    <Card variant="frosted" style={styles.affirmationCard}>
                      <View style={styles.affirmationCardTop}>
                        <Text style={styles.affirmationLotus}>🌸</Text>
                        <Pressable
                          onPress={() => toggleFavoriteAffirmation(item)}
                          hitSlop={12}
                          accessibilityRole="button"
                          accessibilityLabel="Favorite affirmation"
                        >
                          <Text style={[styles.favHeart, isFav && styles.favHeartActive]}>
                            {isFav ? '❤️' : '🤍'}
                          </Text>
                        </Pressable>
                      </View>

                      <Text variant="display" style={styles.affirmationQuote}>
                        "{item}"
                      </Text>

                      <View style={styles.affirmationCardFooter}>
                        <Text variant="caption" color={colors.textSecondary}>
                          Swipe for more · Solace
                        </Text>
                        <Pressable
                          onPress={() => handleShareAffirmation(item)}
                          hitSlop={10}
                          style={styles.shareBtn}
                        >
                          <Text style={styles.shareIconText}>↗ Share</Text>
                        </Pressable>
                      </View>
                    </Card>
                  </View>
                );
              }}
            />

            {/* Pagination Dots */}
            <View style={styles.carouselDotsRow}>
              {AFFIRMATIONS_POOL.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.carouselDot,
                    activeAffirmationIndex === i && styles.carouselDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* ════════════════ TAB 3: SELF-CARE CHECKLIST ════════════════ */}
        {activeTab === 'selfcare' && (
          <View style={styles.tabContentArea}>
            <View style={styles.selfCareHeader}>
              <Text variant="titleSm" style={styles.selfCareTitle}>
                5 Small Daily Challenges
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                Tick each to honor your body. Every completed challenge counts toward your streak.
              </Text>
            </View>

            <FlatList
              data={challenges}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.challengesListScroll}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleToggleChallenge(item)}
                  style={[styles.challengeRow, item.completed && styles.challengeRowCompleted]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.completed }}
                  accessibilityLabel={item.title}
                >
                  <Text style={styles.challengeEmoji}>{item.emoji}</Text>
                  <View style={styles.challengeInfo}>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.challengeTitle,
                        item.completed && styles.challengeTitleCompleted,
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text variant="captionSm" color={colors.textSecondary}>
                      {item.description}
                    </Text>
                  </View>

                  <View
                    style={[styles.tickCheckbox, item.completed && styles.tickCheckboxCompleted]}
                  >
                    {item.completed && <Text style={styles.tickCheckmark}>✓</Text>}
                  </View>
                </Pressable>
              )}
            />
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  featuredBlock: {
    width: '100%',
  },
  tabSelectorRow: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.38)',
    borderRadius: 999,
    padding: 5,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.glassBorderSoft,
  },
  tabChip: {
    flex: 1,
  },
  breathingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(232, 247, 242, 0.62)',
    borderRadius: 24,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  breathingBannerText: {
    flex: 1,
    gap: 2,
  },
  breathingBannerTitle: {
    fontFamily: 'Nunito_800ExtraBold',
  },
  bannerArrow: {
    fontSize: 20,
    color: colors.primaryDark,
    marginLeft: spacing.sm,
  },
  bannerHint: {
    position: 'absolute',
    top: 8,
    right: 10,
  },
  tabContentArea: {
    flex: 1,
  },
  promptCard: {
    padding: spacing.md,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sparkleIcon: {
    fontSize: 14,
  },
  promptEyebrow: {
    fontFamily: 'Nunito_800ExtraBold',
    letterSpacing: 0.8,
  },
  promptBody: {
    fontFamily: 'Nunito_700Bold',
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  journalCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  journalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderRadius: 20,
    padding: spacing.md,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
    fontSize: 15,
    color: colors.text,
    minHeight: 110,
    textAlignVertical: 'top',
    marginBottom: spacing.sm,
  },
  saveJournalBtn: {
    width: '100%',
  },
  savedEntriesHeading: {
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  emptyJournalBox: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyJournalText: {
    fontStyle: 'italic',
  },
  journalListScroll: {
    gap: spacing.xs,
    paddingBottom: spacing['2xl'],
  },
  journalEntryCard: {
    padding: spacing.md,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
  },
  journalEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  journalEntryPrompt: {
    fontFamily: 'Nunito_700Bold',
    flex: 1,
    marginRight: spacing.sm,
  },
  journalEntryContent: {
    lineHeight: 20,
  },
  affirmationCarouselList: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  affirmationSlide: {
    paddingHorizontal: 4,
  },
  affirmationCard: {
    padding: spacing.xl,
    minHeight: 280,
    justifyContent: 'space-between',
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
  },
  affirmationCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  affirmationLotus: {
    fontSize: 28,
  },
  favHeart: {
    fontSize: 22,
    opacity: 0.7,
  },
  favHeartActive: {
    opacity: 1,
  },
  affirmationQuote: {
    fontSize: 22,
    lineHeight: 32,
    fontStyle: 'italic',
    textAlign: 'center',
    color: colors.text,
    fontFamily: 'Nunito_700Bold',
    marginVertical: spacing.md,
  },
  affirmationCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(243, 232, 251, 0.8)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  shareIconText: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    color: colors.secondaryDark,
  },
  carouselDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(199, 155, 232, 0.38)',
  },
  carouselDotActive: {
    width: 20,
    backgroundColor: colors.secondaryDark,
  },
  selfCareHeader: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  selfCareTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    color: colors.text,
    marginBottom: 2,
  },
  challengesListScroll: {
    gap: spacing.sm,
    paddingBottom: spacing['2xl'],
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.52)',
    borderRadius: 24,
    padding: spacing.md,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
    gap: spacing.md,
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  challengeRowCompleted: {
    backgroundColor: 'rgba(232, 247, 242, 0.68)',
    borderColor: 'rgba(158, 216, 198, 0.72)',
  },
  challengeEmoji: {
    fontSize: 26,
  },
  challengeInfo: {
    flex: 1,
    gap: 2,
  },
  challengeTitle: {
    fontFamily: 'Nunito_700Bold',
    color: colors.text,
  },
  challengeTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.primaryDark,
  },
  tickCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(199, 155, 232, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickCheckboxCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tickCheckmark: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
