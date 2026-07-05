import request from 'supertest';
import app from '../app';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { HabitLog } from '../models/HabitLog';

describe('Habits Routes', () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'habits@test.com',
      password: 'password123',
      name: 'Habit User'
    });
    token = res.body.accessToken;
  });

  describe('POST /api/habits', () => {
    it('should create a new habit', async () => {
      const res = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Read', aliases: ['reading'], icon: '📚' });
      
      expect(res.status).toBe(201);
      expect(res.body.habit.name).toBe('Read');
    });

    it('should fail if habit already exists', async () => {
      const res = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Read' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Habit already exists');
    });
  });

  describe('GET /api/habits', () => {
    it('should list habits with completion status', async () => {
      const res = await request(app)
        .get('/api/habits')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.habits.length).toBeGreaterThan(0);
      expect(res.body.habits[0].completedToday).toBe(false);
    });
  });

  describe('POST /api/habits/:name/toggle', () => {
    it('should toggle habit completion', async () => {
      // Complete
      let res = await request(app)
        .post('/api/habits/Read/toggle')
        .set('Authorization', `Bearer ${token}`)
        .send();
      expect(res.status).toBe(200);
      expect(res.body.log.completed).toBe(true);
      expect(res.body.log.currentStreak).toBe(1);

      // Un-complete
      res = await request(app)
        .post('/api/habits/Read/toggle')
        .set('Authorization', `Bearer ${token}`)
        .send();
      expect(res.status).toBe(200);
      expect(res.body.log.completed).toBe(false);
    });
  });

  describe('DELETE /api/habits/:name', () => {
    it('should delete habit', async () => {
      const res = await request(app)
        .delete('/api/habits/Read')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);

      const check = await request(app).get('/api/habits').set('Authorization', `Bearer ${token}`);
      expect(check.body.habits.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on db error', async () => {
      const spy = vi.spyOn(HabitLog, 'find').mockRejectedValueOnce(new Error('db error'));
      const res = await request(app).get('/api/habits').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(500);
      spy.mockRestore();
    });
  });
});
