import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const testEmail = `jest_${Date.now()}@test.solace.local`;

const validSignup = {
  name: 'Jest User',
  email: testEmail,
  password: 'Password1',
  goals: ['reduce stress'],
  timezone: 'UTC',
};

// ─── Cleanup ──────────────────────────────────────────────────────────────────

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@test.solace.local' } } });
});

// ─── POST /api/auth/signup ────────────────────────────────────────────────────

describe('POST /api/auth/signup', () => {
  it('201 — creates user and returns tokens', async () => {
    const res = await request(app).post('/api/auth/signup').send(validSignup);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      expiresIn: 900,
      user: {
        id: expect.any(String),
        name: validSignup.name,
        email: validSignup.email,
      },
    });
    // passwordHash must NOT leak
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('409 — duplicate email', async () => {
    const res = await request(app).post('/api/auth/signup').send(validSignup);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('400 — invalid body (missing email)', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'X', password: 'Password1', goals: [] });
    expect(res.status).toBe(400);
  });

  it('400 — weak password (no uppercase)', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        ...validSignup,
        email: `weak_${Date.now()}@test.solace.local`,
        password: 'password1',
      });
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('200 — returns tokens for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validSignup.email, password: validSignup.password });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      expiresIn: 900,
    });
  });

  it('401 — wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validSignup.email, password: 'WrongPass1' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('401 — unknown email (same message, no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.solace.local', password: 'Password1' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  let refreshToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validSignup.email, password: validSignup.password });
    refreshToken = res.body.refreshToken;
  });

  it('200 — returns new access token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      accessToken: expect.any(String),
      expiresIn: 900,
    });
  });

  it('401 — invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'not.a.valid.token' });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validSignup.email, password: validSignup.password });
    accessToken = res.body.accessToken;
  });

  it('200 — returns current user (no passwordHash)', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validSignup.email);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('401 — no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Authentication token required');
  });

  it('401 — invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid or expired token');
  });
});

// ─── PATCH /api/auth/me ───────────────────────────────────────────────────────

describe('PATCH /api/auth/me', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validSignup.email, password: validSignup.password });
    accessToken = res.body.accessToken;
  });

  it('200 — updates name and goals', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Name', goals: ['better sleep', 'mindfulness'] });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Updated Name');
    expect(res.body.user.goals).toEqual(['better sleep', 'mindfulness']);
  });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe('Rate limiting on auth routes', () => {
  it('429 — after 10 failed login attempts', async () => {
    const badLogin = { email: 'rl@test.solace.local', password: 'WrongPass1' };
    const requests = Array.from({ length: 11 }, () =>
      request(app).post('/api/auth/login').send(badLogin)
    );
    const results = await Promise.all(requests);
    const statuses = results.map((r) => r.status);
    expect(statuses).toContain(429);
  });
});
