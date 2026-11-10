import { apiClient } from '../../api/client';

export interface UserMemory {
  id: string;
  userId: string;
  fact: string;
  source: string;
  createdAt: string;
}

export const memoryService = {
  getMemories: async (): Promise<{ memories: UserMemory[] }> => {
    const res = await apiClient<{ items?: UserMemory[]; memories?: UserMemory[] }>('/memories', {
      method: 'GET',
    });
    // The API returns `{ items }`; normalize it to the shape used by the UI.
    return { memories: res?.items ?? res?.memories ?? [] };
  },

  deleteMemory: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiClient<{ success: boolean; message: string }>(`/memories/${id}`, {
      method: 'DELETE',
    });
  },

  toggleAiMemory: async (enabled: boolean): Promise<{ user: { aiMemoryEnabled: boolean } }> => {
    return apiClient<{ user: { aiMemoryEnabled: boolean } }>('/me', {
      method: 'PATCH',
      body: JSON.stringify({ aiMemoryEnabled: enabled }),
    });
  },
};
