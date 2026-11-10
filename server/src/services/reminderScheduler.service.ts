import cron, { ScheduledTask } from 'node-cron';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { getLocalDateString, getLocalTimeParts, getLocalDayOfWeek } from '../lib/timezone';

const expo = new Expo();

// In-memory cache to prevent duplicate sends within the same minute: "reminderId:YYYY-MM-DD:HH:mm"
const sentInCurrentMinute = new Map<string, number>();

/**
 * Screen destination mapping based on reminder type
 */
export function getScreenForReminderType(
  type: string
): 'mood' | 'affirmation' | 'breathing' | 'selfcare' | 'chat' {
  switch (type.toUpperCase()) {
    case 'MOOD':
    case 'CHECK_IN':
      return 'mood';
    case 'AFFIRMATION':
      return 'affirmation';
    case 'BREATHING':
    case 'BREATHWORK':
      return 'breathing';
    case 'SELFCARE':
    case 'MINDFULNESS':
    case 'WIND_DOWN':
    case 'GRATITUDE':
    case 'HYDRATION':
      return 'selfcare';
    case 'CUSTOM':
    default:
      return 'chat';
  }
}

/**
 * Curated gentle, non-guilt copy variants per reminder type
 */
export const GENTLE_COPY_VARIANTS: Record<string, string[]> = {
  MOOD: [
    'How does your heart feel right now? No right or wrong answers.',
    'A quiet space to check in with yourself whenever you feel ready.',
    'Taking a gentle pause to notice where your mind is today.',
    'Checking in with warmth and without judgment.',
  ],
  AFFIRMATION: [
    'A gentle thought waiting for you today.',
    'Your daily mindful affirmation is ready when you are.',
    'A quiet reminder of your steady inner strength.',
    'A soft message of encouragement for your day.',
  ],
  BREATHING: [
    'Take a slow, deep breath in... and gently let it go.',
    'Three quiet minutes to reset your nervous system.',
    'A mindful pause to return home to your breath.',
    'Allow your shoulders to drop and take one peaceful breath.',
  ],
  SELFCARE: [
    'A gentle invitation to offer yourself a moment of rest.',
    'Remember to drink a sip of water and unclench your jaw.',
    'You are worthy of kindness from yourself today.',
    'Pause for a moment and notice what your body needs.',
  ],
  CUSTOM: [
    'A mindful moment you scheduled for yourself.',
    'A peaceful pause in your day.',
    'Here is the gentle reminder you set for yourself.',
  ],
};

/**
 * Rotates gentle copy based on date and reminder ID
 */
export function getGentleCopy(type: string, dateStr: string): string {
  const normalizedType = ['MOOD', 'CHECK_IN'].includes(type.toUpperCase())
    ? 'MOOD'
    : ['BREATHING', 'BREATHWORK'].includes(type.toUpperCase())
      ? 'BREATHING'
      : type.toUpperCase() === 'AFFIRMATION'
        ? 'AFFIRMATION'
        : type.toUpperCase() === 'CUSTOM'
          ? 'CUSTOM'
          : 'SELFCARE';

  const variants = GENTLE_COPY_VARIANTS[normalizedType] || GENTLE_COPY_VARIANTS.SELFCARE;

  // Deterministic daily rotation
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % variants.length;
  return variants[index];
}

/**
 * Cleans up in-memory dedup keys older than 2 hours
 */
function pruneDedupCache() {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  for (const [key, timestamp] of sentInCurrentMinute.entries()) {
    if (timestamp < twoHoursAgo) {
      sentInCurrentMinute.delete(key);
    }
  }
}

/**
 * Checks reminders matching the current minute across all users' local timezones
 * and sends push notifications via Expo.
 */
export async function processMinuteReminders(now: Date = new Date()): Promise<{
  matchedCount: number;
  sentCount: number;
  skippedCount: number;
}> {
  pruneDedupCache();

  // Load all enabled reminders with user timezone, push tokens, and recent check-ins
  const reminders = await prisma.reminder.findMany({
    where: { enabled: true },
    include: {
      user: {
        select: {
          id: true,
          timezone: true,
          pushTokens: {
            select: { id: true, token: true },
          },
          moodCheckins: {
            select: { createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
      },
    },
  });

  let matchedCount = 0;
  let sentCount = 0;
  let skippedCount = 0;

  const pushMessages: Array<{
    message: ExpoPushMessage;
    pushTokenRecord: { id: string; token: string };
  }> = [];

  for (const reminder of reminders) {
    const timeZone = reminder.user.timezone || 'UTC';
    const { hour, minute } = getLocalTimeParts(now, timeZone);
    const currentLocalTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const currentLocalDay = getLocalDayOfWeek(now, timeZone);
    const currentLocalDate = getLocalDateString(now, timeZone);

    // 1. Check if time matches current local minute
    if (reminder.time !== currentLocalTime) {
      continue;
    }

    // 2. Check if active day matches
    if (!reminder.days.includes(currentLocalDay)) {
      continue;
    }

    matchedCount++;

    // 3. Deduplication check: prevent duplicate sends within the same minute
    const dedupKey = `${reminder.id}:${currentLocalDate}:${reminder.time}`;
    if (sentInCurrentMinute.has(dedupKey)) {
      skippedCount++;
      continue;
    }

    // 4. Skip mood reminder if today's check-in is already done
    const isMoodReminder = ['MOOD', 'CHECK_IN'].includes(reminder.type.toUpperCase());
    if (isMoodReminder) {
      const alreadyCheckedInToday = reminder.user.moodCheckins.some(
        (c) => getLocalDateString(c.createdAt, timeZone) === currentLocalDate
      );

      if (alreadyCheckedInToday) {
        skippedCount++;
        sentInCurrentMinute.set(dedupKey, Date.now());
        continue;
      }
    }

    // 5. Check if user has registered device push tokens
    const validTokens = reminder.user.pushTokens.filter((pt) => Expo.isExpoPushToken(pt.token));

    if (validTokens.length === 0) {
      sentInCurrentMinute.set(dedupKey, Date.now());
      continue;
    }

    // 6. Build gentle message payload
    const screen = getScreenForReminderType(reminder.type);
    const body = getGentleCopy(reminder.type, currentLocalDate);

    for (const pt of validTokens) {
      pushMessages.push({
        message: {
          to: pt.token,
          sound: 'default',
          title: reminder.title,
          body,
          data: {
            screen,
            reminderId: reminder.id,
          },
        },
        pushTokenRecord: pt,
      });
    }

    sentInCurrentMinute.set(dedupKey, Date.now());
    sentCount++;
  }

  // 7. Dispatch notifications using Expo Server SDK
  if (pushMessages.length > 0) {
    await sendExpoPushChunks(pushMessages);
  }

  return { matchedCount, sentCount, skippedCount };
}

/**
 * Sends messages in chunks and cleans up invalid tokens
 */
async function sendExpoPushChunks(
  pushEntries: Array<{
    message: ExpoPushMessage;
    pushTokenRecord: { id: string; token: string };
  }>
) {
  const chunks = expo.chunkPushNotifications(pushEntries.map((e) => e.message));
  const invalidTokensToDelete = new Set<string>();
  const receiptIdMap = new Map<string, string>(); // receiptId -> token

  let entryIndex = 0;

  for (const chunk of chunks) {
    try {
      const tickets: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(chunk);

      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const correspondingToken = pushEntries[entryIndex + i]?.pushTokenRecord.token;

        if (ticket.status === 'error') {
          logger.warn('Expo push ticket error', {
            error: ticket.message,
            details: ticket.details,
            token: correspondingToken,
          });

          if (ticket.details?.error === 'DeviceNotRegistered' && correspondingToken) {
            invalidTokensToDelete.add(correspondingToken);
          }
        } else if (ticket.status === 'ok' && ticket.id && correspondingToken) {
          receiptIdMap.set(ticket.id, correspondingToken);
        }
      }
    } catch (chunkError) {
      logger.error('Error sending push notification chunk', { error: chunkError });
    }
    entryIndex += chunk.length;
  }

  // Delete tokens identified as invalid/unregistered immediately
  if (invalidTokensToDelete.size > 0) {
    const tokens = Array.from(invalidTokensToDelete);
    logger.info(`Deleting ${tokens.length} invalid Expo push tokens`, { tokens });
    await prisma.pushToken.deleteMany({
      where: { token: { in: tokens } },
    });
  }

  // Optional asynchronous check on receipts (after brief delay)
  if (receiptIdMap.size > 0) {
    setTimeout(async () => {
      try {
        const receiptIds = Array.from(receiptIdMap.keys());
        const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

        for (const rChunk of receiptIdChunks) {
          const receipts = await expo.getPushNotificationReceiptsAsync(rChunk);
          for (const receiptId in receipts) {
            const receipt = receipts[receiptId];
            if (receipt.status === 'error') {
              logger.warn('Expo receipt error', { receipt });
              if (receipt.details?.error === 'DeviceNotRegistered' && receiptIdMap.has(receiptId)) {
                const badToken = receiptIdMap.get(receiptId);
                if (badToken) {
                  await prisma.pushToken.deleteMany({
                    where: { token: badToken },
                  });
                }
              }
            }
          }
        }
      } catch (receiptError) {
        logger.warn('Error verifying push notification receipts', { error: receiptError });
      }
    }, 15_000);
  }
}

let activeCronTask: ScheduledTask | null = null;

/**
 * Starts the minute-by-minute reminder scheduler
 */
export function startReminderScheduler(): ScheduledTask {
  if (activeCronTask) {
    return activeCronTask;
  }

  logger.info('Starting Sola minute-by-minute reminder scheduler');

  // Run every minute
  activeCronTask = cron.schedule('* * * * *', async () => {
    try {
      await processMinuteReminders();
    } catch (error) {
      logger.error('Error in reminder scheduler cron tick', { error });
    }
  });

  return activeCronTask;
}

/**
 * Stops the reminder scheduler
 */
export function stopReminderScheduler(): void {
  if (activeCronTask) {
    activeCronTask.stop();
    activeCronTask = null;
    logger.info('Stopped Sola reminder scheduler');
  }
}
