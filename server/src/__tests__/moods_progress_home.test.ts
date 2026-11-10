import request from 'supertest';
import app from '../app';
import { signAccessToken } from '../lib/jwt';

describe('Moods, Progress & Home Routes Validation & Guards', () => {
  const token = signAccessToken({
    sub: '00000000-0000-0000-0000-000000000099',
    email: 'guard_test@solace.local',
    name: 'Guard Test',
  });

  describe('Unauthenticated 401 Guards', () => {
    it('POST /moods — 401 without auth token', async () => {
      const res = await request(app)
        .post('/moods')
        .send({ mood: 3, emotions: ['calm'] });
      expect(res.status).toBe(401);
    });

    it('GET /moods — 401 without auth token', async () => {
      const res = await request(app).get('/moods');
      expect(res.status).toBe(401);
    });

    it('GET /progress — 401 without auth token', async () => {
      const res = await request(app).get('/progress');
      expect(res.status).toBe(401);
    });

    it('GET /home — 401 without auth token', async () => {
      const res = await request(app).get('/home');
      expect(res.status).toBe(401);
    });
  });

  describe('Validation 400 Guards', () => {
    it('POST /moods — 400 when mood is less than 1', async () => {
      const res = await request(app)
        .post('/moods')
        .set('Authorization', `Bearer ${token}`)
        .send({ mood: 0, emotions: ['tired'] });
      expect(res.status).toBe(400);
    });

    it('POST /moods — 400 when mood is greater than 5', async () => {
      const res = await request(app)
        .post('/moods')
        .set('Authorization', `Bearer ${token}`)
        .send({ mood: 6, emotions: ['ecstatic'] });
      expect(res.status).toBe(400);
    });

    it('GET /moods?range=90d — 400 when range is invalid', async () => {
      const res = await request(app)
        .get('/moods?range=90d')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });
});
