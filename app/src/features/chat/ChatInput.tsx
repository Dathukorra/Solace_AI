import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { IconButton } from '../../components/IconButton';
import { Text } from '../../components/Text';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  onTypingStateChange?: (isTyping: boolean) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled, onTypingStateChange }) => {
  const [text, setText] = useState('');

  const handleTextChange = (val: string) => {
    setText(val);
    onTypingStateChange?.(val.trim().length > 0);
  };

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const toSend = text.trim();
    setText('');
    onTypingStateChange?.(false);
    onSend(toSend);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Talk with Sola..."
        placeholderTextColor={colors.textMuted}
        value={text}
        onChangeText={handleTextChange}
        multiline
        editable={!disabled}
        maxLength={1000}
      />
      <IconButton
        icon={<Text style={styles.sendIcon}>↑</Text>}
        onPress={handleSend}
        disabled={!text.trim() || disabled}
        accessibilityLabel="Send message"
        variant="primary"
        size="sm"
        style={styles.sendBtn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderTopWidth: 1.5,
    borderTopColor: colors.glassBorder,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
  },
  sendBtn: {
    marginBottom: 4,
  },
  sendIcon: {
    color: colors.textInverse,
    fontSize: 18,
    fontWeight: '700',
  },
});
