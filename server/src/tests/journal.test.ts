import request from 'supertest';
import app from '../app';
import { describe, it, expect, beforeAll } from 'vitest';

describe('Journal Routes', () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'journal@test.com',
      password: 'password123',
      name: 'Journal User'
    });
    token = res.body.accessToken;
  });

  describe('POST /api/journal', () => {
    it('should create a new journal entry', async () => {
      const res = await request(app)
        .post('/api/journal')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'This is a test journal entry' });
      
      expect(res.status).toBe(201);
      expect(res.body.entry.raw_text).toBe('This is a test journal entry');
      expect(res.body.entry.type).toBe('journal');
    });
  });

  describe('GET /api/journal/recent', () => {
    it('should return recent journal entries', async () => {
      const res = await request(app)
        .get('/api/journal/recent')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.entries.length).toBe(1);
    });
  });
});
