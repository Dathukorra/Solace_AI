import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

export interface RegisterPushTokenDto {
  userId: string;
  token: string;
  platform?: string;
}

export async function registerDevicePushToken({
  userId,
  token,
  platform = 'unknown',
}: RegisterPushTokenDto) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Upsert token per device: if token already exists, associate it with this user/platform
  const pushToken = await prisma.pushToken.upsert({
    where: { token: token.trim() },
    update: {
      userId,
      platform: platform.trim().toLowerCase(),
    },
    create: {
      userId,
      token: token.trim(),
      platform: platform.trim().toLowerCase(),
    },
  });

  return pushToken;
}
