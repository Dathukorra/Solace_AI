import { create } from 'zustand';

export type MoodLevel = 'great' | 'good' | 'okay' | 'low' | 'rough';

export interface MoodEntry {
  id: string;
  mood: MoodLevel;
  note?: string;
  tags: string[];
  createdAt: string;
}

interface MoodState {
  entries: MoodEntry[];
  currentMood: MoodLevel | null;
  isCheckinModalOpen: boolean;
  targetInitialMood: number;
  openCheckinModal: (initialMood?: number) => void;
  closeCheckinModal: () => void;
  setCurrentMood: (mood: MoodLevel | null) => void;
  addEntry: (entry: Omit<MoodEntry, 'id' | 'createdAt'>) => void;
}

export const useMoodStore = create<MoodState>((set) => ({
  entries: [],
  currentMood: null,
  isCheckinModalOpen: false,
  targetInitialMood: 3,
  openCheckinModal: (initialMood = 3) =>
    set({ isCheckinModalOpen: true, targetInitialMood: initialMood }),
  closeCheckinModal: () => set({ isCheckinModalOpen: false }),
  setCurrentMood: (mood) => set({ currentMood: mood }),
  addEntry: (entry) =>
    set((state) => ({
      entries: [
        {
          ...entry,
          id: Math.random().toString(36).substring(2, 9),
          createdAt: new Date().toISOString(),
        },
        ...state.entries,
      ],
    })),
}));
