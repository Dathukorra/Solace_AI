import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { getLocalDateString, calculateStreaks } from '../lib/timezone';

export interface BadgeItem {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  earnedAt?: string | null;
}

export interface WeeklyMoodAverage {
  week: string; // e.g. "2026-W44"
  startDate: string;
  endDate: string;
  averageMood: number | null;
  count: number;
}

export interface ProgressSummary {
  currentStreak: number;
  bestStreak: number;
  weeklyMoodAverages: WeeklyMoodAverage[];
  activityCountsByType: Record<string, number>;
  badges: BadgeItem[];
}

/**
 * Computes progress stats: streaks, mood averages, activity counts, and badges
 */
export async function getUserProgress(userId: string): Promise<ProgressSummary> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const timeZone = user.timezone || 'UTC';
  const now = new Date();
  const todayStr = getLocalDateString(now, timeZone);
  const yesterdayStr = getLocalDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000), timeZone);

  // 1. Fetch all check-in timestamps and activity completion timestamps
  const [moodCheckins, activities] = await Promise.all([
    prisma.moodCheckin.findMany({
      where: { userId },
      select: { id: true, mood: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.activity.findMany({
      where: { userId },
      select: { id: true, type: true, completedAt: true },
      orderBy: { completedAt: 'desc' },
    }),
  ]);

  // 2. Compute Active Dates for Streak
  const activeDates: string[] = [];
  for (const c of moodCheckins) {
    activeDates.push(getLocalDateString(c.createdAt, timeZone));
  }
  for (const a of activities) {
    activeDates.push(getLocalDateString(a.completedAt, timeZone));
  }

  const { currentStreak, bestStreak } = calculateStreaks(activeDates, todayStr, yesterdayStr);

  // 3. Compute Weekly Mood Averages (last 6 weeks)
  const weeklyMoodAverages: WeeklyMoodAverage[] = [];
  for (let w = 5; w >= 0; w--) {
    const weekStart = new Date(now.getTime() - (w * 7 + 6) * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);

    const weekCheckins = moodCheckins.filter(
      (c) => c.createdAt >= weekStart && c.createdAt <= weekEnd
    );

    const count = weekCheckins.length;
    const avg =
      count > 0
        ? Math.round((weekCheckins.reduce((s, c) => s + c.mood, 0) / count) * 10) / 10
        : null;

    // Estimate ISO week or friendly label
    const labelDate = weekEnd.toISOString().split('T')[0];
    weeklyMoodAverages.push({
      week: `Week ending ${labelDate}`,
      startDate: weekStart.toISOString().split('T')[0],
      endDate: labelDate,
      averageMood: avg,
      count,
    });
  }

  // 4. Compute Activity Counts by Type
  const allActivityTypes = [
    'BREATHING',
    'MEDITATION',
    'JOURNALING',
    'MOVEMENT',
    'REFLECTION',
    'BODY_SCAN',
  ];

  const activityCountsByType: Record<string, number> = {};
  for (const t of allActivityTypes) {
    activityCountsByType[t] = 0;
  }
  for (const act of activities) {
    const key = act.type;
    activityCountsByType[key] = (activityCountsByType[key] || 0) + 1;
  }

  // 5. Compute Badges
  const firstCheckin = moodCheckins.length > 0;
  const breathingCount = activityCountsByType['BREATHING'] || 0;

  const badges: BadgeItem[] = [
    {
      id: 'first_checkin',
      title: 'First check-in',
      description: 'Completed your first mindful check-in with Sola',
      earned: firstCheckin,
      earnedAt: firstCheckin ? moodCheckins[moodCheckins.length - 1].createdAt.toISOString() : null,
    },
    {
      id: 'streak_3',
      title: '3-day streak',
      description: 'Checked in or completed an activity 3 days in a row',
      earned: bestStreak >= 3,
      earnedAt: null,
    },
    {
      id: 'streak_7',
      title: '7-day streak',
      description: 'Maintained mindful consistency for one full week',
      earned: bestStreak >= 7,
      earnedAt: null,
    },
    {
      id: 'streak_30',
      title: '30 days',
      description: 'A month of dedication to your emotional wellbeing',
      earned: bestStreak >= 30,
      earnedAt: null,
    },
    {
      id: 'breathing_10',
      title: '10 breathing sessions',
      description: 'Completed 10 calming breathwork exercises',
      earned: breathingCount >= 10,
      earnedAt: null,
    },
  ];

  return {
    currentStreak,
    bestStreak,
    weeklyMoodAverages,
    activityCountsByType,
    badges,
  };
}
