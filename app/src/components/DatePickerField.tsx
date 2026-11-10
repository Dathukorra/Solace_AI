import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii, spacing } from '../theme/spacing';
import { Card } from './Card';
import { Text } from './Text';
import { Button } from './Button';
import { MIN_DATE_OF_BIRTH, isValidDateOnly, todayIsoDate } from '../features/profile/profileUtils';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

type PickerMode = 'calendar' | 'months' | 'years';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toIso(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function formatDisplay(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export interface DatePickerFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  minimumDate?: string;
  maximumDate?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  placeholder?: string;
  containerStyle?: ViewStyle;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onChange,
  minimumDate = MIN_DATE_OF_BIRTH,
  maximumDate = todayIsoDate(),
  error,
  helperText,
  disabled = false,
  placeholder = 'Select a date',
  containerStyle,
}) => {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<PickerMode>('calendar');
  const [viewYear, setViewYear] = useState(1995);
  const [viewMonth, setViewMonth] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const minimumYear = Number(minimumDate.slice(0, 4));
  const maximumYear = Number(maximumDate.slice(0, 4));

  const open = () => {
    if (disabled) return;
    const initial = value && isValidDateOnly(value) ? value : null;
    const initialDate = initial
      ? new Date(`${initial}T00:00:00.000Z`)
      : new Date(Date.UTC(maximumYear - 25, new Date().getUTCMonth(), 1));

    setSelected(initial);
    setViewYear(initialDate.getUTCFullYear());
    setViewMonth(initialDate.getUTCMonth());
    setMode('calendar');
    setVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const close = () => setVisible(false);

  const changeMonth = (delta: number) => {
    const next = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const days = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    const cells: (number | null)[] = [];

    for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

    return cells;
  }, [viewYear, viewMonth]);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let year = maximumYear; year >= minimumYear; year -= 1) list.push(year);
    return list;
  }, [maximumYear, minimumYear]);

  const yearScrollOffset = Math.max(0, Math.floor(years.indexOf(viewYear) / 3) - 1) * 52;

  const apply = () => {
    if (!selected) return;
    onChange(selected);
    close();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const clear = () => {
    onChange(null);
    close();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const canGoPrevious = viewYear > minimumYear || viewMonth > 0;
  const canGoNext = viewYear < maximumYear || viewMonth < 11;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Text variant="caption" color={colors.textSecondary} style={styles.label}>
        {label}
      </Text>

      <Pressable
        onPress={open}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatDisplay(value) : placeholder}`}
        accessibilityState={{ disabled, expanded: visible }}
        style={[styles.field, !!error && styles.fieldError, disabled && styles.fieldDisabled]}
      >
        <Text style={styles.calendarIcon}>🎂</Text>
        <Text
          variant="body"
          color={value ? colors.text : colors.textMuted}
          style={styles.value}
          numberOfLines={1}
        >
          {value ? formatDisplay(value) : placeholder}
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

      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.overlay}>
          <Card variant="surface" radius={24} shadow="lg" style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text variant="titleSm" style={styles.modalTitle}>
                {label}
              </Text>
              <Pressable
                onPress={close}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close date picker"
                style={styles.iconButton}
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            {mode === 'calendar' && (
              <>
                <View style={styles.selectorRow}>
                  <Pressable
                    onPress={() => setMode('months')}
                    accessibilityRole="button"
                    accessibilityLabel="Choose month"
                    style={styles.selector}
                  >
                    <Text variant="bodyMedium" color={colors.primaryDark}>
                      {MONTH_NAMES[viewMonth]}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setMode('years')}
                    accessibilityRole="button"
                    accessibilityLabel="Choose year"
                    style={styles.selector}
                  >
                    <Text variant="bodyMedium" color={colors.primaryDark}>
                      {viewYear}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.navRow}>
                  <Pressable
                    onPress={() => changeMonth(-1)}
                    disabled={!canGoPrevious}
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                    style={[styles.navButton, !canGoPrevious && styles.navDisabled]}
                  >
                    <Text style={styles.navText}>‹</Text>
                  </Pressable>
                  <Text variant="caption" color={colors.textMuted}>
                    Select your date of birth
                  </Text>
                  <Pressable
                    onPress={() => changeMonth(1)}
                    disabled={!canGoNext}
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                    style={[styles.navButton, !canGoNext && styles.navDisabled]}
                  >
                    <Text style={styles.navText}>›</Text>
                  </Pressable>
                </View>

                <View style={styles.weekdayRow}>
                  {WEEKDAYS.map((day) => (
                    <Text
                      key={day}
                      variant="captionSm"
                      color={colors.textMuted}
                      style={styles.weekday}
                    >
                      {day}
                    </Text>
                  ))}
                </View>

                <View style={styles.daysGrid}>
                  {days.map((day, index) => {
                    if (day === null) {
                      return <View key={`blank-${index}`} style={styles.dayCell} />;
                    }

                    const iso = toIso(viewYear, viewMonth, day);
                    const isDisabled = iso < minimumDate || iso > maximumDate;
                    const isSelected = iso === selected;
                    const isToday = iso === todayIsoDate();

                    return (
                      <Pressable
                        key={iso}
                        onPress={() => {
                          setSelected(iso);
                          Haptics.selectionAsync().catch(() => {});
                        }}
                        disabled={isDisabled}
                        accessibilityRole="button"
                        accessibilityLabel={`${MONTH_NAMES[viewMonth]} ${day}, ${viewYear}`}
                        accessibilityState={{ selected: isSelected, disabled: isDisabled }}
                        style={styles.dayCell}
                      >
                        <View
                          style={[
                            styles.dayCircle,
                            isToday && styles.dayToday,
                            isSelected && styles.daySelected,
                          ]}
                        >
                          <Text
                            variant="bodySm"
                            color={
                              isDisabled
                                ? colors.textSubtle
                                : isSelected
                                  ? colors.textInverse
                                  : colors.text
                            }
                            style={isSelected && styles.daySelectedText}
                          >
                            {day}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {mode === 'months' && (
              <>
                <Text variant="caption" color={colors.textMuted} style={styles.modeHint}>
                  Choose a month in {viewYear}
                </Text>
                <View style={styles.monthsGrid}>
                  {MONTH_SHORT.map((month, index) => (
                    <Pressable
                      key={month}
                      onPress={() => {
                        setViewMonth(index);
                        setMode('calendar');
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={MONTH_NAMES[index]}
                      style={[styles.monthCell, viewMonth === index && styles.monthCellSelected]}
                    >
                      <Text
                        variant="bodySm"
                        color={viewMonth === index ? colors.textInverse : colors.text}
                      >
                        {month}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {mode === 'years' && (
              <>
                <Text variant="caption" color={colors.textMuted} style={styles.modeHint}>
                  Choose a year
                </Text>
                <ScrollView
                  style={styles.yearsScroll}
                  showsVerticalScrollIndicator={false}
                  contentOffset={{ x: 0, y: yearScrollOffset }}
                >
                  <View style={styles.yearsGrid}>
                    {years.map((year) => (
                      <Pressable
                        key={year}
                        onPress={() => {
                          setViewYear(year);
                          setMode('calendar');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={String(year)}
                        style={[styles.yearCell, viewYear === year && styles.yearCellSelected]}
                      >
                        <Text
                          variant="bodySm"
                          color={viewYear === year ? colors.textInverse : colors.text}
                        >
                          {year}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            <View style={styles.footer}>
              {value ? (
                <Button
                  title="Clear"
                  variant="ghost"
                  size="sm"
                  onPress={clear}
                  style={styles.footerButton}
                />
              ) : (
                <View style={styles.footerSpacer} />
              )}
              <Button
                title="Cancel"
                variant="ghost"
                size="sm"
                onPress={close}
                style={styles.footerButton}
              />
              <Button
                title="Done"
                variant="primary"
                size="sm"
                onPress={apply}
                disabled={!selected}
                style={styles.footerButton}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
};

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
  calendarIcon: {
    fontSize: 18,
    marginRight: spacing[8],
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[12],
  },
  modalTitle: {
    color: colors.text,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    color: colors.textMuted,
  },
  selectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[8],
    marginBottom: spacing[8],
  },
  selector: {
    minHeight: 40,
    paddingHorizontal: spacing[16],
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[8],
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  navDisabled: {
    opacity: 0.3,
  },
  navText: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing[4],
  },
  weekday: {
    width: '14.2857%',
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  daySelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  daySelectedText: {
    fontFamily: fonts.body.semiBold,
  },
  modeHint: {
    textAlign: 'center',
    marginBottom: spacing[12],
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthCell: {
    width: '31%',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii[16],
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    borderWidth: 1.5,
    borderColor: colors.glassBorderSoft,
    marginBottom: spacing[8],
  },
  monthCellSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  yearsScroll: {
    maxHeight: 260,
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  yearCell: {
    width: '31%',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii[16],
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    borderWidth: 1.5,
    borderColor: colors.glassBorderSoft,
    marginBottom: spacing[8],
  },
  yearCellSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing[8],
    marginTop: spacing[12],
  },
  footerButton: {
    flexGrow: 0,
  },
  footerSpacer: {
    flex: 1,
  },
});
