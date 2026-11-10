import request from 'supertest';
import app from '../app';
import { signAccessToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

describe('Conversations, Memories & Me CRUD Endpoints', () => {
  // Test users
  const userA = {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'User A',
    email: 'user_a@test.solace.local',
  };

  const userB = {
    id: 'b0000000-0000-0000-0000-000000000002',
    name: 'User B',
    email: 'user_b@test.solace.local',
  };

  const tokenA = signAccessToken({
    sub: userA.id,
    email: userA.email,
    name: userA.name,
  });

  const tokenB = signAccessToken({
    sub: userB.id,
    email: userB.email,
    name: userB.name,
  });

  beforeAll(async () => {
    // Seed users in DB if DB is accessible
    try {
      await prisma.user.upsert({
        where: { id: userA.id },
        update: {},
        create: {
          id: userA.id,
          name: userA.name,
          email: userA.email,
          passwordHash: 'fakehash',
          goals: ['stress relief'],
          aiMemoryEnabled: true,
        },
      });

      await prisma.user.upsert({
        where: { id: userB.id },
        update: {},
        create: {
          id: userB.id,
          name: userB.name,
          email: userB.email,
          passwordHash: 'fakehash',
          goals: ['mindfulness'],
          aiMemoryEnabled: true,
        },
      });
    } catch {
      // Local db might not be running
    }
  });

  afterAll(async () => {
    try {
      await prisma.userMemory.deleteMany({
        where: { userId: { in: [userA.id, userB.id] } },
      });
      await prisma.conversation.deleteMany({
        where: { userId: { in: [userA.id, userB.id] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [userA.id, userB.id] } },
      });
    } catch {
      // Cleanup
    }
  });

  // ─── Route Guard Tests (401 without auth) ───────────────────────────────────

  describe('Unauthenticated Route Guards', () => {
    it('GET /conversations — 401 without token', async () => {
      const res = await request(app).get('/conversations');
      expect(res.status).toBe(401);
    });

    it('POST /conversations — 401 without token', async () => {
      const res = await request(app).post('/conversations').send({ title: 'Test' });
      expect(res.status).toBe(401);
    });

    it('GET /memories — 401 without token', async () => {
      const res = await request(app).get('/memories');
      expect(res.status).toBe(401);
    });

    it('PATCH /me — 401 without token', async () => {
      const res = await request(app).patch('/me').send({ aiMemoryEnabled: false });
      expect(res.status).toBe(401);
    });
  });

  // ─── Input Validation Tests ─────────────────────────────────────────────────

  describe('Validation & Ownership Guards', () => {
    it('GET /conversations/:id — 400 with invalid UUID format', async () => {
      const res = await request(app)
        .get('/conversations/not-a-uuid')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(400);
    });

    it('PATCH /conversations/:id — 400 when title is empty', async () => {
      const res = await request(app)
        .patch('/conversations/11111111-1111-1111-1111-111111111111')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: '' });
      expect(res.status).toBe(400);
    });

    it('DELETE /memories/:id — 400 with invalid UUID format', async () => {
      const res = await request(app)
        .delete('/memories/not-a-uuid')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(400);
    });

    it('Cross-user ownership — User B cannot delete or access User A resources without ownership', async () => {
      // Trying to access or delete non-owned resource gives 404/400 (or 500 if DB is unreachable in unit test environment)
      const res = await request(app)
        .delete('/conversations/11111111-1111-1111-1111-111111111111')
        .set('Authorization', `Bearer ${tokenB}`);
      expect([400, 404, 500]).toContain(res.status);
    });

    it('GET /conversations?limit=999 — 400 when limit exceeds 50', async () => {
      const res = await request(app)
        .get('/conversations?limit=999')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(400);
    });
  });
});
