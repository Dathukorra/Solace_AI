import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Router, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { useMoodStore } from '../../store/moodStore';
import { ReminderItem, QuietHoursConfig } from './types';

const PUSH_TOKEN_STORAGE_KEY = 'solace_push_token';
export const ANDROID_CHANNEL_NAME = 'Gentle reminders';
export const ANDROID_CHANNEL_ID = 'gentle-reminders';

// Notification presentation handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Pending notification route storage when waiting for auth
let pendingNotificationScreen: string | null = null;

export function setPendingNotification(screen: string | null) {
  pendingNotificationScreen = screen;
}

export function getPendingNotification(): string | null {
  return pendingNotificationScreen;
}

export function consumePendingNotification(): string | null {
  const screen = pendingNotificationScreen;
  pendingNotificationScreen = null;
  return screen;
}

/**
 * Configure Android notification channels
 * Sets up 'Gentle reminders' channel as requested.
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: ANDROID_CHANNEL_NAME,
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#A63DE8',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  }
}

/**
 * Request notification permissions gently from the user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (e) {
    console.warn('Error requesting notification permissions:', e);
    return false;
  }
}

/**
 * Backward-compatibility alias
 */
export const requestNotificationPermissionsAsync = requestNotificationPermissions;

/**
 * Retrieve the Expo push token
 */
export async function getExpoPushTokenAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const granted = await requestNotificationPermissions();
  if (!granted) {
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (e) {
    console.warn('Error fetching Expo push token:', e);
    return null;
  }
}

/**
 * Backward-compatibility alias
 */
export const registerForPushNotificationsAsync = getExpoPushTokenAsync;

/**
 * Retrieve the Expo push token and POST it to /push-tokens
 * Called on login, signup, or when enabling notifications.
 */
export async function syncPushTokenWithBackend(): Promise<boolean> {
  try {
    const token = await getExpoPushTokenAsync();
    if (!token) return false;

    // POST /push-tokens with { token, platform }
    await apiClient('/push-tokens', {
      method: 'POST',
      body: JSON.stringify({
        token,
        platform: Platform.OS,
      }),
    });

    await SecureStore.setItemAsync(PUSH_TOKEN_STORAGE_KEY, token);
    return true;
  } catch (e) {
    console.warn('Failed to sync push token with backend:', e);
    return false;
  }
}

/**
 * Route user based on notification data.screen:
 * - mood: opens the mood check-in sheet
 * - affirmation: opens the affirmation card
 * - breathing: opens the breathing screen
 * - selfcare: opens the checklist
 * - chat: opens a new chat
 */
export function handleNotificationNavigation(screen: string, router: Router): void {
  const timestamp = Date.now().toString();

  switch (screen.toLowerCase()) {
    case 'mood':
      // Open the mood check-in sheet
      useMoodStore.getState().openCheckinModal(3);
      router.push({
        pathname: '/(tabs)',
        params: { openMoodCheckin: 'true', t: timestamp },
      });
      break;

    case 'affirmation':
      // Open / focus Today's affirmation card
      router.push({
        pathname: '/(tabs)',
        params: { focus: 'affirmation', t: timestamp },
      });
      break;

    case 'breathing':
      // Open the full-screen guided breathing screen
      router.push('/breathing');
      break;

    case 'selfcare':
      // Open the Self-Care Checklist tab
      router.push({
        pathname: '/(tabs)/activities',
        params: { tab: 'selfcare', t: timestamp },
      });
      break;

    case 'chat':
      // Open a brand new chat with Sola
      router.push({
        pathname: '/(tabs)/chat',
        params: { newChat: 'true', t: timestamp },
      });
      break;

    default:
      // Fallback: Default to home dashboard
      router.push('/(tabs)');
      break;
  }
}

/**
 * Handle notification tap response across foreground, background, and killed states.
 * Guarantees that auth is ready before navigating.
 */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  router: Router
): void {
  const data = response?.notification?.request?.content?.data as
    { screen?: string; [key: string]: any } | undefined;

  const targetScreen = data?.screen;
  if (!targetScreen) {
    return;
  }

  const { isAuthenticated, isLoading } = useAuthStore.getState();

  // If auth is still initializing, queue the pending route and wait
  if (isLoading) {
    setPendingNotification(targetScreen);
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (!state.isLoading) {
        unsubscribe();
        if (state.isAuthenticated) {
          const pending = consumePendingNotification();
          if (pending) {
            handleNotificationNavigation(pending, router);
          }
        }
      }
    });
    return;
  }

  // If not authenticated, store the pending route so it triggers upon login
  if (!isAuthenticated) {
    setPendingNotification(targetScreen);
    return;
  }

  // Auth is ready and authenticated: navigate immediately
  handleNotificationNavigation(targetScreen, router);
}

/**
 * Check for killed-state notification response (cold start tap)
 */
export async function checkLastNotificationResponse(router: Router): Promise<void> {
  try {
    const lastResponse = await Notifications.getLastNotificationResponseAsync();
    if (lastResponse) {
      handleNotificationResponse(lastResponse, router);
    }
  } catch (e) {
    console.warn('Error checking last notification response:', e);
  }
}

/**
 * Schedule a local reminder notification
 */
export async function scheduleLocalReminder(
  title: string,
  body: string,
  secondsFromNow: number,
  screen?: 'mood' | 'affirmation' | 'breathing' | 'selfcare' | 'chat'
): Promise<void> {
  if (Platform.OS === 'web') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data: screen ? { screen } : undefined,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(secondsFromNow, 1),
    },
  });
}

/**
 * Hook to initialize Android notification channel and listen for taps across
 * all 3 app states: foreground, background, and killed (cold start).
 */
export function useNotificationObserver(): void {
  const router = useRouter();

  useEffect(() => {
    // 1. Configure Android channel 'Gentle reminders'
    void setupNotificationChannels();

    // 2. Handle killed state tap (cold start)
    void checkLastNotificationResponse(router);

    // 3. Handle foreground and background notification taps
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response, router);
    });

    return () => {
      subscription.remove();
    };
  }, [router]);
}

/**
 * Checks whether a given time (HH:mm) falls within the quiet hours range.
 * Supports intervals crossing midnight (e.g. 22:00 to 07:00).
 */
export function isTimeInQuietHours(time: string, start: string, end: string): boolean {
  if (!time || !start || !end) return false;
  const [h, m] = time.split(':').map((v) => parseInt(v, 10));
  const [sh, sm] = start.split(':').map((v) => parseInt(v, 10));
  const [eh, em] = end.split(':').map((v) => parseInt(v, 10));

  if (isNaN(h) || isNaN(m) || isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return false;

  const timeMinutes = h * 60 + m;
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  if (startMinutes <= endMinutes) {
    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  } else {
    // Overnight quiet hours (e.g. 22:00 -> 07:00)
    return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
  }
}

export function getGentleBodyForType(type: string): string {
  switch (type) {
    case 'MOOD':
      return 'How is your heart feeling right now? Take a mindful pause with Sola.';
    case 'AFFIRMATION':
      return 'Your daily affirmation is here to ground and inspire your day.';
    case 'BREATHING':
      return 'Time for a gentle breathing pause. Inhale stillness, exhale tension.';
    case 'SELFCARE':
      return 'Take a small, kind step for yourself today.';
    case 'CUSTOM':
    default:
      return 'A quiet moment for your mindful journey with Sola.';
  }
}

export function getScreenForType(type: string): string {
  switch (type) {
    case 'MOOD':
      return 'mood';
    case 'AFFIRMATION':
      return 'affirmation';
    case 'BREATHING':
      return 'breathing';
    case 'SELFCARE':
      return 'selfcare';
    case 'CUSTOM':
    default:
      return 'chat';
  }
}

/**
 * Cancels and reschedules all matching local repeating notifications with expo-notifications
 * so reminders still fire if the device is offline, and cancels or reschedules them whenever
 * settings change (switch toggled, time changed, weekdays changed, quiet hours enabled/altered).
 */
export async function rescheduleLocalReminders(
  reminders: ReminderItem[],
  masterEnabled: boolean,
  quietHours: QuietHoursConfig
): Promise<number> {
  if (Platform.OS === 'web') return 0;

  try {
    // 1. Cancel all previous local scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 2. If master toggle is disabled, leave everything cancelled
    if (!masterEnabled) {
      return 0;
    }

    let scheduledCount = 0;

    // 3. Re-schedule active reminders
    for (const reminder of reminders) {
      if (!reminder.enabled) continue;

      // Skip if this reminder's scheduled time falls during quiet hours
      if (
        quietHours.enabled &&
        isTimeInQuietHours(reminder.time, quietHours.start, quietHours.end)
      ) {
        continue;
      }

      const [hStr, mStr] = reminder.time.split(':');
      const hour = parseInt(hStr, 10);
      const minute = parseInt(mStr, 10);

      if (isNaN(hour) || isNaN(minute)) continue;

      const body = getGentleBodyForType(reminder.type);
      const targetScreen = getScreenForType(reminder.type);

      const repeatDays =
        reminder.days && reminder.days.length > 0 ? reminder.days : [1, 2, 3, 4, 5];

      for (const day of repeatDays) {
        // Expo Notifications: 1 = Sunday, ..., 7 = Saturday
        const weekday = day === 0 ? 1 : day + 1;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: reminder.title,
            body,
            sound: 'default',
            data: { screen: targetScreen },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour,
            minute,
            channelId: ANDROID_CHANNEL_ID,
          },
        });

        scheduledCount++;
      }
    }

    return scheduledCount;
  } catch (e) {
    console.warn('Failed to reschedule local reminders:', e);
    return 0;
  }
}
