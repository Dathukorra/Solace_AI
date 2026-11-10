import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import { prisma } from '../lib/prisma';

jest.setTimeout(30_000);

// Mock expo-server-sdk so tests don't make real push API calls and avoid ESM issues in Jest
jest.mock('expo-server-sdk', () => {
  return {
    Expo: class MockExpo {
      static isExpoPushToken(token: string) {
        return (
          typeof token === 'string' &&
          (token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken'))
        );
      }
      chunkPushNotifications(messages: unknown[]) {
        return [messages];
      }
      async sendPushNotificationsAsync(chunk: unknown[]) {
        return chunk.map(() => ({ status: 'ok', id: 'fake-receipt-id-123' }));
      }
      chunkPushNotificationReceiptIds(ids: string[]) {
        return [ids];
      }
      async getPushNotificationReceiptsAsync(chunk: string[]) {
        const result: Record<string, unknown> = {};
        for (const id of chunk) {
          result[id] = { status: 'ok' };
        }
        return result;
      }
    },
  };
});

beforeAll(async () => {
  try {
    await prisma.$connect();
  } catch {
    // Database may not be running in isolated unit test environments
  }
});

afterAll(async () => {
  try {
    await prisma.$disconnect();
  } catch {
    // Ignore disconnect error if not connected
  }
});
