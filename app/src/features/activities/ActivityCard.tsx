import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Chip } from '../../components/Chip';
import { ActivityItem } from './types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface ActivityCardProps {
  activity: ActivityItem;
  onPress: (activity: ActivityItem) => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onPress }) => {
  return (
    <Card
      variant="frosted"
      radius={28}
      shadow="sm"
      onPress={() => onPress(activity)}
      accessibilityLabel={`${activity.title}, ${activity.durationMinutes} minutes`}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{activity.icon}</Text>
        <Chip label={`${activity.durationMinutes} min`} variant="sage" selected />
      </View>
      <Text variant="titleSm" style={styles.title}>
        {activity.title}
      </Text>
      <Text variant="caption" color={colors.textSecondary} style={styles.description}>
        {activity.description}
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing[16],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  icon: {
    fontSize: 28,
  },
  title: {
    marginBottom: 4,
    color: colors.text,
  },
  description: {
    lineHeight: 18,
  },
});
