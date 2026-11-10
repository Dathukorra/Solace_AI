import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Chip } from '../../components/Chip';
import { Sola } from '../../components/Sola';
import { useMoodStore } from '../../store/moodStore';
import { MOOD_OPTIONS } from './types';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';

export const MoodHistoryList: React.FC = () => {
  const entries = useMoodStore((s) => s.entries);

  if (entries.length === 0) {
    return (
      <Card variant="frosted" radius={28} style={styles.emptyContainer}>
        <Sola mood="calm" size={80} style={styles.emptySola} />
        <Text variant="titleSm" align="center" style={styles.emptyTitle}>
          Your Mindful Canvas is Ready
        </Text>
        <Text variant="caption" color={colors.textSecondary} align="center">
          Tap one of the gentle states above to log your very first check-in.
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="title" style={styles.heading}>
        Recent Check-ins
      </Text>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const opt = MOOD_OPTIONS.find((o) => o.level === item.mood);
          return (
            <Card variant="frosted" radius={20} shadow="sm" style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.emoji}>{opt?.emoji || '✨'}</Text>
                <View style={styles.info}>
                  <Text variant="bodyMedium">{opt?.label || item.mood}</Text>
                  {item.note && (
                    <Text variant="caption" color={colors.textSecondary}>
                      {item.note}
                    </Text>
                  )}
                </View>
                <Chip
                  label={new Date(item.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  variant="neutral"
                />
              </View>
            </Card>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing[8] }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[16],
  },
  heading: {
    marginBottom: spacing[8],
  },
  card: {
    padding: spacing[12],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 26,
    marginRight: spacing[12],
  },
  info: {
    flex: 1,
  },
  emptyContainer: {
    padding: spacing[24],
    marginTop: spacing[16],
    alignItems: 'center',
  },
  emptySola: {
    marginBottom: spacing[12],
  },
  emptyTitle: {
    marginBottom: spacing[4],
  },
});
