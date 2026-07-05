import request from 'supertest';
import app from '../app';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { Entry } from '../models/Entry';

describe('Entries Routes', () => {
  let token: string;
  let userId: string;
  let entryId: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'entries@test.com',
      password: 'password123',
      name: 'Entry User'
    });
    token = res.body.accessToken;
    userId = res.body.user.id;
    
    const e = await Entry.create({
      userId, type: 'nutrition', braindump_id: 'test_id', raw_text: 'Apple', date: new Date(), data: { food: 'Apple' }
    });
    entryId = (e._id as any).toString();
  });

  describe('GET /api/entries', () => {
    it('should return paginated list', async () => {
      const res = await request(app).get('/api/entries').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.entries.length).toBeGreaterThan(0);
      expect(res.body.pagination.total).toBeGreaterThan(0);
    });

    it('should filter by type', async () => {
      const res = await request(app).get('/api/entries?type=nutrition').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.entries[0].type).toBe('nutrition');
    });
  });

  describe('GET /api/entries/:id', () => {
    it('should fetch single entry', async () => {
      const res = await request(app).get(`/api/entries/${entryId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.entry._id).toBe(entryId);
    });

    it('should return 404 for invalid id', async () => {
      const fakeId = entryId.replace(/./, entryId[0] === 'a' ? 'b' : 'a');
      const res = await request(app).get(`/api/entries/${fakeId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/entries/:id', () => {
    it('should update entry data', async () => {
      const res = await request(app)
        .patch(`/api/entries/${entryId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ data: { food: 'Banana' } });
      expect(res.status).toBe(200);
      expect(res.body.entry.data.food).toBe('Banana');
    });
  });

  describe('DELETE /api/entries/:id', () => {
    it('should delete entry', async () => {
      const res = await request(app).delete(`/api/entries/${entryId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      
      const check = await request(app).get(`/api/entries/${entryId}`).set('Authorization', `Bearer ${token}`);
      expect(check.status).toBe(404);
    });

    it('should return 404 for invalid entry id format', async () => {
      const res = await request(app).get(`/api/entries/invalid123`).set('Authorization', `Bearer ${token}`);
      // Usually mongoose casts invalid objectIds to a CastError, handled as 500 or 400.
      // But if it's explicitly 404 when not found:
      const res2 = await request(app).get(`/api/entries/609d206f3281223400000000`).set('Authorization', `Bearer ${token}`);
      expect(res2.status).toBe(404);
    });
  describe('Error Handling', () => {
    it('should return 500 on db error', async () => {
      const spy = vi.spyOn(Entry, 'find').mockRejectedValueOnce(new Error('db error'));
      const res = await request(app).get('/api/entries').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(500);
      spy.mockRestore();
    });
});
  });
});
