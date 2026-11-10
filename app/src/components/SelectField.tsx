import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii, spacing } from '../theme/spacing';
import { Card } from './Card';
import { Text } from './Text';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectFieldProps<T extends string> {
  label: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  modalTitle?: string;
  containerStyle?: ViewStyle;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  error,
  helperText,
  disabled = false,
  modalTitle,
  containerStyle,
}: SelectFieldProps<T>) {
  const [visible, setVisible] = useState(false);

  const selected = options.find((option) => option.value === value);

  const open = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setVisible(true);
  };

  const select = (next: T) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onChange(next);
    setVisible(false);
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Text variant="caption" color={colors.textSecondary} style={styles.label}>
        {label}
      </Text>

      <Pressable
        onPress={open}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        accessibilityState={{ disabled, expanded: visible }}
        style={[styles.field, !!error && styles.fieldError, disabled && styles.fieldDisabled]}
      >
        <Text
          variant="body"
          color={selected ? colors.text : colors.textMuted}
          style={styles.value}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      {error ? (
        <Text variant="caption" color={colors.error} style={styles.helper}>
          {error}
        </Text>
      ) : helperText ? (
        <Text variant="caption" color={colors.textMuted} style={styles.helper}>
          {helperText}
        </Text>
      ) : null}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <Card variant="surface" radius={24} shadow="lg" style={styles.modalCard}>
            <Text variant="titleSm" style={styles.modalTitle}>
              {modalTitle ?? label}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.optionsScroll}>
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => select(option.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={option.label}
                    style={({ pressed }) => [
                      styles.option,
                      isSelected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <Text
                      variant="body"
                      color={isSelected ? colors.primaryDark : colors.text}
                      style={isSelected && styles.optionTextSelected}
                    >
                      {option.label}
                    </Text>
                    {isSelected && <Text style={styles.check}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={() => setVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeButton}
            >
              <Text variant="bodyMedium" color={colors.textSecondary}>
                Close
              </Text>
            </Pressable>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing[16],
  },
  label: {
    fontFamily: fonts.body.medium,
    marginBottom: spacing[4],
    marginLeft: spacing[4],
  },
  field: {
    minHeight: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    borderRadius: radii[20],
    paddingHorizontal: spacing[16],
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldError: {
    borderColor: colors.error,
  },
  fieldDisabled: {
    opacity: 0.5,
    backgroundColor: colors.surface,
  },
  value: {
    flex: 1,
    fontFamily: fonts.body.regular,
  },
  chevron: {
    fontSize: 16,
    color: colors.textMuted,
    marginLeft: spacing[8],
  },
  helper: {
    marginTop: spacing[4],
    marginLeft: spacing[4],
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 46, 0.32)',
    justifyContent: 'center',
    padding: spacing[16],
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    padding: spacing[16],
  },
  modalTitle: {
    color: colors.text,
    marginBottom: spacing[12],
  },
  optionsScroll: {
    maxHeight: 320,
  },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    borderRadius: radii[16],
    marginBottom: spacing[8],
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    borderWidth: 1.5,
    borderColor: colors.glassBorderSoft,
  },
  optionSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  optionPressed: {
    opacity: 0.75,
  },
  optionTextSelected: {
    fontFamily: fonts.body.semiBold,
  },
  check: {
    fontSize: 16,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  closeButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
});
