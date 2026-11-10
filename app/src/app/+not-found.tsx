import { useRouter, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found' }} />
      <Screen>
        <View style={styles.container}>
          <Card variant="frosted" radius={28} shadow="md" style={styles.card}>
            <Text style={styles.emoji}>🌿</Text>
            <Text variant="title" align="center">
              Peaceful Detour
            </Text>
            <Text variant="body" color={colors.textSecondary} align="center" style={styles.desc}>
              This path seems to have drifted away. Let's head back home.
            </Text>
            <Button
              title="Return to Home"
              variant="primary"
              onPress={() => router.replace('/(tabs)')}
              style={styles.btn}
            />
          </Card>
        </View>
      </Screen>
    </>
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
  emoji: {
    fontSize: 40,
    marginBottom: spacing[12],
  },
  desc: {
    marginVertical: spacing[16],
  },
  btn: {
    width: '100%',
  },
});
