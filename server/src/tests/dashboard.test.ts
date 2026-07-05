import request from 'supertest';
import app from '../app';
import { describe, it, expect, beforeAll } from 'vitest';
import { Entry } from '../models/Entry';
import { HabitLog } from '../models/HabitLog';

describe('Dashboard Routes', () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'dashboard@test.com',
      password: 'password123',
      name: 'Dash User'
    });
    token = res.body.accessToken;
    userId = res.body.user.id;
  });

  describe('GET /api/dashboard/today', () => {
    it('should return empty entries and habits if none exist', async () => {
      const res = await request(app)
        .get('/api/dashboard/today')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.entries).toEqual([]);
      expect(res.body.habits).toEqual([]);
    });

    it('should fetch todays entries and habits', async () => {
      const today = new Date();
      await Entry.create({ userId, type: 'journal', braindump_id: 'x', raw_text: 'y', date: today, data: { text: 'test' }});
      await HabitLog.create({ userId, habitName: 'Read', date: today, completed: true, currentStreak: 1, source: 'manual' });

      const res = await request(app)
        .get('/api/dashboard/today')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.entries.length).toBe(1);
      expect(res.body.habits.length).toBe(1);
    });
  });

  describe('GET /api/dashboard/summary', () => {
    it('should return aggregated totals', async () => {
      const today = new Date();
      await Entry.create({ userId, type: 'nutrition', braindump_id: 'x', raw_text: 'food', date: today, data: { calories: 500 }});
      await Entry.create({ userId, type: 'expense', braindump_id: 'y', raw_text: 'buy', date: today, data: { amount: 20 }});
      
      const res = await request(app)
        .get('/api/dashboard/summary?range=week')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.totals.calories).toBeGreaterThanOrEqual(500);
      expect(res.body.totals.expenses).toBeGreaterThanOrEqual(20);
      expect(res.body.totals.hours).toBeGreaterThanOrEqual(0);
    });

    it('should handle month range correctly', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary?range=month')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.totals).toBeDefined();
    });
  });
});
