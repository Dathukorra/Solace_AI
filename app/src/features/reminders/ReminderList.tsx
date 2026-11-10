import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal, TextInput, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Card } from '../../components/Card';
import { PastelSwitch } from '../../components/PastelSwitch';
import { Sola } from '../../components/Sola';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { ReminderItem, ReminderType } from './types';
import { reminderService } from './reminderService';
import { syncPushTokenWithBackend } from './notificationService';
import { colors } from '../../theme/colors';
import { spacing, radii } from '../../theme/spacing';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const ReminderList: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [newDays, setNewDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [newType, setNewType] = useState<ReminderType>('MINDFULNESS');

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: reminderService.getReminders,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      reminderService.updateReminder(id, { enabled }),
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ['reminders'] });
      const previous = queryClient.getQueryData<ReminderItem[]>(['reminders']);
      queryClient.setQueryData<ReminderItem[]>(['reminders'], (old: ReminderItem[] = []) =>
        old.map((r) => (r.id === id ? { ...r, enabled } : r))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['reminders'], context.previous);
      }
      showToast({ message: 'Could not update reminder', variant: 'error' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: reminderService.createReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      setModalVisible(false);
      setNewTitle('');
      showToast({ message: 'Gentle reminder scheduled ✨', variant: 'success' });
    },
    onError: () => {
      showToast({ message: 'Failed to create reminder', variant: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: reminderService.deleteReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      showToast({ message: 'Reminder removed', variant: 'info' });
    },
  });

  const handleToggle = (id: string, currentEnabled: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    toggleMutation.mutate({ id, enabled: !currentEnabled });
  };

  const handleEnablePush = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const success = await syncPushTokenWithBackend();
      if (success) {
        showToast({ message: 'Push notifications connected 🕊️', variant: 'success' });
      } else {
        showToast({
          message: 'Notifications not permitted or on simulator',
          variant: 'info',
        });
      }
    } catch {
      showToast({ message: 'Could not enable notifications', variant: 'error' });
    }
  };

  const toggleDay = (dayIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setNewDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  const handleSaveReminder = () => {
    if (!newTitle.trim()) {
      showToast({ message: 'Please enter a reminder title', variant: 'info' });
      return;
    }
    if (newDays.length === 0) {
      showToast({ message: 'Select at least one day', variant: 'info' });
      return;
    }
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(newTime)) {
      showToast({ message: 'Enter time in HH:mm 24-hour format (e.g. 09:30)', variant: 'error' });
      return;
    }

    createMutation.mutate({
      title: newTitle.trim(),
      time: newTime,
      days: newDays,
      type: newType,
      enabled: true,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text variant="title">Daily Gentle Reminders</Text>
          <Text variant="caption" color={colors.textSecondary}>
            Sola will softly nudge you for mindful moments
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/reminders')}
          style={styles.addBtn}
          accessibilityRole="button"
          accessibilityLabel="Open Reminders screen"
        >
          <Text style={styles.addBtnText}>Setup ⚙️</Text>
        </Pressable>
      </View>

      {/* Push Notification Connection Card */}
      <Card variant="frosted" radius={20} shadow="sm" style={styles.pushCard}>
        <View style={styles.pushRow}>
          <Text style={styles.pushIcon}>🔔</Text>
          <View style={{ flex: 1, paddingRight: spacing[8] }}>
            <Text variant="bodyMedium">Device Notifications</Text>
            <Text variant="caption" color={colors.textSecondary}>
              Allow gentle chimes & daily affirmations on this device
            </Text>
          </View>
          <Button
            title="Enable"
            variant="secondary"
            size="sm"
            onPress={handleEnablePush}
            style={styles.enableBtn}
          />
        </View>
      </Card>

      {/* Reminders List */}
      {isLoading ? (
        <Text variant="body" color={colors.textMuted} style={styles.emptyText}>
          Loading your reminders...
        </Text>
      ) : reminders.length === 0 ? (
        <Card variant="frosted" radius={28} shadow="sm" style={styles.emptyCard}>
          <Sola mood="calm" size={84} showGlow={true} />
          <Text variant="bodyMedium" style={styles.emptyTitle}>
            Pick a time and Sola will nudge you gently
          </Text>
          <Text variant="caption" color={colors.textSecondary} style={styles.emptySubtitle}>
            Choose a mindful pause that fits your day — you can change it anytime.
          </Text>
          <Button
            title="Set a reminder"
            variant="primary"
            size="md"
            onPress={() => router.push('/reminders')}
            style={styles.emptyButton}
          />
        </Card>
      ) : (
        reminders.map((reminder) => (
          <Card
            key={reminder.id}
            variant="frosted"
            radius={20}
            shadow="sm"
            style={styles.reminderCard}
          >
            <View style={styles.reminderRow}>
              <View style={styles.info}>
                <View style={styles.titleLine}>
                  <Text
                    variant="bodyMedium"
                    color={reminder.enabled ? colors.text : colors.textMuted}
                  >
                    {reminder.title}
                  </Text>
                  <Text
                    variant="caption"
                    color={colors.primaryDark}
                    style={styles.typeTag}
                    numberOfLines={1}
                  >
                    {reminder.type}
                  </Text>
                </View>
                <Text variant="caption" color={colors.textSecondary}>
                  {reminder.time} •{' '}
                  {reminder.days?.length === 7
                    ? 'Every day'
                    : reminder.days?.map((d) => DAY_LABELS[d]).join(', ')}
                </Text>
              </View>

              <View style={styles.actions}>
                <View style={styles.switchTarget}>
                  <PastelSwitch
                    value={reminder.enabled}
                    onValueChange={() => handleToggle(reminder.id, reminder.enabled)}
                  />
                </View>
                <Pressable
                  onPress={() => deleteMutation.mutate(reminder.id)}
                  style={styles.deleteBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete reminder ${reminder.title}`}
                >
                  <Text style={styles.deleteIcon}>✕</Text>
                </Pressable>
              </View>
            </View>
          </Card>
        ))
      )}

      {/* New Reminder Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card variant="surface" radius={28} shadow="lg" style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text variant="titleSm" style={{ marginBottom: spacing[4] }}>
                New Gentle Reminder
              </Text>
              <Text
                variant="caption"
                color={colors.textSecondary}
                style={{ marginBottom: spacing[16] }}
              >
                Schedule a mindful moment with Sola
              </Text>

              {/* Title input */}
              <Text variant="caption" color={colors.textSecondary} style={styles.inputLabel}>
                Reminder Title
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Afternoon stretch & breath"
                placeholderTextColor={colors.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              {/* Time input */}
              <Text variant="caption" color={colors.textSecondary} style={styles.inputLabel}>
                Time (24h format, HH:mm)
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="09:00"
                placeholderTextColor={colors.textMuted}
                value={newTime}
                onChangeText={setNewTime}
                keyboardType="numbers-and-punctuation"
              />

              {/* Days selector */}
              <Text variant="caption" color={colors.textSecondary} style={styles.inputLabel}>
                Repeat Days
              </Text>
              <View style={styles.daysRow}>
                {DAY_LABELS.map((label, idx) => {
                  const isSelected = newDays.includes(idx);
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => toggleDay(idx)}
                      style={[styles.dayChip, isSelected && styles.dayChipSelected]}
                    >
                      <Text
                        variant="caption"
                        color={isSelected ? colors.textInverse : colors.text}
                        style={{ fontWeight: isSelected ? '600' : 'normal' }}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Type selector */}
              <Text variant="caption" color={colors.textSecondary} style={styles.inputLabel}>
                Type
              </Text>
              <View style={styles.typeChipsRow}>
                {(
                  [
                    'MINDFULNESS',
                    'BREATHING',
                    'CHECK_IN',
                    'GRATITUDE',
                    'HYDRATION',
                  ] as ReminderType[]
                ).map((t) => {
                  const isSelected = newType === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setNewType(t)}
                      style={[styles.typeChip, isSelected && styles.typeChipSelected]}
                    >
                      <Text
                        variant="caption"
                        color={isSelected ? colors.primaryDark : colors.textSecondary}
                      >
                        {t}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={() => setModalVisible(false)}
                  style={{ flex: 1, marginRight: spacing[8] }}
                />
                <Button
                  title="Schedule"
                  variant="primary"
                  onPress={handleSaveReminder}
                  loading={createMutation.isPending}
                  style={{ flex: 1, marginLeft: spacing[8] }}
                />
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing[16],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[12],
  },
  addBtn: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: radii.full,
    backgroundColor: 'rgba(243, 232, 251, 0.8)',
    borderWidth: 1.5,
    borderColor: colors.glassBorderSoft,
    minHeight: 44,
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  pushCard: {
    marginBottom: spacing[12],
    padding: spacing[12],
  },
  pushRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pushIcon: {
    fontSize: 24,
    marginRight: spacing[12],
  },
  enableBtn: {
    minWidth: 70,
  },
  reminderCard: {
    marginBottom: spacing[8],
    padding: spacing[12],
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  typeTag: {
    fontSize: 10,
    backgroundColor: 'rgba(166, 61, 232, 0.12)',
    paddingHorizontal: spacing[8],
    paddingVertical: 3,
    borderRadius: radii.full,
    marginLeft: spacing[8],
    overflow: 'hidden',
    flexShrink: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  switchTarget: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing[4],
  },
  deleteIcon: {
    fontSize: 16,
    color: colors.textMuted,
  },
  emptyCard: {
    padding: spacing[16],
    alignItems: 'center',
    gap: spacing[8],
  },
  emptyTitle: {
    textAlign: 'center',
    marginTop: spacing[8],
    fontFamily: 'Nunito_700Bold',
    color: colors.text,
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: spacing[8],
    minWidth: 180,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: spacing[16],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 46, 0.32)',
    justifyContent: 'center',
    padding: spacing[16],
  },
  modalCard: {
    maxHeight: '85%',
    padding: spacing[16],
  },
  inputLabel: {
    marginTop: spacing[12],
    marginBottom: spacing[4],
    fontWeight: '500',
  },
  textInput: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    borderRadius: radii[20],
    paddingHorizontal: spacing[12],
    fontSize: 15,
    color: colors.text,
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing[4],
  },
  dayChip: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  dayChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    marginTop: spacing[4],
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: spacing[4],
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
  },
  typeChipSelected: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primaryLight,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing[24],
    marginBottom: spacing[8],
  },
});
