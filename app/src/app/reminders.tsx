import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { PastelSwitch } from '../components/PastelSwitch';
import { Sola } from '../components/Sola';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { reminderService } from '../features/reminders/reminderService';
import {
  rescheduleLocalReminders,
  isTimeInQuietHours,
  syncPushTokenWithBackend,
} from '../features/reminders/notificationService';
import { ReminderItem, ReminderType, QuietHoursConfig } from '../features/reminders/types';
import { colors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';

const MASTER_TOGGLE_KEY = 'solace_master_reminders_enabled';
const QUIET_HOURS_ENABLED_KEY = 'solace_quiet_hours_enabled';
const QUIET_HOURS_START_KEY = 'solace_quiet_hours_start';
const QUIET_HOURS_END_KEY = 'solace_quiet_hours_end';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const CORE_TYPES: {
  type: ReminderType;
  title: string;
  defaultTime: string;
  defaultDays: number[];
  emoji: string;
  description: string;
}[] = [
  {
    type: 'MOOD',
    title: 'Daily mood check-in',
    defaultTime: '09:00',
    defaultDays: [0, 1, 2, 3, 4, 5, 6],
    emoji: '🕊️',
    description: 'Notice how you feel and find your daily center.',
  },
  {
    type: 'AFFIRMATION',
    title: 'Today’s affirmation',
    defaultTime: '11:00',
    defaultDays: [1, 2, 3, 4, 5],
    emoji: '✨',
    description: 'A gentle, grounding thought for your mindset.',
  },
  {
    type: 'BREATHING',
    title: 'Guided breathing pause',
    defaultTime: '14:30',
    defaultDays: [1, 2, 3, 4, 5],
    emoji: '🌬️',
    description: 'Release physical tension with rhythmic breathwork.',
  },
  {
    type: 'SELFCARE',
    title: 'Self-care challenge',
    defaultTime: '19:00',
    defaultDays: [0, 1, 2, 3, 4, 5, 6],
    emoji: '🌿',
    description: 'A small nourishing step for your body and spirit.',
  },
];

export function formatFriendlyTime(time24: string): string {
  if (!time24) return '09:00 AM';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : `${m}`;
  return `${displayH}:${displayM} ${period}`;
}

export default function RemindersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Master switch state
  const [masterEnabled, setMasterEnabled] = useState(true);

  // Quiet hours configuration
  const [quietHours, setQuietHours] = useState<QuietHoursConfig>({
    enabled: true,
    start: '22:00',
    end: '07:00',
  });

  // Time picker modal state
  const [timePickerTarget, setTimePickerTarget] = useState<{
    id: string; // reminder id or 'quiet-start' or 'quiet-end' or 'custom'
    title: string;
    initialTime: string;
  } | null>(null);

  const [pickerHour, setPickerHour] = useState(9);
  const [pickerMinute, setPickerMinute] = useState(0);

  // Add custom reminder modal state
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customTime, setCustomTime] = useState('16:00');
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Load preferences from SecureStore on mount
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const [master, qEnabled, qStart, qEnd] = await Promise.all([
          SecureStore.getItemAsync(MASTER_TOGGLE_KEY),
          SecureStore.getItemAsync(QUIET_HOURS_ENABLED_KEY),
          SecureStore.getItemAsync(QUIET_HOURS_START_KEY),
          SecureStore.getItemAsync(QUIET_HOURS_END_KEY),
        ]);

        if (master !== null) setMasterEnabled(master === 'true');
        setQuietHours({
          enabled: qEnabled !== null ? qEnabled === 'true' : true,
          start: qStart || '22:00',
          end: qEnd || '07:00',
        });
      } catch {
        // Fallback defaults
      }
    };
    void loadPrefs();
  }, []);

  // Fetch reminders list from API
  const { data: serverReminders = [], isLoading } = useQuery<ReminderItem[]>({
    queryKey: ['reminders'],
    queryFn: reminderService.getReminders,
  });

  // Automatically seed default 4 core reminders if they do not yet exist on the server
  const seededRef = React.useRef(false);
  useEffect(() => {
    if (isLoading || seededRef.current) return;
    seededRef.current = true;

    const existingTypes = new Set(serverReminders.map((r) => r.type));
    const missingCore = CORE_TYPES.filter((c) => !existingTypes.has(c.type));

    if (missingCore.length > 0) {
      const seedMissing = async () => {
        for (const item of missingCore) {
          try {
            await reminderService.createReminder({
              type: item.type,
              title: item.title,
              time: item.defaultTime,
              days: item.defaultDays,
              enabled: true,
            });
          } catch {
            // Ignore
          }
        }
        void queryClient.invalidateQueries({ queryKey: ['reminders'] });
      };
      void seedMissing();
    }
  }, [isLoading, serverReminders, queryClient]);

  // Reschedule local notifications whenever reminders or quiet hours or master toggle changes
  const triggerReschedule = useCallback(
    async (remindersList: ReminderItem[], isMaster: boolean, qHours: QuietHoursConfig) => {
      await rescheduleLocalReminders(remindersList, isMaster, qHours);
    },
    []
  );

  useEffect(() => {
    if (serverReminders.length > 0) {
      void triggerReschedule(serverReminders, masterEnabled, quietHours);
    }
  }, [serverReminders, masterEnabled, quietHours, triggerReschedule]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ReminderItem> }) =>
      reminderService.updateReminder(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: ['reminders'] });
      const previous = queryClient.getQueryData<ReminderItem[]>(['reminders']);
      const updated = (previous || []).map((r) => (r.id === id ? { ...r, ...input } : r));
      queryClient.setQueryData(['reminders'], updated);
      void triggerReschedule(updated, masterEnabled, quietHours);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['reminders'], context.previous);
        void triggerReschedule(context.previous, masterEnabled, quietHours);
      }
      showToast({ message: 'Could not sync reminder change', variant: 'error' });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: reminderService.createReminder,
    onSuccess: (newReminder) => {
      const updated = [...serverReminders, newReminder];
      queryClient.setQueryData(['reminders'], updated);
      void triggerReschedule(updated, masterEnabled, quietHours);
      setCustomModalVisible(false);
      setCustomTitle('');
      showToast({ message: 'Custom reminder scheduled ✨', variant: 'success' });
    },
    onError: () => {
      showToast({ message: 'Could not create reminder', variant: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: reminderService.deleteReminder,
    onSuccess: (_data, id) => {
      const updated = serverReminders.filter((r) => r.id !== id);
      queryClient.setQueryData(['reminders'], updated);
      void triggerReschedule(updated, masterEnabled, quietHours);
      showToast({ message: 'Reminder removed', variant: 'info' });
    },
  });

  // Handlers
  const handleToggleMaster = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setMasterEnabled(val);
    await SecureStore.setItemAsync(MASTER_TOGGLE_KEY, String(val)).catch(() => {});
    await triggerReschedule(serverReminders, val, quietHours);
    showToast({
      message: val ? 'Reminders active ✨' : 'All reminders silenced',
      variant: 'info',
    });
  };

  const handleToggleQuietHours = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = { ...quietHours, enabled: val };
    setQuietHours(next);
    await SecureStore.setItemAsync(QUIET_HOURS_ENABLED_KEY, String(val)).catch(() => {});
    await triggerReschedule(serverReminders, masterEnabled, next);
  };

  const handleToggleReminderSwitch = (reminder: ReminderItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    updateMutation.mutate({
      id: reminder.id,
      input: { enabled: !reminder.enabled },
    });
  };

  const handleToggleDay = (reminder: ReminderItem, dayIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const currentDays = reminder.days || [];
    let nextDays: number[];
    if (currentDays.includes(dayIndex)) {
      if (currentDays.length === 1) {
        showToast({ message: 'Select at least one day', variant: 'info' });
        return;
      }
      nextDays = currentDays.filter((d) => d !== dayIndex);
    } else {
      nextDays = [...currentDays, dayIndex].sort();
    }
    updateMutation.mutate({
      id: reminder.id,
      input: { days: nextDays },
    });
  };

  const openTimePicker = (target: { id: string; title: string; initialTime: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const [h, m] = target.initialTime.split(':').map((v) => parseInt(v, 10));
    setPickerHour(isNaN(h) ? 9 : h);
    setPickerMinute(isNaN(m) ? 0 : m);
    setTimePickerTarget(target);
  };

  const saveTimePicker = async () => {
    if (!timePickerTarget) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const hStr = pickerHour < 10 ? `0${pickerHour}` : `${pickerHour}`;
    const mStr = pickerMinute < 10 ? `0${pickerMinute}` : `${pickerMinute}`;
    const formatted = `${hStr}:${mStr}`;

    if (timePickerTarget.id === 'quiet-start') {
      const next = { ...quietHours, start: formatted };
      setQuietHours(next);
      await SecureStore.setItemAsync(QUIET_HOURS_START_KEY, formatted).catch(() => {});
      await triggerReschedule(serverReminders, masterEnabled, next);
    } else if (timePickerTarget.id === 'quiet-end') {
      const next = { ...quietHours, end: formatted };
      setQuietHours(next);
      await SecureStore.setItemAsync(QUIET_HOURS_END_KEY, formatted).catch(() => {});
      await triggerReschedule(serverReminders, masterEnabled, next);
    } else if (timePickerTarget.id === 'custom') {
      setCustomTime(formatted);
    } else {
      // Server reminder item
      updateMutation.mutate({
        id: timePickerTarget.id,
        input: { time: formatted },
      });
    }

    setTimePickerTarget(null);
  };

  const handleSaveCustomReminder = () => {
    if (!customTitle.trim()) {
      showToast({ message: 'Please give your reminder a title', variant: 'info' });
      return;
    }
    if (customDays.length === 0) {
      showToast({ message: 'Select at least one day to repeat', variant: 'info' });
      return;
    }

    createMutation.mutate({
      title: customTitle.trim(),
      time: customTime,
      days: customDays,
      type: 'CUSTOM',
      enabled: true,
    });
  };

  // Split reminders into core types and custom types
  const coreReminders = useMemo(() => {
    return CORE_TYPES.map((core) => {
      const found = serverReminders.find((r) => r.type === core.type);
      return {
        core,
        reminder: found,
      };
    });
  }, [serverReminders]);

  const customReminders = useMemo(() => {
    const coreSet = new Set(CORE_TYPES.map((c) => c.type));
    return serverReminders.filter((r) => !coreSet.has(r.type));
  }, [serverReminders]);

  return (
    <Screen scrollable contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <Header
        title="Gentle Reminders"
        subtitle="Mindful pauses, breathwork & affirmations"
        leftAction={
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backBtnText}>‹ Back</Text>
          </Pressable>
        }
      />

      {/* 1. Master Toggle Card */}
      <Card variant="frosted" radius={28} shadow="sm" style={styles.masterCard}>
        <View style={styles.masterRow}>
          <View style={styles.masterInfo}>
            <View style={styles.titleWithIcon}>
              <Text style={styles.masterEmoji}>🔔</Text>
              <Text variant="titleSm">Enable Gentle Reminders</Text>
            </View>
            <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
              {masterEnabled
                ? 'Sola will softly chime at your chosen mindful times'
                : 'All mindful notifications are currently silenced'}
            </Text>
          </View>
          <View style={styles.switchTarget}>
            <PastelSwitch value={masterEnabled} onValueChange={handleToggleMaster} />
          </View>
        </View>
      </Card>

      {/* 2. Quiet Hours Card */}
      <Card variant="surface" radius={28} shadow="sm" style={styles.quietHoursCard}>
        <View style={styles.quietRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleWithIcon}>
              <Text style={styles.quietEmoji}>🌙</Text>
              <Text variant="titleSm">Quiet Hours</Text>
            </View>
            <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
              Silence all chimes during your restful sleep or focus window
            </Text>
          </View>
          <View style={styles.switchTarget}>
            <PastelSwitch value={quietHours.enabled} onValueChange={handleToggleQuietHours} />
          </View>
        </View>

        {quietHours.enabled && (
          <View style={styles.quietTimesRow}>
            <Pressable
              onPress={() =>
                openTimePicker({
                  id: 'quiet-start',
                  title: 'Quiet Hours Start',
                  initialTime: quietHours.start,
                })
              }
              style={styles.quietTimePill}
              accessibilityRole="button"
              accessibilityLabel="Quiet hours start time"
            >
              <Text variant="caption" color={colors.textMuted}>
                Start:
              </Text>
              <Text variant="bodySm" color={colors.primaryDark} style={styles.pillTimeText}>
                {formatFriendlyTime(quietHours.start)}
              </Text>
            </Pressable>

            <Text variant="caption" color={colors.textMuted}>
              until
            </Text>

            <Pressable
              onPress={() =>
                openTimePicker({
                  id: 'quiet-end',
                  title: 'Quiet Hours End',
                  initialTime: quietHours.end,
                })
              }
              style={styles.quietTimePill}
              accessibilityRole="button"
              accessibilityLabel="Quiet hours end time"
            >
              <Text variant="caption" color={colors.textMuted}>
                Wake:
              </Text>
              <Text variant="bodySm" color={colors.primaryDark} style={styles.pillTimeText}>
                {formatFriendlyTime(quietHours.end)}
              </Text>
            </Pressable>
          </View>
        )}
      </Card>

      {/* 3. Core Reminder Types Section */}
      <Text variant="title" style={styles.sectionHeading}>
        Mindful Routine Pauses
      </Text>

      {coreReminders.map(({ core, reminder }) => {
        const isEnabled = reminder?.enabled ?? true;
        const timeStr = reminder?.time ?? core.defaultTime;
        const days = reminder?.days ?? core.defaultDays;
        const inQuiet =
          quietHours.enabled && isTimeInQuietHours(timeStr, quietHours.start, quietHours.end);

        return (
          <Card key={core.type} variant="frosted" radius={28} shadow="sm" style={styles.itemCard}>
            {/* Top row: Title, Emoji, and Switch */}
            <View style={styles.itemTopRow}>
              <View style={styles.itemHeaderLeft}>
                <Text style={styles.coreEmoji}>{core.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSm" color={isEnabled ? colors.text : colors.textMuted}>
                    {core.title}
                  </Text>
                  <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
                    {core.description}
                  </Text>
                </View>
              </View>

              <View style={styles.switchTarget}>
                <PastelSwitch
                  value={isEnabled}
                  disabled={!reminder}
                  onValueChange={() => reminder && handleToggleReminderSwitch(reminder)}
                />
              </View>
            </View>

            {/* Middle row: Time Picker Button & Quiet Hours Alert */}
            <View style={styles.timeActionRow}>
              <Pressable
                onPress={() =>
                  reminder &&
                  openTimePicker({
                    id: reminder.id,
                    title: core.title,
                    initialTime: timeStr,
                  })
                }
                style={styles.timePickerButton}
                accessibilityRole="button"
                accessibilityLabel={`Change time for ${core.title}`}
              >
                <Text style={styles.timeClockIcon}>⏰</Text>
                <Text variant="bodyMedium" color={colors.primaryDark} style={styles.timePickerText}>
                  {formatFriendlyTime(timeStr)}
                </Text>
                <Text variant="caption" color={colors.textMuted} style={{ marginLeft: 6 }}>
                  (Edit)
                </Text>
              </Pressable>

              {inQuiet && (
                <View style={styles.quietBadge}>
                  <Text style={styles.quietBadgeText}>🌙 In Quiet Hours</Text>
                </View>
              )}
            </View>

            {/* Bottom row: Weekday selector chips */}
            <View style={styles.daysContainer}>
              <Text variant="caption" color={colors.textMuted} style={styles.repeatLabel}>
                Repeat:
              </Text>
              <View style={styles.daysRow}>
                {DAY_LABELS.map((label, idx) => {
                  const isSelected = days.includes(idx);
                  return (
                    <Pressable
                      key={idx}
                      disabled={!reminder}
                      onPress={() => reminder && handleToggleDay(reminder, idx)}
                      style={[
                        styles.dayChip,
                        isSelected && styles.dayChipSelected,
                        !isEnabled && styles.dayChipDisabled,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Repeat on ${label}`}
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
            </View>
          </Card>
        );
      })}

      {/* 4. Custom Reminders Section */}
      <View style={styles.customHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text variant="title">Custom Reminders</Text>
          <Text variant="caption" color={colors.textSecondary}>
            Personalized mindful check-ins & water pauses
          </Text>
        </View>
        {customReminders.length > 0 && (
          <Button
            title="+ Add Custom"
            variant="secondary"
            size="sm"
            onPress={() => setCustomModalVisible(true)}
          />
        )}
      </View>

      {customReminders.length === 0 ? (
        <Card variant="surface" radius={28} shadow="sm" style={styles.emptyCustomCard}>
          <Sola mood="calm" size={84} showGlow={true} />
          <Text variant="titleSm" align="center" style={styles.emptyCustomTitle}>
            Pick a time and Sola will nudge you gently
          </Text>
          <Text variant="caption" color={colors.textSecondary} align="center">
            Create one gentle pause that fits your day. You can change or silence it anytime.
          </Text>
          <Button
            title="Add a reminder"
            variant="primary"
            size="md"
            onPress={() => setCustomModalVisible(true)}
            style={styles.emptyCustomButton}
          />
        </Card>
      ) : (
        customReminders.map((reminder) => {
          const inQuiet =
            quietHours.enabled &&
            isTimeInQuietHours(reminder.time, quietHours.start, quietHours.end);

          return (
            <Card
              key={reminder.id}
              variant="frosted"
              radius={28}
              shadow="sm"
              style={styles.itemCard}
            >
              <View style={styles.itemTopRow}>
                <View style={styles.itemHeaderLeft}>
                  <Text style={styles.coreEmoji}>💛</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      variant="titleSm"
                      color={reminder.enabled ? colors.text : colors.textMuted}
                    >
                      {reminder.title}
                    </Text>
                    <Text variant="caption" color={colors.primaryDark}>
                      Custom Reminder
                    </Text>
                  </View>
                </View>

                <View style={styles.actionsRight}>
                  <View style={styles.switchTarget}>
                    <PastelSwitch
                      value={reminder.enabled}
                      onValueChange={() => handleToggleReminderSwitch(reminder)}
                    />
                  </View>
                  <Pressable
                    onPress={() => deleteMutation.mutate(reminder.id)}
                    style={styles.deleteBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete reminder ${reminder.title}`}
                  >
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </Pressable>
                </View>
              </View>

              {/* Time picker button & quiet hours alert */}
              <View style={styles.timeActionRow}>
                <Pressable
                  onPress={() =>
                    openTimePicker({
                      id: reminder.id,
                      title: reminder.title,
                      initialTime: reminder.time,
                    })
                  }
                  style={styles.timePickerButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Change time for ${reminder.title}`}
                >
                  <Text style={styles.timeClockIcon}>⏰</Text>
                  <Text
                    variant="bodyMedium"
                    color={colors.primaryDark}
                    style={styles.timePickerText}
                  >
                    {formatFriendlyTime(reminder.time)}
                  </Text>
                  <Text variant="caption" color={colors.textMuted} style={{ marginLeft: 6 }}>
                    (Edit)
                  </Text>
                </Pressable>

                {inQuiet && (
                  <View style={styles.quietBadge}>
                    <Text style={styles.quietBadgeText}>🌙 In Quiet Hours</Text>
                  </View>
                )}
              </View>

              {/* Weekday chips */}
              <View style={styles.daysContainer}>
                <Text variant="caption" color={colors.textMuted} style={styles.repeatLabel}>
                  Repeat:
                </Text>
                <View style={styles.daysRow}>
                  {DAY_LABELS.map((label, idx) => {
                    const isSelected = reminder.days?.includes(idx);
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => handleToggleDay(reminder, idx)}
                        style={[styles.dayChip, isSelected && styles.dayChipSelected]}
                        accessibilityRole="button"
                        accessibilityLabel={`Repeat on ${label}`}
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
              </View>
            </Card>
          );
        })
      )}

      {/* Push Token Connection Reminder Banner */}
      <Card variant="surface" radius={28} shadow="sm" style={styles.deviceBanner}>
        <Text style={styles.deviceBannerEmoji}>🕊️</Text>
        <View style={{ flex: 1, paddingHorizontal: spacing[8] }}>
          <Text variant="bodySm" style={{ fontWeight: '600' }}>
            Offline & Local Reliability
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            Solace AI schedules local alarms with expo-notifications so gentle reminders continue to
            chime even without an internet connection.
          </Text>
        </View>
        <Button
          title="Connect"
          variant="secondary"
          size="sm"
          onPress={async () => {
            const ok = await syncPushTokenWithBackend();
            showToast({
              message: ok ? 'Device connected 🕊️' : 'Notifications ready',
              variant: 'success',
            });
          }}
        />
      </Card>

      <View style={{ height: spacing[32] }} />

      {/* ─── Modal 1: In-App Time Picker ───────────────────────────────────── */}
      <Modal
        visible={timePickerTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTimePickerTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <Card variant="surface" radius={28} shadow="lg" style={styles.pickerModalCard}>
            <Text variant="titleSm" align="center" style={{ marginBottom: spacing[4] }}>
              Set Reminder Time
            </Text>
            <Text
              variant="caption"
              color={colors.textSecondary}
              align="center"
              style={{ marginBottom: spacing[16] }}
            >
              {timePickerTarget?.title}
            </Text>

            {/* Time Display Header */}
            <View style={styles.pickerDisplayRow}>
              <Text variant="display" color={colors.primaryDark} style={styles.pickerBigTime}>
                {pickerHour < 10 ? `0${pickerHour}` : `${pickerHour}`}:
                {pickerMinute < 10 ? `0${pickerMinute}` : `${pickerMinute}`}
              </Text>
              <Text variant="titleSm" color={colors.textSecondary} style={{ marginLeft: 8 }}>
                ({pickerHour >= 12 ? 'PM' : 'AM'})
              </Text>
            </View>

            {/* Hour Selector Slider / Buttons */}
            <Text variant="caption" color={colors.textMuted} style={styles.pickerLabel}>
              Hour (0 – 23)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.pickerScroll}
            >
              {Array.from({ length: 24 }).map((_, h) => {
                const isSelected = pickerHour === h;
                return (
                  <Pressable
                    key={h}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setPickerHour(h);
                    }}
                    style={[styles.timeSlotPill, isSelected && styles.timeSlotPillSelected]}
                  >
                    <Text
                      variant="bodySm"
                      color={isSelected ? colors.textInverse : colors.text}
                      style={{ fontWeight: isSelected ? '600' : 'normal' }}
                    >
                      {h < 10 ? `0${h}` : `${h}`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Minute Selector */}
            <Text variant="caption" color={colors.textMuted} style={styles.pickerLabel}>
              Minute
            </Text>
            <View style={styles.minuteRow}>
              {[0, 15, 30, 45].map((m) => {
                const isSelected = pickerMinute === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setPickerMinute(m);
                    }}
                    style={[styles.minutePill, isSelected && styles.minutePillSelected]}
                  >
                    <Text
                      variant="bodySm"
                      color={isSelected ? colors.textInverse : colors.text}
                      style={{ fontWeight: isSelected ? '600' : 'normal' }}
                    >
                      :{m < 10 ? `0${m}` : `${m}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Actions */}
            <View style={styles.modalButtonsRow}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setTimePickerTarget(null)}
                style={{ flex: 1, marginRight: spacing[8] }}
              />
              <Button
                title="Save Time"
                variant="primary"
                onPress={saveTimePicker}
                style={{ flex: 1, marginLeft: spacing[8] }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* ─── Modal 2: Add Custom Reminder ─────────────────────────────────── */}
      <Modal
        visible={customModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card variant="surface" radius={28} shadow="lg" style={styles.customModalCard}>
            <Text variant="titleSm" style={{ marginBottom: spacing[4] }}>
              Add Custom Reminder
            </Text>
            <Text
              variant="caption"
              color={colors.textSecondary}
              style={{ marginBottom: spacing[16] }}
            >
              Create a personalized mindful check-in
            </Text>

            <Text variant="caption" color={colors.textSecondary} style={styles.inputLabel}>
              Reminder Title
            </Text>
            <TextInput
              style={styles.textInput}
              value={customTitle}
              onChangeText={setCustomTitle}
              placeholder="e.g. Afternoon water & stretch"
              placeholderTextColor={colors.textMuted}
            />

            <Text variant="caption" color={colors.textSecondary} style={styles.inputLabel}>
              Scheduled Time
            </Text>
            <Pressable
              onPress={() =>
                openTimePicker({
                  id: 'custom',
                  title: customTitle || 'Custom Reminder',
                  initialTime: customTime,
                })
              }
              style={styles.customTimeButton}
            >
              <Text style={{ fontSize: 18, marginRight: 8 }}>⏰</Text>
              <Text variant="bodyMedium" color={colors.primaryDark}>
                {formatFriendlyTime(customTime)}
              </Text>
              <Text variant="caption" color={colors.textMuted} style={{ marginLeft: 6 }}>
                (Tap to set)
              </Text>
            </Pressable>

            {/* Repeat Days */}
            <Text variant="caption" color={colors.textSecondary} style={styles.inputLabel}>
              Repeat Days
            </Text>
            <View style={styles.daysRow}>
              {DAY_LABELS.map((label, idx) => {
                const isSelected = customDays.includes(idx);
                return (
                  <Pressable
                    key={idx}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setCustomDays((prev) =>
                        prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort()
                      );
                    }}
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

            {/* Actions */}
            <View style={styles.modalButtonsRow}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setCustomModalVisible(false)}
                style={{ flex: 1, marginRight: spacing[8] }}
              />
              <Button
                title="Schedule"
                variant="primary"
                loading={createMutation.isPending}
                onPress={handleSaveCustomReminder}
                style={{ flex: 1, marginLeft: spacing[8] }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[32],
  },
  backBtn: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    paddingRight: spacing[8],
  },
  backBtnText: {
    fontSize: 16,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  masterCard: {
    padding: spacing[16],
    marginBottom: spacing[12],
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  masterInfo: {
    flex: 1,
    paddingRight: spacing[12],
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  masterEmoji: {
    fontSize: 20,
    marginRight: spacing[8],
  },
  switchTarget: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quietHoursCard: {
    padding: spacing[16],
    marginBottom: spacing[16],
  },
  quietRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quietEmoji: {
    fontSize: 20,
    marginRight: spacing[8],
  },
  quietTimesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[12],
    paddingTop: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  quietTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    minHeight: 44,
  },
  pillTimeText: {
    marginLeft: spacing[4],
    fontWeight: '600',
  },
  sectionHeading: {
    marginTop: spacing[8],
    marginBottom: spacing[12],
  },
  itemCard: {
    padding: spacing[16],
    marginBottom: spacing[12],
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: spacing[8],
  },
  coreEmoji: {
    fontSize: 26,
    marginRight: spacing[12],
  },
  timeActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[12],
    paddingVertical: spacing[4],
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243, 232, 251, 0.8)',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: radii.full,
    minHeight: 44,
    borderWidth: 1.5,
    borderColor: colors.glassBorderSoft,
  },
  timeClockIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  timePickerText: {
    fontWeight: '600',
  },
  quietBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
  },
  quietBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  daysContainer: {
    marginTop: spacing[12],
    paddingTop: spacing[8],
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  repeatLabel: {
    marginBottom: spacing[4],
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  dayChipDisabled: {
    opacity: 0.5,
  },
  customHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[16],
    marginBottom: spacing[12],
  },
  emptyCustomCard: {
    padding: spacing[24],
    alignItems: 'center',
    gap: spacing[8],
    marginBottom: spacing[16],
  },
  emptyCustomTitle: {
    marginTop: spacing[8],
    fontFamily: 'Nunito_700Bold',
    color: colors.text,
  },
  emptyCustomButton: {
    marginTop: spacing[8],
    minWidth: 180,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing[4],
  },
  deleteBtnText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  deviceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[12],
    marginTop: spacing[8],
    marginBottom: spacing[16],
  },
  deviceBannerEmoji: {
    fontSize: 26,
    marginLeft: spacing[4],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 46, 0.32)',
    justifyContent: 'center',
    padding: spacing[16],
  },
  pickerModalCard: {
    padding: spacing[24],
  },
  pickerDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginVertical: spacing[8],
  },
  pickerBigTime: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  pickerLabel: {
    marginTop: spacing[12],
    marginBottom: spacing[4],
  },
  pickerScroll: {
    flexDirection: 'row',
    marginVertical: spacing[4],
  },
  timeSlotPill: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    marginRight: spacing[4],
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  minuteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing[4],
  },
  minutePill: {
    flex: 1,
    paddingVertical: spacing[8],
    marginHorizontal: 4,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    minHeight: 44,
  },
  minutePillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    marginTop: spacing[24],
  },
  customModalCard: {
    padding: spacing[24],
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
  customTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.glassBorderSoft,
    borderRadius: radii[20],
    paddingHorizontal: spacing[12],
    backgroundColor: 'rgba(243, 232, 251, 0.72)',
  },
});
