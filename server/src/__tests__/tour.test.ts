import request from 'supertest';

jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

import app from '../app';
import { prisma } from '../lib/prisma';
import { signAccessToken } from '../lib/jwt';

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    update: jest.Mock;
  };
};

const baseUser = {
  id: '1e2f3a4b-0000-4000-8000-000000000001',
  name: 'Tour Tester',
  email: 'tour-test@test.solace.local',
  passwordHash: 'hashed-password',
  goals: ['calm'],
  timezone: 'UTC',
  aiMemoryEnabled: true,
  hasSeenTour: false,
  age: null,
  gender: null,
  dateOfBirth: null,
  phoneNumber: null,
  location: null,
  avatarUrl: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const accessToken = signAccessToken({
  sub: baseUser.id,
  email: baseUser.email,
  name: baseUser.name,
});

let currentUser: typeof baseUser;

beforeEach(() => {
  jest.clearAllMocks();
  currentUser = { ...baseUser };
  mockPrisma.user.findUnique.mockImplementation(async () => currentUser);
  mockPrisma.user.findUniqueOrThrow.mockImplementation(async () => currentUser);
  mockPrisma.user.update.mockImplementation(async ({ data }: { data: object }) => {
    currentUser = { ...currentUser, ...data };
    return currentUser;
  });
});

describe('hasSeenTour API contract', () => {
  it('PATCH /api/me persists hasSeenTour and returns it without passwordHash', async () => {
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ hasSeenTour: true });

    expect(res.status).toBe(200);
    expect(res.body.user.hasSeenTour).toBe(true);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: baseUser.id },
      data: { hasSeenTour: true },
    });
  });

  it('GET /api/auth/me returns the stored hasSeenTour flag', async () => {
    currentUser = { ...baseUser, hasSeenTour: true };

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.hasSeenTour).toBe(true);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a non-boolean hasSeenTour value', async () => {
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ hasSeenTour: 'yes' });

    expect(res.status).toBe(400);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    const res = await request(app).patch('/api/me').send({ hasSeenTour: true });
    expect(res.status).toBe(401);
  });
});
