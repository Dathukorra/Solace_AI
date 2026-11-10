import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

export async function getUserMemories(userId: string) {
  const memories = await prisma.userMemory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return memories;
}

export async function deleteUserMemory({ memoryId, userId }: { memoryId: string; userId: string }) {
  const existing = await prisma.userMemory.findFirst({
    where: { id: memoryId, userId },
  });

  if (!existing) {
    throw new AppError('Memory not found', 404);
  }

  await prisma.userMemory.delete({
    where: { id: memoryId },
  });

  return { success: true, message: 'Memory deleted' };
}
