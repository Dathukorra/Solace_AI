import {
  getLocalDateString,
  getLocalGreeting,
  calculateStreaks,
  findNextReminder,
  ReminderItem,
} from '../lib/timezone';

describe('Timezone, Streak & Reminder Utilities', () => {
  it('formats local date string according to provided IANA timezone', () => {
    // 2026-11-05T01:00:00Z is 2026-11-04 evening in New York, and 2026-11-05 morning in Kolkata
    const fixedUtc = new Date('2026-11-05T01:00:00Z');

    const kolkataDate = getLocalDateString(fixedUtc, 'Asia/Kolkata');
    const nyDate = getLocalDateString(fixedUtc, 'America/New_York');

    expect(kolkataDate).toBe('2026-11-05');
    expect(nyDate).toBe('2026-11-04');
  });

  it('generates appropriate local greetings by hour', () => {
    expect(getLocalGreeting('Maya Lin', 8)).toBe('Good morning, Maya');
    expect(getLocalGreeting('Maya Lin', 13)).toBe('Good afternoon, Maya');
    expect(getLocalGreeting('Maya Lin', 18)).toBe('Good evening, Maya');
    expect(getLocalGreeting('Maya Lin', 22)).toBe('Peaceful night, Maya');
    expect(getLocalGreeting('Maya Lin', 2)).toBe('Peaceful night, Maya');
  });

  it('calculates current and best streaks accurately', () => {
    const today = '2026-11-05';
    const yesterday = '2026-11-04';

    // Consecutive 4 days including today
    const dates1 = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'];
    const res1 = calculateStreaks(dates1, today, yesterday);
    expect(res1.currentStreak).toBe(4);
    expect(res1.bestStreak).toBe(4);

    // Consecutive 3 days ending yesterday (streak still active for today)
    const dates2 = ['2026-11-02', '2026-11-03', '2026-11-04'];
    const res2 = calculateStreaks(dates2, today, yesterday);
    expect(res2.currentStreak).toBe(3);
    expect(res2.bestStreak).toBe(3);

    // Broken streak: checked in 3 days ago, but missed yesterday and today
    const dates3 = ['2026-11-01', '2026-11-02'];
    const res3 = calculateStreaks(dates3, today, yesterday);
    expect(res3.currentStreak).toBe(0);
    expect(res3.bestStreak).toBe(2);

    // Empty list
    expect(calculateStreaks([], today, yesterday)).toEqual({
      currentStreak: 0,
      bestStreak: 0,
    });
  });

  it('finds the next upcoming reminder', () => {
    // Fixed reference time: 2026-11-05 (Thursday) at 10:00 UTC
    const refDate = new Date('2026-11-05T10:00:00Z');
    // Day of week: Thursday = 4

    const reminders: ReminderItem[] = [
      {
        id: 'r1',
        title: 'Morning Mindfulness',
        type: 'MINDFULNESS',
        time: '09:00', // Already passed today
        days: [4],
        enabled: true,
      },
      {
        id: 'r2',
        title: 'Afternoon Check-in',
        type: 'CHECK_IN',
        time: '14:30', // Later today (Thursday)
        days: [1, 2, 3, 4, 5],
        enabled: true,
      },
      {
        id: 'r3',
        title: 'Evening Wind Down',
        type: 'WIND_DOWN',
        time: '21:00',
        days: [4],
        enabled: true,
      },
    ];

    const next = findNextReminder(reminders, refDate, 'UTC');
    expect(next).not.toBeNull();
    expect(next?.id).toBe('r2');
    expect(next?.formattedTime).toBe('2:30 PM');
    expect(next?.nextOccursInDays).toBe(0);
  });
});
