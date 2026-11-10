import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * The tour completion flag is stored per user inside a JSON map under this
 * single key. A map (rather than one key per account) keeps the SecureStore
 * key name stable and lets several accounts share one device independently.
 */
export const TOUR_COMPLETED_STORAGE_KEY = 'tour_completed_v1';

type TourCompletionMap = Record<string, boolean>;

function parseCompletionMap(raw: string | null): TourCompletionMap {
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const map: TourCompletionMap = {};
    for (const [userId, completed] of Object.entries(parsed as Record<string, unknown>)) {
      if (completed === true) map[userId] = true;
    }
    return map;
  } catch {
    return {};
  }
}

async function readCompletionMap(): Promise<TourCompletionMap> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return {};
      return parseCompletionMap(window.localStorage.getItem(TOUR_COMPLETED_STORAGE_KEY));
    }

    const raw = await SecureStore.getItemAsync(TOUR_COMPLETED_STORAGE_KEY);
    return parseCompletionMap(raw);
  } catch {
    return {};
  }
}

async function writeCompletionMap(map: TourCompletionMap): Promise<void> {
  try {
    const value = JSON.stringify(map);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(TOUR_COMPLETED_STORAGE_KEY, value);
      }
      return;
    }

    await SecureStore.setItemAsync(TOUR_COMPLETED_STORAGE_KEY, value);
  } catch {
    // Storage is a convenience. The server flag remains the source of truth
    // after a reinstall, so failing to write locally must never break the tour.
  }
}

export async function hasCompletedTour(userId: string): Promise<boolean> {
  if (!userId) return false;
  const map = await readCompletionMap();
  return map[userId] === true;
}

export async function markTourCompleted(userId: string): Promise<void> {
  if (!userId) return;
  const map = await readCompletionMap();
  if (map[userId] === true) return;

  map[userId] = true;
  await writeCompletionMap(map);
}

/** Clears the local completion flag so the tour can be replayed. */
export async function resetTourCompletion(userId: string): Promise<void> {
  if (!userId) return;
  const map = await readCompletionMap();
  if (!(userId in map)) return;

  delete map[userId];
  await writeCompletionMap(map);
}
