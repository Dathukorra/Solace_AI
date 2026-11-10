import { apiClient } from '../../api/client';
import { ReminderItem, CreateReminderInput, UpdateReminderInput } from './types';

export const reminderService = {
  getReminders: async (): Promise<ReminderItem[]> => {
    const res = await apiClient<{ items?: ReminderItem[]; reminders?: ReminderItem[] }>(
      '/reminders',
      {
        method: 'GET',
      }
    );
    // The API returns `{ items }`; keep `reminders` as a compatibility fallback.
    return res?.items ?? res?.reminders ?? [];
  },

  createReminder: async (input: CreateReminderInput): Promise<ReminderItem> => {
    const res = await apiClient<{ reminder: ReminderItem }>('/reminders', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.reminder;
  },

  updateReminder: async (id: string, input: UpdateReminderInput): Promise<ReminderItem> => {
    const res = await apiClient<{ reminder: ReminderItem }>(`/reminders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return res.reminder;
  },

  deleteReminder: async (id: string): Promise<void> => {
    await apiClient<{ message?: string }>(`/reminders/${id}`, {
      method: 'DELETE',
    });
  },

  registerPushToken: async (token: string, platform?: string): Promise<void> => {
    await apiClient<{ message?: string }>('/push-tokens', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
  },
};
