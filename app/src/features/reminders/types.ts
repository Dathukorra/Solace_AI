export type ReminderType =
  | 'MOOD'
  | 'AFFIRMATION'
  | 'BREATHING'
  | 'SELFCARE'
  | 'CUSTOM'
  | 'MINDFULNESS'
  | 'HYDRATION'
  | 'GRATITUDE'
  | 'CHECK_IN'
  | 'WIND_DOWN'
  | 'BREATHWORK';

export interface ReminderItem {
  id: string;
  userId?: string;
  title: string;
  time: string; // HH:mm
  days: number[]; // 0-6
  enabled: boolean;
  type: ReminderType;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateReminderInput {
  title: string;
  time: string;
  days: number[];
  type: ReminderType;
  enabled?: boolean;
}

export interface UpdateReminderInput {
  title?: string;
  time?: string;
  days?: number[];
  type?: ReminderType;
  enabled?: boolean;
}

export interface QuietHoursConfig {
  enabled: boolean;
  start: string; // HH:mm (e.g. "22:00")
  end: string; // HH:mm (e.g. "07:00")
}
