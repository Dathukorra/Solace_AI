import { prisma } from '../lib/prisma';

export interface CreateMoodCheckinDTO {
  userId: string;
  mood: number; // 1-5 scale
  emotions?: string[];
  note?: string;
}

export class MoodService {
  static async createEntry(data: CreateMoodCheckinDTO) {
    return prisma.moodCheckin.create({
      data: {
        userId: data.userId,
        mood: data.mood,
        emotions: data.emotions || [],
        note: data.note,
      },
    });
  }

  static async getEntries(userId: string) {
    return prisma.moodCheckin.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
