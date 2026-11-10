import request from 'supertest';
import { createHash } from 'crypto';
import app from '../app';
import { prisma } from '../lib/prisma';

const testEmail = `reset_test_${Date.now()}@test.solace.local`;
const initialPassword = 'Password1';
const newPassword = 'NewPassword2';

let resetToken = '';
let userId = '';

beforeAll(async () => {
  const res = await request(app).post('/api/auth/signup').send({
    name: 'Reset Test User',
    email: testEmail,
    password: initialPassword,
    goals: [],
    timezone: 'UTC',
  });
  expect(res.status).toBe(201);

  const user = await prisma.user.findUniqueOrThrow({ where: { email: testEmail } });
  userId = user.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { startsWith: 'reset_test_' } },
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('200 — creates a hashed, single-use token for an existing account', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: testEmail });

    expect(res.status).toBe(200);
    expect(res.body.resetToken).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.resetUrl).toContain(res.body.resetToken);
    expect(res.body.expiresInMinutes).toBe(30);

    resetToken = res.body.resetToken;

    const stored = await prisma.passwordResetToken.findMany({ where: { userId } });
    expect(stored).toHaveLength(1);
    // The raw token must never be stored in the database.
    expect(stored[0].tokenHash).not.toBe(resetToken);
    expect(stored[0].tokenHash).toBe(createHash('sha256').update(resetToken).digest('hex'));
  });

  it('200 — returns the same generic message for an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: `nobody_${Date.now()}@test.solace.local` });

    expect(res.status).toBe(200);
    expect(res.body.resetToken).toBeUndefined();
    expect(res.body.message).toMatch(/if an account exists/i);
  });

  it('400 — rejects a missing email', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/reset-password', () => {
  it('400 — rejects a weak new password', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: 'weakpass' });

    expect(res.status).toBe(400);
  });

  it('400 — rejects an invalid token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'a'.repeat(64), password: newPassword });

    expect(res.status).toBe(400);
  });

  it('400 — rejects an expired token and cleans it up', async () => {
    const expiredUser = await prisma.user.create({
      data: {
        name: 'Expired Reset User',
        email: `reset_test_expired_${Date.now()}@test.solace.local`,
        passwordHash: 'fakehash',
        goals: [],
        timezone: 'UTC',
      },
    });

    const expiredToken = 'b'.repeat(64);
    await prisma.passwordResetToken.create({
      data: {
        userId: expiredUser.id,
        tokenHash: createHash('sha256').update(expiredToken).digest('hex'),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: expiredToken, password: newPassword });

    expect(res.status).toBe(400);

    const remaining = await prisma.passwordResetToken.count({ where: { userId: expiredUser.id } });
    expect(remaining).toBe(0);
  });

  it('200 — updates the password and invalidates the token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: newPassword });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(testEmail);
    expect(res.body.passwordHash).toBeUndefined();

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: initialPassword });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: newPassword });
    expect(newLogin.status).toBe(200);

    const reused = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: 'AnotherPass3' });
    expect(reused.status).toBe(400);

    const remaining = await prisma.passwordResetToken.count({ where: { userId } });
    expect(remaining).toBe(0);
  });
});
