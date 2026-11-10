import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../../components/Text';
import { Sola, SolaMood } from '../../components/Sola';
import { useAuthStore } from '../../store/authStore';
import { useMoodStore } from '../../store/moodStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const DailyGreeting: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const currentMood = useMoodStore((s) => s.currentMood);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getSolaMood = (): SolaMood => {
    switch (currentMood) {
      case 'great':
      case 'good':
        return 'happy';
      case 'rough':
        return 'sad';
      case 'low':
        return 'sleepy';
      case 'okay':
      default:
        return 'calm';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text variant="display" color={colors.text}>
          {getGreeting()}, {user?.name || 'Friend'}
        </Text>
        <Text variant="subtitle" color={colors.textSecondary} style={styles.subtitle}>
          How are you feeling today? Take a mindful pause.
        </Text>
      </View>
      <View style={styles.solaWrapper}>
        <Sola mood={getSolaMood()} size={72} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[12],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    paddingRight: spacing[12],
  },
  subtitle: {
    marginTop: spacing[4],
  },
  solaWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
