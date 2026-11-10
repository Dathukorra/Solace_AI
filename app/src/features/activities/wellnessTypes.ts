export interface JournalEntry {
  id: string;
  prompt: string;
  content: string;
  createdAt: string;
}

export interface SelfCareChallenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  completed: boolean;
  activityType: 'MOVEMENT' | 'REFLECTION' | 'BODY_SCAN' | 'MEDITATION' | 'BREATHING' | 'JOURNALING';
  durationSec: number;
}
