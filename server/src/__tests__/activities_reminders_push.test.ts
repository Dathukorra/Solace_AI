import request from 'supertest';
import app from '../app';
import { signAccessToken } from '../lib/jwt';

describe('Activities, Reminders & Push Tokens Routes & Guards', () => {
  const token = signAccessToken({
    sub: '00000000-0000-0000-0000-000000000077',
    email: 'activity_test@solace.local',
    name: 'Activity Test',
  });

  describe('Unauthenticated 401 Guards', () => {
    it('POST /activities — 401 without auth token', async () => {
      const res = await request(app)
        .post('/activities')
        .send({ type: 'BREATHING', durationSec: 180 });
      expect(res.status).toBe(401);
    });

    it('GET /reminders — 401 without auth token', async () => {
      const res = await request(app).get('/reminders');
      expect(res.status).toBe(401);
    });

    it('POST /reminders — 401 without auth token', async () => {
      const res = await request(app)
        .post('/reminders')
        .send({ type: 'AFFIRMATION', title: 'Test', time: '09:00', days: [1] });
      expect(res.status).toBe(401);
    });

    it('POST /push-tokens — 401 without auth token', async () => {
      const res = await request(app)
        .post('/push-tokens')
        .send({ token: 'ExponentPushToken[xxxx]' });
      expect(res.status).toBe(401);
    });
  });

  describe('Validation 400 Guards', () => {
    it('POST /activities — 400 with invalid activity type', async () => {
      const res = await request(app)
        .post('/activities')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'INVALID_TYPE', durationSec: 120 });
      expect(res.status).toBe(400);
    });

    it('POST /activities — 400 with non-positive duration', async () => {
      const res = await request(app)
        .post('/activities')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'BREATHING', durationSec: -10 });
      expect(res.status).toBe(400);
    });

    it('POST /reminders — 400 with invalid time format (not HH:mm)', async () => {
      const res = await request(app)
        .post('/reminders')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'MOOD', title: 'Check-in', time: '25:70', days: [1] });
      expect(res.status).toBe(400);
    });

    it('POST /reminders — 400 with invalid days (e.g. 7)', async () => {
      const res = await request(app)
        .post('/reminders')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'BREATHING', title: 'Breath', time: '08:00', days: [7] });
      expect(res.status).toBe(400);
    });

    it('POST /push-tokens — 400 when token is empty', async () => {
      const res = await request(app)
        .post('/push-tokens')
        .set('Authorization', `Bearer ${token}`)
        .send({ token: '' });
      expect(res.status).toBe(400);
    });
  });
});
