/**
 * Timezone and Date Utilities for Sola Wellness Calculations
 *
 * Implements local calendar calculations using native Intl.DateTimeFormat
 * supporting any IANA timezone (e.g. "Asia/Kolkata", "America/New_York", "UTC").
 */

export function getLocalDateString(date: Date = new Date(), timeZone = 'UTC'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // Returns "YYYY-MM-DD"
  } catch {
    return date.toISOString().split('T')[0];
  }
}

export function getLocalTimeParts(
  date: Date = new Date(),
  timeZone = 'UTC'
): {
  hour: number;
  minute: number;
} {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const parts = dtf.formatToParts(date);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '12', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    return { hour, minute };
  } catch {
    return { hour: date.getUTCHours(), minute: date.getUTCMinutes() };
  }
}

export function getLocalDayOfWeek(date: Date = new Date(), timeZone = 'UTC'): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    });
    const dayStr = dtf.format(date);
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[dayStr] ?? date.getUTCDay();
  } catch {
    return date.getUTCDay();
  }
}

/**
 * Returns a warm greeting based on the user's local hour
 */
export function getLocalGreeting(name: string, hour: number): string {
  const firstName = name.trim().split(' ')[0] || 'Friend';
  if (hour >= 5 && hour < 12) {
    return `Good morning, ${firstName}`;
  }
  if (hour >= 12 && hour < 17) {
    return `Good afternoon, ${firstName}`;
  }
  if (hour >= 17 && hour < 21) {
    return `Good evening, ${firstName}`;
  }
  return `Peaceful night, ${firstName}`;
}

/**
 * Calculates current and best streak from a list of active local dates (YYYY-MM-DD)
 */
export function calculateStreaks(
  activeDates: string[],
  todayStr: string,
  yesterdayStr: string
): { currentStreak: number; bestStreak: number } {
  if (activeDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const uniqueSorted = Array.from(new Set(activeDates)).sort();
  const dateSet = new Set(uniqueSorted);

  // 1. Calculate Best Streak
  let bestStreak = 0;
  let runningStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of uniqueSorted) {
    const current = new Date(dateStr + 'T00:00:00Z');
    if (!prevDate) {
      runningStreak = 1;
    } else {
      const diffMs = current.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

      if (diffDays === 1) {
        runningStreak += 1;
      } else if (diffDays > 1) {
        runningStreak = 1;
      }
    }
    if (runningStreak > bestStreak) {
      bestStreak = runningStreak;
    }
    prevDate = current;
  }

  // 2. Calculate Current Streak
  let currentStreak = 0;
  let checkDateStr: string | null = null;

  if (dateSet.has(todayStr)) {
    checkDateStr = todayStr;
  } else if (dateSet.has(yesterdayStr)) {
    checkDateStr = yesterdayStr;
  }

  if (checkDateStr) {
    let curr = new Date(checkDateStr + 'T00:00:00Z');
    while (dateSet.has(curr.toISOString().split('T')[0])) {
      currentStreak += 1;
      curr = new Date(curr.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
  };
}

export interface ReminderItem {
  id: string;
  type: string;
  title: string;
  time: string; // "HH:mm"
  days: number[]; // 0..6
  enabled: boolean;
}

/**
 * Finds the next upcoming reminder for the user
 */
export function findNextReminder(
  reminders: ReminderItem[],
  now: Date = new Date(),
  timeZone = 'UTC'
): (ReminderItem & { formattedTime: string; nextOccursInDays: number }) | null {
  const activeReminders = reminders.filter((r) => r.enabled && r.days.length > 0);
  if (activeReminders.length === 0) return null;

  const { hour: currentHour, minute: currentMinute } = getLocalTimeParts(now, timeZone);
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const currentDayOfWeek = getLocalDayOfWeek(now, timeZone);

  let closestReminder: ReminderItem | null = null;
  let minWaitMinutes = Infinity;
  let closestDaysAhead = 0;

  for (const reminder of activeReminders) {
    const [rHourStr, rMinStr] = reminder.time.split(':');
    const rHour = parseInt(rHourStr || '0', 10);
    const rMin = parseInt(rMinStr || '0', 10);
    const reminderTotalMinutes = rHour * 60 + rMin;

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDay = (currentDayOfWeek + dayOffset) % 7;
      if (reminder.days.includes(targetDay)) {
        const waitMinutes = dayOffset * 24 * 60 + (reminderTotalMinutes - currentTotalMinutes);
        if (dayOffset === 0 && reminderTotalMinutes <= currentTotalMinutes) {
          // Time has passed for today, skip to next recurring day
          continue;
        }

        if (waitMinutes < minWaitMinutes) {
          minWaitMinutes = waitMinutes;
          closestReminder = reminder;
          closestDaysAhead = dayOffset;
        }
        break;
      }
    }
  }

  if (!closestReminder) return null;

  // Format 12-hour display time
  const [hStr, mStr] = closestReminder.time.split(':');
  const h = parseInt(hStr || '0', 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  const formattedTime = `${displayHour}:${mStr} ${ampm}`;

  return {
    ...closestReminder,
    formattedTime,
    nextOccursInDays: closestDaysAhead,
  };
}
