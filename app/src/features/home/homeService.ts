import { apiClient } from '../../api/client';

export interface AISuggestion {
  type: 'breathing' | 'reflection' | 'affirmation' | 'selfcare';
  title: string;
  reason: string;
}

export interface TodayCheckin {
  id: string;
  mood: number;
  emotions: string[];
  note: string | null;
  createdAt: string;
}

export interface TodayAffirmation {
  base: string;
  personalized: string;
}

export interface NextReminder {
  id: string;
  title: string;
  type: string;
  time: string;
  formattedTime: string;
  days: number[];
}

export interface HomeChecklistCounts {
  moods: number;
  conversations: number;
  activities: number;
  reminders: number;
}

export interface HomeDashboardResponse {
  greeting: string;
  todayCheckinDone: boolean;
  todayCheckin: TodayCheckin | null;
  todayAffirmation: TodayAffirmation;
  suggestion: AISuggestion;
  streak: number;
  nextReminder: NextReminder | null;
  counts?: HomeChecklistCounts;
}

export interface MoodLogPayload {
  mood: number; // 1 - 5
  emotions?: string[];
  note?: string;
  localDate?: string;
}

export interface MoodHistoryItem {
  id: string;
  mood: number;
  emotions: string[];
  note: string | null;
  localDate: string;
  createdAt: string;
}

export interface MoodHistoryResponse {
  range: string;
  count: number;
  averageMood: number | null;
  today?: string;
  moods: MoodHistoryItem[];
}

export const homeService = {
  getHomeDashboard: async (): Promise<HomeDashboardResponse> => {
    return apiClient<HomeDashboardResponse>('/home', {
      method: 'GET',
    });
  },

  postMoodCheckin: async (
    payload: MoodLogPayload
  ): Promise<{ mood: MoodHistoryItem; updated: boolean; localDate: string }> => {
    const res = await apiClient<{
      success: boolean;
      data: MoodHistoryItem;
      isUpdated: boolean;
      localDate: string;
    }>('/moods', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Map the API envelope to the shape consumed by the app.
    return {
      mood: res.data,
      updated: res.isUpdated,
      localDate: res.localDate,
    };
  },

  getMoodHistory: async (range: '7d' | '30d' = '7d'): Promise<MoodHistoryResponse> => {
    const res = await apiClient<{
      range: string;
      totalCount?: number;
      count?: number;
      averageMood: number | null;
      today?: string;
      items?: MoodHistoryItem[];
      moods?: MoodHistoryItem[];
    }>(`/moods?range=${range}`, {
      method: 'GET',
    });

    // The API returns `{ totalCount, items }`; normalize to the UI contract.
    return {
      range: res.range,
      count: res.totalCount ?? res.count ?? 0,
      averageMood: res.averageMood ?? null,
      today: res.today,
      moods: res.items ?? res.moods ?? [],
    };
  },
};
