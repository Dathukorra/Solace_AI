import request from 'supertest';
import { readdir, unlink } from 'fs/promises';
import path from 'path';
import app from '../app';
import { prisma } from '../lib/prisma';
import { AVATAR_DIR } from '../lib/avatar';
import { calculateAge, parseDateOnly } from '../lib/profile';

const prefix = `profile_test_${Date.now()}`;
const testEmail = `${prefix}@test.solace.local`;
const otherEmail = `${prefix}_other@test.solace.local`;
const password = 'Password1';

// 1x1 transparent PNG
const pngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nQAAAABJRU5ErkJggg==';

let accessToken = '';
let otherAccessToken = '';
let userId = '';
let otherUserId = '';

async function signup(email: string, name: string) {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ name, email, password, goals: [], timezone: 'UTC' });
  expect(res.status).toBe(201);
  return res.body as { accessToken: string; user: { id: string } };
}

beforeAll(async () => {
  const user = await signup(testEmail, 'Profile Tester');
  accessToken = user.accessToken;
  userId = user.user.id;

  const other = await signup(otherEmail, 'Other Tester');
  otherAccessToken = other.accessToken;
  otherUserId = other.user.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });

  const files = await readdir(AVATAR_DIR).catch(() => [] as string[]);
  await Promise.all(
    files
      .filter((file) => file.startsWith(`${userId}-`) || file.startsWith(`${otherUserId}-`))
      .map((file) => unlink(path.join(AVATAR_DIR, file)).catch(() => {}))
  );
});

describe('GET /api/auth/me profile fields', () => {
  it('200 — returns new fields without passwordHash', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      age: null,
      gender: null,
      dateOfBirth: null,
      phoneNumber: null,
      location: null,
      avatarUrl: null,
    });
    expect(res.body.user.passwordHash).toBeUndefined();
  });
});

describe('PATCH /api/auth/me profile updates', () => {
  it('200 — saves full personal information', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Profile Tester',
        age: 32,
        gender: 'female',
        dateOfBirth: '1992-06-15',
        phoneNumber: '+15551234567',
        location: 'Portland, OR',
      });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      name: 'Profile Tester',
      age: 32,
      gender: 'female',
      dateOfBirth: '1992-06-15',
      phoneNumber: '+15551234567',
      location: 'Portland, OR',
    });
  });

  it('200 — preserves fields that were not sent', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Updated Name');
    expect(res.body.user.age).toBe(32);
    expect(res.body.user.gender).toBe('female');
    expect(res.body.user.dateOfBirth).toBe('1992-06-15');
    expect(res.body.user.phoneNumber).toBe('+15551234567');
  });

  it('200 — derives age from date of birth when age is omitted', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dateOfBirth: '2000-01-01' });

    expect(res.status).toBe(200);
    expect(res.body.user.age).toBe(calculateAge(parseDateOnly('2000-01-01')));
  });

  it('200 — saving with unchanged values is a no-op success', async () => {
    const before = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: before.body.user.name,
        email: before.body.user.email,
        age: before.body.user.age,
        gender: before.body.user.gender,
        dateOfBirth: before.body.user.dateOfBirth,
        phoneNumber: before.body.user.phoneNumber,
        location: before.body.user.location,
        goals: before.body.user.goals,
      });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe(before.body.user.name);
    expect(res.body.user.age).toBe(before.body.user.age);
    expect(res.body.user.dateOfBirth).toBe(before.body.user.dateOfBirth);
  });

  it('200 — sets and then removes a profile picture', async () => {
    const upload = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ avatar: pngDataUrl });

    expect(upload.status).toBe(200);
    expect(upload.body.user.avatarUrl).toMatch(/^\/uploads\/avatars\/.+\.png$/);

    const avatarUrl = upload.body.user.avatarUrl as string;
    const image = await request(app).get(avatarUrl);
    expect(image.status).toBe(200);
    expect(image.headers['content-type']).toMatch(/image\/png/);

    const remove = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ avatar: null });

    expect(remove.status).toBe(200);
    expect(remove.body.user.avatarUrl).toBeNull();

    const gone = await request(app).get(avatarUrl);
    expect(gone.status).toBe(404);
  });

  it('200 — updates email and the new email can log in', async () => {
    const updatedEmail = `${prefix}_updated@test.solace.local`;
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: updatedEmail });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(updatedEmail);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: updatedEmail, password });
    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe(updatedEmail);
  });

  it('409 — rejects an email that belongs to another user', async () => {
    const current = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: current.body.user.email === otherEmail ? 'taken@test.solace.local' : otherEmail,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already in use/i);
  });

  it('400 — rejects blank names, invalid ages, genders, dates, email, phone, and location', async () => {
    const invalidBodies = [
      { name: '' },
      { age: 0 },
      { age: 1.5 },
      { age: 121 },
      { gender: 'unknown' },
      { dateOfBirth: '2024-02-31' },
      { dateOfBirth: '2999-01-01' },
      { dateOfBirth: '01/01/1990' },
      { email: 'not-an-email' },
      { phoneNumber: 'abc' },
      { location: 'x'.repeat(121) },
    ];

    for (const body of invalidBodies) {
      const res = await request(app)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(body);
      expect(res.status).toBe(400);
    }
  });

  it('401 — requires authentication', async () => {
    const res = await request(app).patch('/api/auth/me').send({ name: 'No Auth' });
    expect(res.status).toBe(401);
  });
});

describe('Profile isolation', () => {
  it('only updates the authenticated user', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Only This User' });
    expect(res.status).toBe(200);

    const other = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${otherAccessToken}`);
    expect(other.status).toBe(200);
    expect(other.body.user.name).toBe('Other Tester');
  });
});
