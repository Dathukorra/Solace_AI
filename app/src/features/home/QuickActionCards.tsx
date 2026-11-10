import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';

const ACTIONS = [
  {
    id: 'chat',
    title: 'Talk to Solace',
    desc: 'AI guided emotional support',
    icon: '💬',
    route: '/chat',
    variant: 'softLavender' as const,
  },
  {
    id: 'mood',
    title: 'Check In',
    desc: 'Log your emotional state',
    icon: '✨',
    route: '/mood',
    variant: 'softPeach' as const,
  },
  {
    id: 'activities',
    title: 'Mindfulness',
    desc: 'Breathing & reflections',
    icon: '🌿',
    route: '/activities',
    variant: 'softSage' as const,
  },
];

export const QuickActionCards: React.FC = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text variant="title" style={styles.heading}>
        Quick Actions
      </Text>
      <View style={styles.grid}>
        {ACTIONS.map((item) => (
          <Card
            key={item.id}
            variant={item.variant}
            radius={28}
            shadow="sm"
            onPress={() => router.push(item.route as any)}
            accessibilityLabel={item.title}
            style={styles.card}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <Text variant="titleSm" style={styles.title}>
              {item.title}
            </Text>
            <Text variant="caption" color={colors.textSecondary} style={styles.desc}>
              {item.desc}
            </Text>
          </Card>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing[12],
  },
  heading: {
    marginBottom: spacing[8],
  },
  grid: {
    gap: spacing[8],
  },
  card: {
    padding: spacing[16],
  },
  icon: {
    fontSize: 26,
    marginBottom: spacing[4],
  },
  title: {
    color: colors.text,
  },
  desc: {
    marginTop: 2,
  },
});
