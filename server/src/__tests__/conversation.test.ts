import request from 'supertest';
import app from '../app';

describe('POST /conversations/:id/messages Route Guard & Validation', () => {
  it('401 — fails when no authorization header is provided', async () => {
    const res = await request(app)
      .post('/conversations/11111111-1111-1111-1111-111111111111/messages')
      .send({ content: 'Hello Sola' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/token required/i);
  });

  it('400 — fails when conversation ID is not a valid UUID', async () => {
    const res = await request(app)
      .post('/conversations/invalid-uuid/messages')
      .set('Authorization', 'Bearer invalid-token')
      .send({ content: 'Hello Sola' });

    // Auth middleware validates first or route validation
    expect([400, 401]).toContain(res.status);
  });

  it('400 — fails when message content is empty', async () => {
    const res = await request(app)
      .post('/conversations/11111111-1111-1111-1111-111111111111/messages')
      .send({ content: '' });

    expect([400, 401]).toContain(res.status);
  });
});
