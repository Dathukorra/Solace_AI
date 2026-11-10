import React from 'react';
import { View, StyleSheet, FlatList, Pressable, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Header';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { PastelSwitch } from '../../components/PastelSwitch';
import { Sola } from '../../components/Sola';
import { Skeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { useAuthStore } from '../../store/authStore';
import { memoryService, UserMemory } from '../../features/profile/memoryService';
import { colors } from '../../theme/colors';
import { spacing, radii } from '../../theme/spacing';

export default function MemorySettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  // 1. Fetch Memories
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['memories'],
    queryFn: () => memoryService.getMemories(),
  });

  const memories: UserMemory[] = data?.memories || [];
  const isMemoryEnabled = user?.aiMemoryEnabled ?? true;

  // 2. Toggle AI Personalization Mutation
  const toggleMutation = useMutation({
    mutationFn: (newVal: boolean) => memoryService.toggleAiMemory(newVal),
    onMutate: (newVal: boolean) => {
      updateUser({ aiMemoryEnabled: newVal });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
    onSuccess: (res) => {
      updateUser({ aiMemoryEnabled: res.user.aiMemoryEnabled });
      showToast({
        message: res.user.aiMemoryEnabled ? 'Personalization enabled' : 'Personalization paused',
        variant: 'info',
      });
    },
    onError: () => {
      updateUser({ aiMemoryEnabled: isMemoryEnabled });
      showToast({
        message: 'Could not update personalization setting',
        variant: 'error',
      });
    },
  });

  const handleToggle = (val: boolean) => {
    toggleMutation.mutate(val);
  };

  // 3. Delete Single Memory Mutation (with Optimistic Update)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => memoryService.deleteMemory(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['memories'] });
      const previous = queryClient.getQueryData<{ memories: UserMemory[] }>(['memories']);
      if (previous) {
        queryClient.setQueryData(['memories'], {
          memories: previous.memories.filter((m) => m.id !== id),
        });
      }
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['memories'], context.previous);
      }
      showToast({ message: 'Could not delete memory', variant: 'error' });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['memories'] });
    },
  });

  const confirmDeleteSingle = (item: UserMemory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Alert.alert('Forget Fact?', `Remove: "${item.fact}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Forget',
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate(item.id);
          showToast({ message: 'Memory removed', variant: 'info' });
        },
      },
    ]);
  };

  // 4. Clear All Memories
  const handleClearAll = () => {
    if (memories.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      'Clear All Memories?',
      'This will permanently remove everything Sola has remembered across all your chats. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete each memory
              await Promise.all(memories.map((m) => memoryService.deleteMemory(m.id)));
              await queryClient.invalidateQueries({ queryKey: ['memories'] });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              showToast({ message: 'All memories cleared', variant: 'success' });
            } catch {
              showToast({ message: 'Failed to clear all memories', variant: 'error' });
            }
          },
        },
      ]
    );
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header
        title="What Sola Remembers"
        subtitle="Manage your personalized memory & privacy"
        showBack={true}
        rightAction={<Sola mood={isMemoryEnabled ? 'listening' : 'sleepy'} size={42} />}
      />

      <View style={styles.container}>
        {/* Memory Explanation Card */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <Card variant="surface" style={styles.explanationCard}>
            <View style={styles.explanationRow}>
              <Text style={styles.explanationIcon}>💡</Text>
              <View style={styles.explanationTextBlock}>
                <Text variant="titleSm" style={styles.explanationTitle}>
                  How Memory Works
                </Text>
                <Text variant="bodySm" color={colors.textSecondary} style={styles.explanationBody}>
                  Sola remembers helpful things you share—like what eases your stress, loved ones,
                  or personal goals—so conversations feel genuinely thoughtful and you never have to
                  repeat yourself.
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Toggle Personalization Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <Card variant="frosted" style={styles.toggleCard}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextGroup}>
                <Text variant="titleSm" style={styles.toggleHeading}>
                  Personalization & Memory
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {isMemoryEnabled
                    ? 'Active: Sola uses your saved memories to tailor guidance.'
                    : 'Paused: Sola will not recall memories during chats.'}
                </Text>
              </View>
              <PastelSwitch value={isMemoryEnabled} onValueChange={handleToggle} />
            </View>
          </Card>
        </Animated.View>

        {/* Memories List Header & Clear All */}
        <View style={styles.listHeaderRow}>
          <Text variant="caption" color={colors.textSecondary} style={styles.listHeaderTitle}>
            REMEMBERED FACTS ({memories.length})
          </Text>
          {memories.length > 0 && (
            <Pressable
              onPress={handleClearAll}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear all memories"
            >
              <Text variant="caption" color={colors.error} style={styles.clearAllText}>
                Clear all memory
              </Text>
            </Pressable>
          )}
        </View>

        {/* List of Remembered Facts */}
        {isLoading ? (
          <View style={styles.skeletonGroup}>
            <Skeleton height={56} borderRadius={16} />
            <Skeleton height={56} borderRadius={16} />
            <Skeleton height={56} borderRadius={16} />
          </View>
        ) : memories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Sola mood="calm" size={90} showGlow={true} />
            <Text variant="titleSm" style={styles.emptyTitle}>
              Sola hasn't learned anything yet
            </Text>
            <Text variant="bodySm" color={colors.textSecondary} style={styles.emptyBody}>
              As you chat with Sola, lasting details worth remembering (like your goals or what
              brings you calm) will appear here for you to review or delete anytime.
            </Text>
            <Button
              title="Talk to Sola"
              variant="primary"
              size="md"
              onPress={() => router.navigate('/(tabs)/chat')}
              style={styles.emptyAction}
            />
          </View>
        ) : (
          <FlatList
            data={memories}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => {
                  void refetch();
                }}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <Animated.View entering={FadeInDown.duration(200)}>
                <Card variant="frosted" style={styles.memoryCard}>
                  <View style={styles.memoryItemRow}>
                    <Text style={styles.bulletIcon}>🌱</Text>
                    <Text variant="bodySm" color={colors.text} style={styles.factText}>
                      {item.fact}
                    </Text>
                    <Pressable
                      onPress={() => confirmDeleteSingle(item)}
                      hitSlop={12}
                      style={styles.deleteButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete memory: ${item.fact}`}
                    >
                      <Text style={styles.trashEmoji}>✕</Text>
                    </Pressable>
                  </View>
                </Card>
              </Animated.View>
            )}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  explanationCard: {
    padding: spacing.md,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
  },
  explanationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  explanationIcon: {
    fontSize: 22,
    marginTop: 2,
  },
  explanationTextBlock: {
    flex: 1,
    gap: 4,
  },
  explanationTitle: {
    fontFamily: 'Nunito_700Bold',
    color: colors.text,
  },
  explanationBody: {
    lineHeight: 20,
  },
  toggleCard: {
    padding: spacing.md,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  toggleTextGroup: {
    flex: 1,
    gap: 2,
  },
  toggleHeading: {
    fontFamily: 'Nunito_700Bold',
    color: colors.text,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xs,
  },
  listHeaderTitle: {
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 0.8,
  },
  clearAllText: {
    fontFamily: 'Nunito_700Bold',
  },
  skeletonGroup: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing['2xl'],
  },
  memoryCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
  },
  memoryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bulletIcon: {
    fontSize: 16,
  },
  factText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  deleteButton: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: 'rgba(242, 107, 138, 0.12)',
  },
  trashEmoji: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    paddingBottom: spacing['2xl'],
  },
  emptyTitle: {
    fontFamily: 'Nunito_700Bold',
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyBody: {
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyAction: {
    marginTop: spacing.md,
    minWidth: 180,
  },
});
