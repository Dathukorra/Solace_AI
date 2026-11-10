import { ActivityType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

export interface CreateActivityDto {
  userId: string;
  type: ActivityType;
  durationSec: number;
}

export async function recordCompletedActivity({ userId, type, durationSec }: CreateActivityDto) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const activity = await prisma.activity.create({
    data: {
      userId,
      type,
      durationSec,
      completedAt: new Date(),
    },
  });

  return activity;
}
