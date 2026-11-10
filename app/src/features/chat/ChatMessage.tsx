import React from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Message, SuggestedActivity } from './types';
import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

interface ChatMessageProps {
  message: Message;
  onActivityPress?: (activity: SuggestedActivity) => void;
  onRetry?: (message: Message) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onActivityPress, onRetry }) => {
  const isUser = message.sender === 'user';
  const isError = message.status === 'error';

  const handleLongPress = () => {
    if (!message.content) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert('Message Options', message.content, [{ text: 'Done', style: 'cancel' }]);
  };

  const getActivityBadgeColor = (type: string) => {
    switch (type) {
      case 'breathing':
        return colors.moodColors.calm;
      case 'reflection':
        return colors.secondary;
      case 'affirmation':
        return colors.accent;
      default:
        return colors.primary;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'breathing':
        return '🌬️';
      case 'reflection':
        return '🪞';
      case 'affirmation':
        return '✨';
      default:
        return '🌿';
    }
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}
    >
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={({ pressed }) => [
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          isError && styles.errorBubble,
          pressed && styles.pressedBubble,
          shadows.sm,
        ]}
        accessibilityRole="text"
        accessibilityLabel={`${isUser ? 'You said' : 'Sola said'}: ${message.content}`}
      >
        <Text
          variant="body"
          color={isUser ? '#3D3550' : colors.text}
          style={[styles.text, isUser && styles.userText]}
        >
          {message.content}
        </Text>

        {/* Retry button on error */}
        {isError && (
          <View style={styles.errorRow}>
            <Text variant="captionSm" color={colors.error}>
              Could not send.
            </Text>
            {onRetry && (
              <Pressable onPress={() => onRetry(message)} hitSlop={8} style={styles.retryButton}>
                <Text variant="caption" color={colors.error} style={styles.retryText}>
                  Tap to retry ↺
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </Pressable>

      {/* Suggested Activity Inline Card */}
      {!isUser && message.suggestedActivity && (
        <View style={styles.activityCardWrapper}>
          <View style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <View
                style={[
                  styles.activityIconPill,
                  { backgroundColor: `${getActivityBadgeColor(message.suggestedActivity.type)}20` },
                ]}
              >
                <Text style={styles.activityEmoji}>
                  {getActivityIcon(message.suggestedActivity.type)}
                </Text>
              </View>
              <View style={styles.activityTitleBlock}>
                <Text variant="titleSm" style={styles.activityTitle}>
                  {message.suggestedActivity.title}
                </Text>
                <Text variant="captionSm" color={colors.textSecondary}>
                  {message.suggestedActivity.type.toUpperCase()}
                </Text>
              </View>
            </View>

            {message.suggestedActivity.reason ? (
              <Text variant="bodySm" color={colors.textSecondary} style={styles.activityReason}>
                {message.suggestedActivity.reason}
              </Text>
            ) : null}

            <Button
              title="Start Activity"
              variant="primary"
              size="sm"
              onPress={() => onActivityPress?.(message.suggestedActivity!)}
              style={styles.activityButton}
            />
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '84%',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  userBubble: {
    backgroundColor: 'rgba(166, 61, 232, 0.14)',
    borderBottomRightRadius: 8,
    borderColor: 'rgba(255, 255, 255, 0.62)',
    borderWidth: 1.5,
  },
  assistantBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.56)',
    borderBottomLeftRadius: 8,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
  },
  errorBubble: {
    backgroundColor: 'rgba(253, 232, 237, 0.76)',
    borderColor: 'rgba(242, 107, 138, 0.28)',
  },
  pressedBubble: {
    opacity: 0.9,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    fontFamily: 'Nunito_500Medium',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  retryButton: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  retryText: {
    fontFamily: 'Nunito_700Bold',
    textDecorationLine: 'underline',
  },
  activityCardWrapper: {
    maxWidth: '86%',
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  activityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 24,
    padding: spacing.md,
    borderColor: colors.glassBorder,
    borderWidth: 1.5,
    shadowColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  activityIconPill: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityEmoji: {
    fontSize: 20,
  },
  activityTitleBlock: {
    flex: 1,
  },
  activityTitle: {
    fontFamily: 'Nunito_700Bold',
    color: colors.text,
  },
  activityReason: {
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  activityButton: {
    marginTop: 2,
  },
});
