export const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const;
export type Gender = (typeof GENDERS)[number];

/** True when a YYYY-MM-DD string represents a real calendar date. */
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

/** Parses YYYY-MM-DD as a UTC date so time zones cannot shift the birthday. */
export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function calculateAge(dateOfBirth: Date, now = new Date()): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dateOfBirth.getUTCMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())) {
    age -= 1;
  }

  return Math.max(1, age);
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
