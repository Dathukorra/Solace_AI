import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, FlatList, View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Screen } from '../../components/Screen';
import { Header } from '../../components/Header';
import { Sola, SolaMood } from '../../components/Sola';
import { ThoughtBubble } from '../../components/ThoughtBubble';
import { ChatMessage } from '../../features/chat/ChatMessage';
import { ChatInput } from '../../features/chat/ChatInput';
import { useChat } from '../../features/chat/useChat';
import { Text } from '../../components/Text';
import { Skeleton } from '../../components/Skeleton';
import { SuggestedActivity, Message, StarterPrompt } from '../../features/chat/types';
import { useQuery } from '@tanstack/react-query';
import { homeService } from '../../features/home/homeService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export default function ChatScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const {
    initialPrompt,
    activityCompleted,
    conversationId: paramConvId,
    newChat,
    t,
  } = useLocalSearchParams<{
    initialPrompt?: string;
    activityCompleted?: string;
    conversationId?: string;
    newChat?: string;
    t?: string;
  }>();

  const isNewChat = newChat === 'true';
  const {
    messages,
    isTyping,
    isReplying,
    isLoadingHistory,
    setIsTyping,
    sendMessage,
    addAssistantFollowup,
  } = useChat(isNewChat ? undefined : paramConvId, isNewChat, t);

  // Fetch today's mood for contextual starter prompts
  const { data: homeData } = useQuery({
    queryKey: ['homeDashboard'],
    queryFn: () => homeService.getHomeDashboard(),
  });

  // Handle auto-send initialPrompt if directed from mood check-in
  const lastSentPromptRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialPrompt && initialPrompt !== lastSentPromptRef.current && !isLoadingHistory) {
      lastSentPromptRef.current = initialPrompt;
      void sendMessage(initialPrompt);
    }
  }, [initialPrompt, isLoadingHistory, sendMessage]);

  // Handle returning from a completed activity
  useEffect(() => {
    if (activityCompleted) {
      addAssistantFollowup(
        `Welcome back. How did that ${activityCompleted} feel for your body and mind?`
      );
    }
  }, [activityCompleted, addAssistantFollowup]);

  // Auto-scroll on new message or streaming tokens
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Dynamic mascot state:
  // - listening while user types
  // - thinking while waiting for AI
  // - calm while replying or idle
  const getSolaMood = (): SolaMood => {
    if (isTyping) return 'listening';
    if (isReplying) return 'thinking';
    return 'calm';
  };

  // 3 Gentle starter prompts tailored to today's mood
  const starterPrompts: StarterPrompt[] = useMemo(() => {
    const moodScore = homeData?.todayCheckin?.mood ?? 3;
    if (moodScore <= 2) {
      return [
        {
          id: 'p1',
          text: 'Things feel a bit heavy right now. Can we talk through it?',
          emoji: '🌧️',
        },
        {
          id: 'p2',
          text: 'I feel exhausted and could use a moment of quiet encouragement.',
          emoji: '🕊️',
        },
        {
          id: 'p3',
          text: 'Do you have a small, gentle practice to help ease my mind?',
          emoji: '🌱',
        },
      ];
    } else if (moodScore >= 4) {
      return [
        {
          id: 'p1',
          text: 'I am feeling grounded today. How can I carry this lightness forward?',
          emoji: '☀️',
        },
        {
          id: 'p2',
          text: 'Something went well today and I would love to celebrate it with you.',
          emoji: '✨',
        },
        {
          id: 'p3',
          text: 'What is a thoughtful reflection prompt for today?',
          emoji: '🌿',
        },
      ];
    } else {
      return [
        {
          id: 'p1',
          text: 'Just checking in. What are you thinking about right now?',
          emoji: '☕',
        },
        {
          id: 'p2',
          text: 'Help me take a quick 2-minute pause to reset my focus.',
          emoji: '🌬️',
        },
        {
          id: 'p3',
          text: 'I have a lot on my mind. Can I unpack something with you?',
          emoji: '💬',
        },
      ];
    }
  }, [homeData?.todayCheckin?.mood]);

  const handlePromptPress = (text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    void sendMessage(text);
  };

  const handleActivityPress = (activity: SuggestedActivity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (activity.type === 'breathing') {
      router.push({
        pathname: '/breathing',
        params: { returnTo: 'chat' },
      });
    } else {
      router.push({
        pathname: '/(tabs)/activities',
        params: { activityType: activity.type, returnTo: 'chat' },
      });
    }
  };

  const handleRetry = (failedMsg: Message) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    void sendMessage(failedMsg.content, failedMsg.id);
  };

  return (
    <Screen keyboardAvoiding edges={['top', 'left', 'right']}>
      {/* Sola Mascot Header */}
      <Header
        title="Solace AI"
        subtitle="Warm, gentle, always here to listen"
        leftAction={
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              router.push('/(tabs)/conversations');
            }}
            hitSlop={10}
            style={styles.historyBtn}
            accessibilityRole="button"
            accessibilityLabel="View conversations history"
          >
            <Text style={styles.historyIcon}>📋</Text>
          </Pressable>
        }
        rightAction={<Sola mood={getSolaMood()} size={46} showGlow={true} />}
      />

      {/* Messages or Empty Starter State */}
      {isLoadingHistory ? (
        <View style={styles.loadingContainer}>
          <Skeleton width={180} height={44} borderRadius={18} style={styles.skeletonItem} />
          <Skeleton width={220} height={56} borderRadius={18} style={styles.skeletonItemRight} />
          <Skeleton width={160} height={40} borderRadius={18} style={styles.skeletonItem} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.emptyCenter}>
            <Sola mood="listening" size={100} showGlow={true} />
            <ThoughtBubble style={styles.thoughtBubble} minHeight={104}>
              <Text variant="title" style={styles.emptyTitle}>
                How is your heart today?
              </Text>
              <Text variant="body" color={colors.textSecondary} style={styles.emptySubtitle}>
                I'm here to listen, reflect, or just sit with whatever you're feeling.
              </Text>
            </ThoughtBubble>
          </Animated.View>

          {/* 3 Gentle Starter Prompts */}
          <View style={styles.starterPromptsList}>
            <Text variant="caption" color={colors.textMuted} style={styles.starterEyebrow}>
              GENTLE STARTERS
            </Text>
            {starterPrompts.map((p, idx) => (
              <Animated.View key={p.id} entering={FadeInDown.delay(idx * 90).duration(350)}>
                <Pressable
                  onPress={() => handlePromptPress(p.text)}
                  style={({ pressed }) => [styles.promptCard, pressed && styles.pressedPrompt]}
                  accessibilityRole="button"
                  accessibilityLabel={p.text}
                >
                  <Text style={styles.promptEmoji}>{p.emoji}</Text>
                  <Text variant="bodyMedium" style={styles.promptText}>
                    {p.text}
                  </Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatMessage
              message={item}
              onActivityPress={handleActivityPress}
              onRetry={handleRetry}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isReplying ? (
              <View style={styles.typingContainer}>
                <Text variant="caption" color={colors.textSecondary} style={styles.typingText}>
                  Solace is reflecting...
                </Text>
                <Skeleton width={140} height={14} borderRadius={8} />
              </View>
            ) : null
          }
        />
      )}

      {/* Keyboard-avoiding Input */}
      <ChatInput
        onSend={(text) => void sendMessage(text)}
        disabled={isReplying || isLoadingHistory}
        onTypingStateChange={setIsTyping}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  skeletonItem: {
    alignSelf: 'flex-start',
  },
  skeletonItemRight: {
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  emptyCenter: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  thoughtBubble: {
    marginTop: -6,
  },
  emptyTitle: {
    textAlign: 'center',
    fontFamily: 'Nunito_800ExtraBold',
    color: colors.text,
  },
  emptySubtitle: {
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
    lineHeight: 22,
  },
  starterPromptsList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  starterEyebrow: {
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 0.8,
    marginBottom: 2,
    paddingHorizontal: spacing.xs,
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.52)',
    borderRadius: 22,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  pressedPrompt: {
    opacity: 0.7,
  },
  promptEmoji: {
    fontSize: 20,
  },
  promptText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  typingContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  typingText: {
    fontStyle: 'italic',
  },
  historyBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
  },
  historyIcon: {
    fontSize: 18,
  },
});
