import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { getLocalDateString } from '../lib/timezone';

export interface SaveMoodDto {
  userId: string;
  mood: number;
  emotions: string[];
  note?: string | null;
}

/**
 * Saves or edits the user's single check-in for their local calendar day
 */
export async function saveDailyMoodCheckin({ userId, mood, emotions, note }: SaveMoodDto) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const timeZone = user.timezone || 'UTC';
  const todayStr = getLocalDateString(new Date(), timeZone);

  // Look for any check-in recorded for the user in the last 48 hours
  const recentCheckins = await prisma.moodCheckin.findMany({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Find if a check-in matches today's local date
  const todayExisting = recentCheckins.find(
    (c) => getLocalDateString(c.createdAt, timeZone) === todayStr
  );

  if (todayExisting) {
    // Update existing check-in for today (editable check-in)
    const updated = await prisma.moodCheckin.update({
      where: { id: todayExisting.id },
      data: {
        mood,
        emotions,
        note: note !== undefined ? note : todayExisting.note,
      },
    });

    return {
      checkin: updated,
      isUpdated: true,
      localDate: todayStr,
    };
  }

  // Create a brand new check-in for today
  const created = await prisma.moodCheckin.create({
    data: {
      userId,
      mood,
      emotions,
      note: note || null,
    },
  });

  return {
    checkin: created,
    isUpdated: false,
    localDate: todayStr,
  };
}

/**
 * Retrieves mood history for the specified range (7d or 30d)
 */
export async function getMoodHistory({
  userId,
  range = '7d',
}: {
  userId: string;
  range?: '7d' | '30d';
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });

  const timeZone = user?.timezone || 'UTC';
  const days = range === '30d' ? 30 : 7;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const checkins = await prisma.moodCheckin.findMany({
    where: {
      userId,
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalCount = checkins.length;
  const averageMood =
    totalCount > 0
      ? Math.round((checkins.reduce((sum, c) => sum + c.mood, 0) / totalCount) * 10) / 10
      : null;

  const items = checkins.map((c) => ({
    id: c.id,
    mood: c.mood,
    emotions: c.emotions,
    note: c.note,
    createdAt: c.createdAt,
    localDate: getLocalDateString(c.createdAt, timeZone),
  }));

  return {
    range,
    totalCount,
    averageMood,
    // Anchors the Insights chart to the user's calendar day instead of relying
    // on the device's timezone matching the timezone stored on the account.
    today: getLocalDateString(new Date(), timeZone),
    items,
  };
}
