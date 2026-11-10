import { apiClient } from '../../api/client';

export type ActivityType =
  'BREATHING' | 'MEDITATION' | 'JOURNALING' | 'MOVEMENT' | 'REFLECTION' | 'BODY_SCAN';

export interface ActivityPayload {
  type: ActivityType;
  durationSec: number;
}

export interface ActivityResponse {
  id: string;
  userId: string;
  type: ActivityType;
  durationSec: number;
  completedAt: string;
}

export const activityService = {
  postActivity: async (
    payload: ActivityPayload
  ): Promise<{ success: boolean; data: ActivityResponse }> => {
    return apiClient<{ success: boolean; data: ActivityResponse }>('/activities', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
