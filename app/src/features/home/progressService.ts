import { apiClient } from '../../api/client';

export interface BadgeItem {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  earnedAt?: string | null;
}

export interface WeeklyMoodAverage {
  week: string;
  startDate: string;
  endDate: string;
  averageMood: number | null;
  count: number;
}

export interface ProgressSummary {
  currentStreak: number;
  bestStreak: number;
  weeklyMoodAverages: WeeklyMoodAverage[];
  activityCountsByType: Record<string, number>;
  badges: BadgeItem[];
}

export const progressService = {
  getProgress: async (): Promise<ProgressSummary> => {
    return apiClient<ProgressSummary>('/progress', {
      method: 'GET',
    });
  },
};
