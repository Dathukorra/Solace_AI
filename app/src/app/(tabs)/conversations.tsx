import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Header';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Sola } from '../../components/Sola';
import { Skeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { chatService } from '../../features/chat/chatService';
import { Conversation } from '../../features/chat/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

// ─── Relative Time Helper ────────────────────────────────────────────────────
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Swipeable Conversation Row ──────────────────────────────────────────────
interface ConversationRowProps {
  item: Conversation;
  onPress: () => void;
  onDelete: (id: string, item: Conversation) => void;
  onRename: (id: string, currentTitle: string) => void;
}

const ConversationRow: React.FC<ConversationRowProps> = ({ item, onPress, onDelete, onRename }) => {
  const translateX = useSharedValue(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 15,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx < 0) {
            // Only allow swipe left (up to -90px)
            translateX.value = Math.max(-90, gestureState.dx);
          } else {
            translateX.value = 0;
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -55) {
            translateX.value = withSpring(-80, { damping: 15 });
          } else {
            translateX.value = withSpring(0, { damping: 15 });
          }
        },
      }),
    [translateX]
  );

  const animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleDeleteTrigger = () => {
    translateX.value = withTiming(0, { duration: 150 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      'Delete Conversation?',
      `Are you sure you want to remove "${item.title || 'Untitled'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(item.id, item),
        },
      ]
    );
  };

  return (
    <View style={styles.swipeRowWrapper}>
      {/* Hidden Swipe Delete Action */}
      <View style={styles.hiddenActionArea}>
        <Pressable
          onPress={handleDeleteTrigger}
          style={styles.deleteActionBtn}
          accessibilityRole="button"
          accessibilityLabel="Delete conversation"
        >
          <Text style={styles.trashIcon}>🗑️</Text>
          <Text variant="captionSm" style={styles.deleteActionText}>
            Delete
          </Text>
        </Pressable>
      </View>

      {/* Foreground Interactive Card */}
      <Animated.View {...panResponder.panHandlers} style={[styles.rowForeground, animatedRowStyle]}>
        <Pressable
          onPress={() => {
            if (translateX.value < -20) {
              translateX.value = withSpring(0);
              return;
            }
            onPress();
          }}
          onLongPress={() => onRename(item.id, item.title || 'Conversation')}
          delayLongPress={450}
          style={({ pressed }) => [styles.cardInner, pressed && styles.pressedCard]}
        >
          <View style={styles.rowHeader}>
            <Text variant="titleSm" numberOfLines={1} style={styles.conversationTitle}>
              {item.title || 'Gentle Conversation'}
            </Text>
            <Text variant="captionSm" color={colors.textMuted} style={styles.timeText}>
              {formatRelativeTime(item.updatedAt)}
            </Text>
          </View>

          <Text
            variant="bodySm"
            color={colors.textSecondary}
            numberOfLines={2}
            style={styles.previewText}
          >
            {item.lastMessage || 'Tap to continue reflecting with Sola...'}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

// ─── Main Conversations Screen ───────────────────────────────────────────────
export default function ConversationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // 1. Fetch Conversations with TanStack Query
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatService.getConversations(50),
  });

  const conversationsList: Conversation[] = useMemo(
    () => data?.conversations || [],
    [data?.conversations]
  );

  // Filter conversations by title search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversationsList;
    const q = searchQuery.toLowerCase().trim();
    return conversationsList.filter(
      (c) =>
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  }, [conversationsList, searchQuery]);

  // 2. Delete Mutation with Optimistic Updates & Undo
  const deleteMutation = useMutation({
    mutationFn: (id: string) => chatService.deleteConversation(id),
    onMutate: async (deletedId: string) => {
      await queryClient.cancelQueries({ queryKey: ['conversations'] });
      const previousData = queryClient.getQueryData<{
        conversations: Conversation[];
      }>(['conversations']);

      // Optimistically remove from list
      if (previousData) {
        queryClient.setQueryData(['conversations'], {
          ...previousData,
          conversations: previousData.conversations.filter((c) => c.id !== deletedId),
        });
      }

      return { previousData };
    },
    onError: (_, __, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['conversations'], context.previousData);
      }
      showToast({
        message: 'Could not delete conversation.',
        variant: 'error',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleDeleteWithUndo = (id: string, deletedItem: Conversation) => {
    deleteMutation.mutate(id);

    // Provide immediate Undo Toast
    showToast({
      message: `Deleted "${deletedItem.title || 'Conversation'}"`,
      variant: 'info',
      durationMs: 4500,
      actionLabel: 'Undo',
      onAction: async () => {
        // Rollback optimistic delete & restore on server
        try {
          await chatService.createConversation(deletedItem.title || undefined);
          await queryClient.invalidateQueries({ queryKey: ['conversations'] });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } catch {
          // ignore
        }
      },
    });
  };

  // 3. Rename Mutation with Optimistic Update
  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      chatService.renameConversation(id, title),
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: ['conversations'] });
      const previousData = queryClient.getQueryData<{
        conversations: Conversation[];
      }>(['conversations']);

      if (previousData) {
        queryClient.setQueryData(['conversations'], {
          ...previousData,
          conversations: previousData.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
        });
      }
      return { previousData };
    },
    onError: (_, __, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['conversations'], context.previousData);
      }
      showToast({ message: 'Failed to rename conversation', variant: 'error' });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handlePromptRename = (id: string, currentTitle: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setRenameTarget({ id, title: currentTitle });
    setRenameValue(currentTitle);
  };

  const handleCloseRename = () => {
    setRenameTarget(null);
    setRenameValue('');
  };

  const handleSaveRename = () => {
    const title = renameValue.trim();
    if (renameTarget && title.length > 0) {
      renameMutation.mutate({ id: renameTarget.id, title });
    }
    handleCloseRename();
  };

  // 4. Handle "New Chat" Creation
  const handleNewChat = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const newConv = await chatService.createConversation('A Gentle Conversation');
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push({
        pathname: '/(tabs)/chat',
        params: { conversationId: newConv.id },
      });
    } catch {
      router.push('/(tabs)/chat');
    }
  };

  const handleOpenConversation = (conv: Conversation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push({
      pathname: '/(tabs)/chat',
      params: { conversationId: conv.id },
    });
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Header */}
      <Header
        title="Conversations"
        subtitle="Your sanctuary of past thoughts and reflections"
        rightAction={<Sola mood="calm" size={42} showGlow={false} />}
      />

      <View style={styles.container}>
        {/* Search Bar & New Chat Button Row */}
        <View style={styles.topControlRow}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search reflections by title..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
          <Button
            title="+ New Chat"
            variant="primary"
            size="md"
            style={styles.newChatBtn}
            onPress={handleNewChat}
          />
        </View>

        {/* Conversations List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Skeleton height={82} borderRadius={20} />
            <Skeleton height={82} borderRadius={20} />
            <Skeleton height={82} borderRadius={20} />
          </View>
        ) : filteredConversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyCenter}>
              <Sola mood="listening" size={110} showGlow={true} />
              <Text variant="title" style={styles.emptyTitle}>
                {searchQuery ? 'No matching reflections' : 'No chats yet. Say hi to Sola'}
              </Text>
              <Text variant="body" color={colors.textSecondary} style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Try searching with a different keyword or start a new conversation.'
                  : 'Sola is here whenever you want to talk, reflect, or simply be heard.'}
              </Text>

              <Button
                title={searchQuery ? 'Start a new conversation' : 'Start chat'}
                variant="primary"
                size="lg"
                style={styles.emptyActionBtn}
                onPress={handleNewChat}
              />
            </Animated.View>
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ConversationRow
                item={item}
                onPress={() => handleOpenConversation(item)}
                onDelete={handleDeleteWithUndo}
                onRename={handlePromptRename}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => {
                  void refetch();
                }}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </View>

      <Modal
        visible={renameTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCloseRename}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleCloseRename}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text variant="titleSm" style={styles.modalTitle}>
              Rename Conversation
            </Text>
            <Text variant="bodySm" color={colors.textSecondary} style={styles.modalSubtitle}>
              Choose a new title for this conversation:
            </Text>

            <TextInput
              style={styles.modalInput}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Conversation title"
              placeholderTextColor={colors.textMuted}
              autoFocus
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={handleSaveRename}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="ghost"
                size="md"
                style={styles.modalButton}
                onPress={handleCloseRename}
              />
              <Button
                title="Save"
                variant="primary"
                size="md"
                style={styles.modalButton}
                disabled={renameValue.trim().length === 0 || renameMutation.isPending}
                loading={renameMutation.isPending}
                onPress={handleSaveRename}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  topControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    height: 52,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  newChatBtn: {
    minWidth: 116,
    height: 52,
  },
  listContent: {
    paddingBottom: spacing['2xl'],
    gap: spacing.sm,
  },
  swipeRowWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(253, 232, 237, 0.4)',
  },
  hiddenActionArea: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteActionBtn: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(242, 107, 138, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  deleteActionText: {
    color: colors.error,
    fontFamily: 'Nunito_700Bold',
  },
  rowForeground: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
  },
  cardInner: {
    padding: spacing.md,
    borderRadius: 24,
  },
  pressedCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationTitle: {
    fontFamily: 'Nunito_700Bold',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  timeText: {
    fontSize: 12,
  },
  previewText: {
    lineHeight: 18,
  },
  loadingContainer: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyCenter: {
    alignItems: 'center',
    maxWidth: 360,
  },
  emptyTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  emptyActionBtn: {
    width: '100%',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 46, 0.32)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderRadius: 28,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 34,
    elevation: 12,
  },
  modalTitle: {
    fontFamily: 'Nunito_700Bold',
    color: colors.text,
  },
  modalSubtitle: {
    marginBottom: spacing.xs,
  },
  modalInput: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalButton: {
    minWidth: 100,
  },
});
