import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Chip } from '../../components/Chip';
import { useMoodStore } from '../../store/moodStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const MoodSummaryCard: React.FC = () => {
  const currentMood = useMoodStore((s) => s.currentMood);
  const entries = useMoodStore((s) => s.entries);

  const getMoodLabel = () => {
    switch (currentMood) {
      case 'rough':
        return 'Sad (1/5)';
      case 'low':
        return 'Low (2/5)';
      case 'okay':
        return 'Neutral (3/5)';
      case 'good':
        return 'Good (4/5)';
      case 'great':
        return 'Happy (5/5)';
      default:
        return 'Not logged yet';
    }
  };

  return (
    <Card variant="frosted" radius={28} shadow="sm" style={styles.card}>
      <View style={styles.row}>
        <View style={styles.textColumn}>
          <Text variant="caption" color={colors.textSecondary}>
            TODAY'S MOOD
          </Text>
          <Text variant="title" style={styles.moodLabel}>
            {getMoodLabel()}
          </Text>
        </View>
        <Chip
          label={`${entries.length} ${entries.length === 1 ? 'Check-in' : 'Check-ins'}`}
          variant="sage"
          selected
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing[8],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textColumn: {
    flex: 1,
  },
  moodLabel: {
    color: colors.primaryDark,
    marginTop: 2,
  },
});
