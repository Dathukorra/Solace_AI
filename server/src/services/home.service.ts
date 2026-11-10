import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { getDeterministicAffirmation } from '../lib/affirmations';
import {
  getLocalDateString,
  getLocalTimeParts,
  getLocalGreeting,
  findNextReminder,
  calculateStreaks,
} from '../lib/timezone';

export interface AISuggestion {
  type: 'breathing' | 'reflection' | 'affirmation' | 'selfcare';
  title: string;
  reason: string;
}

export interface HomeDashboardData {
  greeting: string;
  todayCheckinDone: boolean;
  todayCheckin: {
    id: string;
    mood: number;
    emotions: string[];
    note: string | null;
    createdAt: Date;
  } | null;
  todayAffirmation: {
    base: string;
    personalized: string;
  };
  suggestion: AISuggestion;
  streak: number;
  nextReminder: {
    id: string;
    title: string;
    type: string;
    time: string;
    formattedTime: string;
    days: number[];
  } | null;
  /** First-run checklist progress, derived from existing user data. */
  counts: {
    moods: number;
    conversations: number;
    activities: number;
    reminders: number;
  };
}

// In-memory cache for daily personalized affirmations (keyed by "userId:YYYY-MM-DD")
const dailyAffirmationCache = new Map<string, string>();

/**
 * Derives a personalized suggestion based on the user's recent mood trend
 */
function deriveMoodTrendSuggestion(
  recentCheckins: Array<{ mood: number; emotions: string[] }>
): AISuggestion {
  if (recentCheckins.length === 0) {
    return {
      type: 'selfcare',
      title: 'Gentle Morning Check-in',
      reason: 'Taking one minute to check in with how you feel sets a mindful tone for your day.',
    };
  }

  // Check if last 3 check-ins are all low (<= 2)
  if (recentCheckins.length >= 3 && recentCheckins.slice(0, 3).every((c) => c.mood <= 2)) {
    return {
      type: 'reflection',
      title: 'Gentle Self-Compassion Reflection',
      reason:
        "You've been navigating heavy feelings for a few days in a row. A quiet moment to release expectations might offer some relief.",
    };
  }

  const latestMood = recentCheckins[0].mood;

  if (latestMood === 1) {
    return {
      type: 'breathing',
      title: 'Grounding Box Breathing',
      reason:
        'When emotions feel particularly heavy or intense, rhythmic breathwork can gently soothe your nervous system.',
    };
  }

  if (latestMood === 2) {
    return {
      type: 'reflection',
      title: 'Thought Unloading Journal',
      reason:
        'Writing down whatever feels heavy without editing helps release tension from the mind.',
    };
  }

  if (latestMood >= 4) {
    return {
      type: 'selfcare',
      title: 'Gratitude Savoring',
      reason:
        'You have been feeling lighter lately. Pausing to savor one good thing anchors your positive energy.',
    };
  }

  // Neutral (3)
  return {
    type: 'breathing',
    title: 'Mindful Midday Pause',
    reason: 'A brief pause to connect with your breath and notice what your body needs right now.',
  };
}

/**
 * Generates an AI-personalized variant of the daily affirmation, cached once per day
 */
async function getPersonalizedAffirmation({
  userId,
  todayStr,
  userName,
  goals,
  recentMood,
  baseAffirmation,
}: {
  userId: string;
  todayStr: string;
  userName: string;
  goals: string[];
  recentMood?: number;
  baseAffirmation: string;
}): Promise<string> {
  const cacheKey = `${userId}:${todayStr}`;
  const cached = dailyAffirmationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fallback personalization if API is not available
  const firstName = userName.trim().split(' ')[0] || 'Friend';
  const defaultPersonalized = `${firstName}, ${baseAffirmation.charAt(0).toLowerCase() + baseAffirmation.slice(1)}`;

  if (!env.ANTHROPIC_API_KEY) {
    dailyAffirmationCache.set(cacheKey, defaultPersonalized);
    return defaultPersonalized;
  }

  try {
    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const goalsStr = goals.length > 0 ? goals.join(', ') : 'inner peace and mindfulness';
    const moodStr = recentMood ? `recent mood score ${recentMood}/5` : 'steady state';

    const response = await anthropic.messages.create({
      model: env.ANTHROPIC_CHEAP_MODEL,
      max_tokens: 60,
      messages: [
        {
          role: 'user',
          content: `You are Sola. Personalize this daily affirmation into 1 warm, natural, grounded sentence specifically for ${firstName} (focusing on ${goalsStr}, ${moodStr}). Base affirmation: "${baseAffirmation}". Return ONLY the one personalized affirmation sentence without quotes or commentary.`,
        },
      ],
    });

    const block = response.content[0];
    if (block && block.type === 'text') {
      const personalized = block.text.trim().replace(/^["']|["']$/g, '');
      if (personalized) {
        dailyAffirmationCache.set(cacheKey, personalized);
        return personalized;
      }
    }
  } catch (error) {
    logger.warn('Failed to generate personalized affirmation, using default', { error });
  }

  dailyAffirmationCache.set(cacheKey, defaultPersonalized);
  return defaultPersonalized;
}

/**
 * Retrieves the full Home Dashboard state
 */
export async function getHomeDashboard(userId: string): Promise<HomeDashboardData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      timezone: true,
      goals: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const timeZone = user.timezone || 'UTC';
  const now = new Date();
  const todayStr = getLocalDateString(now, timeZone);
  const yesterdayStr = getLocalDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000), timeZone);
  const { hour: localHour } = getLocalTimeParts(now, timeZone);

  // 1. Fetch check-ins, activities, reminders, and checklist counts in parallel
  const [allMoodCheckins, allActivities, reminders, moodCount, conversationCount, activityCount] =
    await Promise.all([
      prisma.moodCheckin.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.activity.findMany({
        where: { userId },
        select: { completedAt: true },
        orderBy: { completedAt: 'desc' },
        take: 60,
      }),
      prisma.reminder.findMany({
        where: { userId, enabled: true },
      }),
      prisma.moodCheckin.count({ where: { userId } }),
      prisma.conversation.count({ where: { userId } }),
      prisma.activity.count({ where: { userId } }),
    ]);

  // 2. Greeting by local time
  const greeting = getLocalGreeting(user.name, localHour);

  // 3. Today's check-in
  const todayCheckin = allMoodCheckins.find(
    (c) => getLocalDateString(c.createdAt, timeZone) === todayStr
  );
  const todayCheckinDone = Boolean(todayCheckin);

  // 4. Affirmation (deterministic base + AI-personalized cached once per day)
  const { text: baseAffirmation } = getDeterministicAffirmation(todayStr);
  const personalizedAffirmation = await getPersonalizedAffirmation({
    userId,
    todayStr,
    userName: user.name,
    goals: user.goals,
    recentMood: allMoodCheckins[0]?.mood,
    baseAffirmation,
  });

  // 5. AI suggestion based on mood trend
  const suggestion = deriveMoodTrendSuggestion(
    allMoodCheckins.map((c) => ({ mood: c.mood, emotions: c.emotions }))
  );

  // 6. Streak calculation
  const activeDates: string[] = [];
  for (const c of allMoodCheckins) {
    activeDates.push(getLocalDateString(c.createdAt, timeZone));
  }
  for (const a of allActivities) {
    activeDates.push(getLocalDateString(a.completedAt, timeZone));
  }
  const { currentStreak } = calculateStreaks(activeDates, todayStr, yesterdayStr);

  // 7. Next reminder
  const nextReminder = findNextReminder(reminders, now, timeZone);

  return {
    greeting,
    todayCheckinDone,
    todayCheckin: todayCheckin
      ? {
          id: todayCheckin.id,
          mood: todayCheckin.mood,
          emotions: todayCheckin.emotions,
          note: todayCheckin.note,
          createdAt: todayCheckin.createdAt,
        }
      : null,
    todayAffirmation: {
      base: baseAffirmation,
      personalized: personalizedAffirmation,
    },
    suggestion,
    streak: currentStreak,
    nextReminder: nextReminder
      ? {
          id: nextReminder.id,
          title: nextReminder.title,
          type: nextReminder.type,
          time: nextReminder.time,
          formattedTime: nextReminder.formattedTime,
          days: nextReminder.days,
        }
      : null,
    counts: {
      moods: moodCount,
      conversations: conversationCount,
      activities: activityCount,
      reminders: reminders.length,
    },
  };
}
