import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { MOOD_OPTIONS, MoodOption } from './types';
import { useMoodStore } from '../../store/moodStore';
import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const MoodItem: React.FC<{
  option: MoodOption;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ option, isSelected, onSelect }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 350 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 350 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelect();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`Mood ${option.label}`}
      style={[
        styles.optionBtn,
        isSelected && {
          borderColor: option.color,
          backgroundColor: `${option.color}25`,
        },
        animatedStyle,
      ]}
    >
      <Text style={styles.emoji}>{option.emoji}</Text>
      <Text
        variant="caption"
        style={[styles.label, isSelected && { color: option.color, fontWeight: 'bold' }]}
      >
        {option.label}
      </Text>
    </AnimatedPressable>
  );
};

export const MoodSelector: React.FC = () => {
  const currentMood = useMoodStore((s) => s.currentMood);
  const setCurrentMood = useMoodStore((s) => s.setCurrentMood);
  const addEntry = useMoodStore((s) => s.addEntry);

  const handleSelect = (option: MoodOption) => {
    setCurrentMood(option.level);
    addEntry({
      mood: option.level,
      tags: ['daily_checkin'],
      note: `Feeling ${option.label.toLowerCase()}`,
    });
  };

  return (
    <Card variant="frosted" style={styles.container}>
      <Text variant="title" style={styles.title}>
        How is your heart feeling today?
      </Text>
      <Text variant="caption" color={colors.textSecondary} style={styles.subtitle}>
        Select your present state without judgment
      </Text>
      <View style={styles.optionsRow}>
        {MOOD_OPTIONS.map((opt) => (
          <MoodItem
            key={opt.level}
            option={opt}
            isSelected={currentMood === opt.level}
            onSelect={() => handleSelect(opt)}
          />
        ))}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing[12],
    padding: spacing[16],
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing[16],
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[8],
  },
  optionBtn: {
    flex: 1,
    minHeight: 64,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[4],
    borderRadius: radii[20],
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
  },
  emoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
