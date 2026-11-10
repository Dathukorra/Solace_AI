import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Small per-user onboarding preferences live in one JSON map per feature so
 * the SecureStore key names stay stable while several accounts can share a
 * device independently.
 */
export const GETTING_STARTED_DISMISSED_KEY = 'solace_getting_started_v1';
export const FEATURE_HINTS_KEY = 'solace_feature_hints_v1';

type BooleanMap = Record<string, boolean>;
type HintMap = Record<string, string[]>;

function parseBooleanMap(raw: string | null): BooleanMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const map: BooleanMap = {};
    for (const [userId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value === true) map[userId] = true;
    }
    return map;
  } catch {
    return {};
  }
}

function parseHintMap(raw: string | null): HintMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const map: HintMap = {};
    for (const [userId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      map[userId] = value.filter((hint): hint is string => typeof hint === 'string');
    }
    return map;
  } catch {
    return {};
  }
}

async function readValue(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeValue(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Storage is a convenience; onboarding must never block on it.
  }
}

export async function hasDismissedGettingStarted(userId: string): Promise<boolean> {
  if (!userId) return false;
  const map = parseBooleanMap(await readValue(GETTING_STARTED_DISMISSED_KEY));
  return map[userId] === true;
}

export async function dismissGettingStarted(userId: string): Promise<void> {
  if (!userId) return;
  const map = parseBooleanMap(await readValue(GETTING_STARTED_DISMISSED_KEY));
  if (map[userId] === true) return;
  map[userId] = true;
  await writeValue(GETTING_STARTED_DISMISSED_KEY, JSON.stringify(map));
}

export async function getDismissedFeatureHints(userId: string): Promise<string[]> {
  if (!userId) return [];
  const map = parseHintMap(await readValue(FEATURE_HINTS_KEY));
  return map[userId] ?? [];
}

export async function markFeatureHintDismissed(userId: string, hintId: string): Promise<void> {
  if (!userId || !hintId) return;
  const map = parseHintMap(await readValue(FEATURE_HINTS_KEY));
  const current = map[userId] ?? [];
  if (current.includes(hintId)) return;
  map[userId] = [...current, hintId];
  await writeValue(FEATURE_HINTS_KEY, JSON.stringify(map));
}
