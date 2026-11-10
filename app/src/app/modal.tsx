import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function ModalScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.container}>
        <Card variant="frosted" radius={28} shadow="md" style={styles.card}>
          <Text style={styles.icon}>🕊️</Text>
          <Text variant="title" align="center">
            Mindful Space
          </Text>
          <Text variant="body" color={colors.textSecondary} align="center" style={styles.body}>
            Take a deep breath in through your nose, hold for a moment, and gently release.
          </Text>
          <Button
            title="Return to Space"
            variant="soft"
            onPress={() => router.back()}
            style={styles.btn}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[24],
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    padding: spacing[24],
  },
  icon: {
    fontSize: 40,
    marginBottom: spacing[12],
  },
  body: {
    marginVertical: spacing[16],
  },
  btn: {
    width: '100%',
  },
});
