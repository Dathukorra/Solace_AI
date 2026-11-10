import { API_BASE_URL } from '../../api/client';
import type { ProfileGender } from '../auth/types';

export const GENDER_OPTIONS: { value: ProfileGender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const MIN_DATE_OF_BIRTH = '1900-01-01';

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isValidDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function calculateAge(dateOfBirth: string, now = new Date()): number {
  const dob = new Date(`${dateOfBirth}T00:00:00.000Z`);
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }

  return Math.max(1, age);
}

export function formatDateOfBirth(value?: string | null): string | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function genderLabel(value?: ProfileGender | string | null): string | null {
  if (!value) return null;
  return GENDER_OPTIONS.find((option) => option.value === value)?.label ?? null;
}

export function normalizePhoneNumber(value: string): string {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return `${hasPlus ? '+' : ''}${digits}`;
}

export function isValidPhoneNumber(value: string): boolean {
  return /^\+?[0-9]{7,15}$/.test(normalizePhoneNumber(value));
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Converts a relative server path such as /uploads/avatars/x.png into a full URL. */
export function resolveAvatarUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;

  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}
