import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { Text } from './Text';
import { Button } from './Button';
import { Chip } from './Chip';
import { Sola, SolaMood } from './Sola';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface MoodCheckinResult {
  mood: number;
  emotions: string[];
  note?: string;
}

interface MoodCheckinModalProps {
  visible: boolean;
  initialMood?: number;
  initialEmotions?: string[];
  initialNote?: string;
  onClose: () => void;
  onSubmit: (data: MoodCheckinResult) => Promise<void>;
  onTalkToSola?: (context: { mood: number; emotions: string[]; note?: string }) => void;
}

const MOOD_LEVELS: {
  level: number;
  label: string;
  emoji: string;
  solaMood: SolaMood;
  colors: readonly [string, string, ...string[]];
  description: string;
}[] = [
  {
    level: 1,
    label: 'Rough',
    emoji: '😔',
    solaMood: 'sad',
    colors: ['#FFF6D8', '#FFE7A0', '#FFD66B'],
    description: 'Feeling heavy, overwhelmed, or down',
  },
  {
    level: 2,
    label: 'Low',
    emoji: '😕',
    solaMood: 'sleepy',
    colors: ['#F0F1F5', '#D9DCE4', '#B0B4C1'],
    description: 'A bit tired, detached, or off-balance',
  },
  {
    level: 3,
    label: 'Okay',
    emoji: '😐',
    solaMood: 'calm',
    colors: ['#F3E8FB', '#E3CBF4', '#C79BE8'],
    description: 'Steady, grounded, simply being here',
  },
  {
    level: 4,
    label: 'Good',
    emoji: '🙂',
    solaMood: 'listening',
    colors: ['#E8F7F2', '#C8EFE3', '#9ED8C6'],
    description: 'Content, light, positive ease',
  },
  {
    level: 5,
    label: 'Great',
    emoji: '😊',
    solaMood: 'happy',
    colors: ['#FDE8ED', '#F8A6B8', '#F26B8A'],
    description: 'Vibrant, grateful, deeply joyful',
  },
];

const EMOTIONS_LIST = [
  'calm',
  'anxious',
  'tired',
  'grateful',
  'lonely',
  'excited',
  'stressed',
  'hopeful',
  'overwhelmed',
  'peaceful',
  'content',
  'unfocused',
];

// ─── Subtle Festive Confetti Particle Component ─────────────────────────────
const CONFETTI_PIECES = Array.from({ length: 24 }).map((_, i) => ({
  id: i,
  x: (Math.random() - 0.5) * (SCREEN_WIDTH - 60),
  y: -Math.random() * 140 - 20,
  color: ['#A63DE8', '#C79BE8', '#F26B8A', '#9ED8C6', '#FFD66B'][i % 5],
  size: 6 + (i % 4) * 2,
  rotate: Math.random() * 360,
}));

export const MoodCheckinModal: React.FC<MoodCheckinModalProps> = ({
  visible,
  initialMood = 3,
  initialEmotions = [],
  initialNote = '',
  onClose,
  onSubmit,
  onTalkToSola,
}) => {
  // Step 1: Mood Slider, Step 2: Emotions, Step 3: Note, Step 4: Celebration
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [selectedMood, setSelectedMood] = useState<number>(initialMood);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(initialEmotions);
  const [note, setNote] = useState<string>(initialNote);
  const [submitting, setSubmitting] = useState(false);

  // Animation values for slider scale & celebration glow
  const faceScale = useSharedValue(1);
  const glowScale = useSharedValue(1);
  const celebrationProgress = useSharedValue(0);

  // Reset the flow only when the sheet opens. Prop changes while it is visible
  // (e.g. the dashboard refetch after saving) must not restart at step 1.
  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      setStep(1);
      setSelectedMood(initialMood);
      setSelectedEmotions(initialEmotions);
      setNote(initialNote);
      celebrationProgress.value = 0;
    }
    wasVisible.current = visible;
  }, [visible, initialMood, initialEmotions, initialNote, celebrationProgress]);

  const activeMoodConfig = MOOD_LEVELS.find((m) => m.level === selectedMood) || MOOD_LEVELS[2];

  const handleSelectMood = (level: number) => {
    setSelectedMood(level);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    faceScale.value = withSequence(
      withSpring(1.18, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 14, stiffness: 300 })
    );
    glowScale.value = withSequence(
      withTiming(1.3, { duration: 180 }),
      withTiming(1, { duration: 250 })
    );
  };

  const toggleEmotion = (emotion: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedEmotions((prev) =>
      prev.includes(emotion) ? prev.filter((e) => e !== emotion) : [...prev, emotion]
    );
  };

  const handleSaveCheckin = async () => {
    try {
      setSubmitting(true);
      await onSubmit({
        mood: selectedMood,
        emotions: selectedEmotions,
        note: note.trim() || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      celebrationProgress.value = withTiming(1, { duration: 800 });
      setStep(4);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleTalkToSolaPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onClose();
    if (onTalkToSola) {
      onTalkToSola({
        mood: selectedMood,
        emotions: selectedEmotions,
        note: note.trim() || undefined,
      });
    }
  };

  const animatedFaceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: faceScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: withTiming(0.6),
  }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Dynamic mood backdrop inside modal */}
          <LinearGradient
            colors={activeMoodConfig.colors}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.dragHandle} />

          {/* Top Step Breadcrumb Tracker */}
          {step < 4 && (
            <View style={styles.stepProgressRow}>
              {[1, 2, 3].map((s) => (
                <View key={s} style={[styles.stepBar, step >= s && styles.stepBarActive]} />
              ))}
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ════════════════ STEP 1: MOOD SLIDER SELECTOR ════════════════ */}
            {step === 1 && (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.stepContainer}>
                {/* Reactive Sola Mascot & Atmosphere Glow */}
                <View style={styles.mascotDisplay}>
                  <Animated.View style={[styles.mascotGlowAura, animatedGlowStyle]} />
                  <Animated.View style={animatedFaceStyle}>
                    <Sola mood={activeMoodConfig.solaMood} size={118} showGlow={true} />
                  </Animated.View>
                </View>

                <View style={styles.moodLabelGroup}>
                  <Text variant="display" style={styles.activeMoodName}>
                    {activeMoodConfig.emoji} {activeMoodConfig.label}
                  </Text>
                  <Text variant="body" color={colors.textSecondary} style={styles.moodDescription}>
                    {activeMoodConfig.description}
                  </Text>
                </View>

                {/* Big Slider-like Face Buttons Selector */}
                <View style={styles.sliderTrackCard}>
                  <View style={styles.faceButtonsRow}>
                    {MOOD_LEVELS.map((m) => {
                      const isSelected = selectedMood === m.level;
                      return (
                        <Pressable
                          key={m.level}
                          onPress={() => handleSelectMood(m.level)}
                          style={[styles.sliderFaceBtn, isSelected && styles.sliderFaceBtnSelected]}
                          accessibilityRole="button"
                          accessibilityLabel={m.label}
                        >
                          <Text style={styles.sliderFaceEmoji}>{m.emoji}</Text>
                          <Text
                            variant="caption"
                            color={isSelected ? colors.primaryDark : colors.textMuted}
                            style={isSelected && styles.sliderFaceTextSelected}
                          >
                            {m.level}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <Button
                    title="Next: Choose Emotions"
                    variant="primary"
                    size="lg"
                    style={styles.fullWidthButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setStep(2);
                    }}
                  />
                </View>
              </Animated.View>
            )}

            {/* ════════════════ STEP 2: EMOTIONS PICKER ════════════════ */}
            {step === 2 && (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.stepContainer}>
                <View style={styles.header}>
                  <Text variant="title" style={styles.stepTitle}>
                    What emotions describe this feeling?
                  </Text>
                  <Text variant="body" color={colors.textSecondary} style={styles.stepSubtitle}>
                    Choose as many as fit right now.
                  </Text>
                </View>

                <View style={styles.chipsWrap}>
                  {EMOTIONS_LIST.map((emo) => {
                    const isSelected = selectedEmotions.includes(emo);
                    return (
                      <Chip
                        key={emo}
                        label={emo.charAt(0).toUpperCase() + emo.slice(1)}
                        selected={isSelected}
                        variant={isSelected ? 'sage' : 'outline'}
                        onPress={() => toggleEmotion(emo)}
                      />
                    );
                  })}
                </View>

                <View style={styles.buttonStack}>
                  <Button
                    title="Next: Add a Note"
                    variant="primary"
                    size="lg"
                    style={styles.fullWidthButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setStep(3);
                    }}
                  />
                  <Button title="Back" variant="ghost" size="md" onPress={() => setStep(1)} />
                </View>
              </Animated.View>
            )}

            {/* ════════════════ STEP 3: OPTIONAL NOTE & SAVE ════════════════ */}
            {step === 3 && (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.stepContainer}>
                <View style={styles.header}>
                  <Text variant="title" style={styles.stepTitle}>
                    Would you like to add a note?
                  </Text>
                  <Text variant="body" color={colors.textSecondary} style={styles.stepSubtitle}>
                    Completely optional. A place to drop your thoughts before you move on.
                  </Text>
                </View>

                <TextInput
                  style={styles.noteBox}
                  placeholder="What's on your mind? What helped or felt heavy today?"
                  placeholderTextColor={colors.textMuted}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={4}
                  maxLength={300}
                />

                <View style={styles.buttonStack}>
                  <Button
                    title="Save Check-in"
                    variant="primary"
                    size="lg"
                    loading={submitting}
                    disabled={submitting}
                    style={styles.fullWidthButton}
                    onPress={handleSaveCheckin}
                  />
                  <Button
                    title="Back"
                    variant="ghost"
                    size="md"
                    disabled={submitting}
                    onPress={() => setStep(2)}
                  />
                </View>
              </Animated.View>
            )}

            {/* ════════════════ STEP 4: CELEBRATION & TALK TO SOLA ════════════════ */}
            {step === 4 && (
              <Animated.View entering={FadeIn.duration(400)} style={styles.celebrationContainer}>
                {/* Festive subtle confetti elements */}
                <View style={styles.confettiArea} pointerEvents="none">
                  {CONFETTI_PIECES.map((piece) => (
                    <Animated.View
                      key={piece.id}
                      style={[
                        styles.confettiDot,
                        {
                          backgroundColor: piece.color,
                          width: piece.size,
                          height: piece.size,
                          left: SCREEN_WIDTH / 2 + piece.x,
                          transform: [{ rotate: `${piece.rotate}deg` }],
                        },
                      ]}
                    />
                  ))}
                </View>

                <View style={styles.celebrationCenter}>
                  <Sola mood="happy" size={130} showGlow={true} />
                  <Text variant="display" style={styles.celebrateTitle}>
                    Check-in saved! ✨
                  </Text>
                  <Text
                    variant="body"
                    color={colors.textSecondary}
                    style={styles.celebrateSubtitle}
                  >
                    You honored your state today and kept your streak alive.
                  </Text>
                </View>

                {/* Offer: Talk about it with Sola */}
                <View style={styles.celebrationCard}>
                  <View style={styles.solaOfferHeader}>
                    <Text style={styles.chatBubbleIcon}>💬</Text>
                    <View style={styles.solaOfferTextGroup}>
                      <Text variant="titleSm">Unpack this with Sola</Text>
                      <Text variant="caption" color={colors.textSecondary}>
                        Open a calm chat pre-seeded with your {activeMoodConfig.label.toLowerCase()}{' '}
                        check-in.
                      </Text>
                    </View>
                  </View>

                  <Button
                    title="Talk about it with Sola"
                    variant="secondary"
                    size="lg"
                    style={styles.fullWidthButton}
                    onPress={handleTalkToSolaPress}
                  />
                </View>

                <Button
                  title="Done"
                  variant="ghost"
                  size="md"
                  style={styles.doneButton}
                  onPress={onClose}
                />
              </Animated.View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 46, 0.32)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing['2xl'],
    maxHeight: '92%',
    overflow: 'hidden',
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 16,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(107, 100, 120, 0.22)',
    alignSelf: 'center',
    marginVertical: spacing.sm,
  },
  stepProgressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(199, 155, 232, 0.22)',
  },
  stepBarActive: {
    backgroundColor: colors.primary,
  },
  scrollContent: {
    paddingVertical: spacing.xs,
  },
  stepContainer: {
    alignItems: 'center',
    width: '100%',
  },
  mascotDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    marginBottom: spacing.xs,
  },
  mascotGlowAura: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  moodLabelGroup: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  activeMoodName: {
    fontSize: 28,
    fontFamily: 'Nunito_800ExtraBold',
    color: colors.text,
    marginBottom: 4,
  },
  moodDescription: {
    textAlign: 'center',
    fontSize: 14,
  },
  sliderTrackCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 28,
    padding: spacing.md,
    width: '100%',
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: spacing.xl,
  },
  faceButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderFaceBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 54,
  },
  sliderFaceBtnSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: colors.primary,
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  sliderFaceEmoji: {
    fontSize: 34,
    marginBottom: 4,
  },
  sliderFaceTextSelected: {
    fontFamily: 'Nunito_800ExtraBold',
    color: colors.primaryDark,
  },
  actionRow: {
    width: '100%',
    marginTop: spacing.xs,
  },
  fullWidthButton: {
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  stepTitle: {
    textAlign: 'center',
    fontFamily: 'Nunito_800ExtraBold',
    color: colors.text,
  },
  stepSubtitle: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  buttonStack: {
    width: '100%',
    gap: spacing.xs,
  },
  noteBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderRadius: 24,
    padding: spacing.md,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
    fontSize: 15,
    color: colors.text,
    minHeight: 110,
    textAlignVertical: 'top',
    width: '100%',
    marginBottom: spacing.xl,
  },
  celebrationContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    width: '100%',
  },
  confettiArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  confettiDot: {
    position: 'absolute',
    borderRadius: 3,
    top: 20,
    opacity: 0.85,
  },
  celebrationCenter: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  celebrateTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 26,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  celebrateSubtitle: {
    textAlign: 'center',
    fontSize: 14,
    paddingHorizontal: spacing.md,
  },
  celebrationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderRadius: 28,
    padding: spacing.lg,
    width: '100%',
    marginVertical: spacing.md,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
    gap: spacing.md,
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  solaOfferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chatBubbleIcon: {
    fontSize: 26,
  },
  solaOfferTextGroup: {
    flex: 1,
  },
  doneButton: {
    width: '100%',
    marginTop: spacing.xs,
  },
});
