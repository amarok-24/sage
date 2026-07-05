import request from 'supertest';
import app from '../app';
import { describe, it, expect, beforeAll } from 'vitest';

describe('User Routes', () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'user@test.com',
      password: 'password123',
      name: 'Test Profile'
    });
    token = res.body.accessToken;
  });

  describe('GET /api/user/profile', () => {
    it('should return user profile', async () => {
      const res = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('user@test.com');
      expect(res.body.user.passwordHash).toBeUndefined(); // Should not return password
    });
  });

  describe('PATCH /api/user/preferences', () => {
    it('should update user preferences', async () => {
      const res = await request(app)
        .patch('/api/user/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ timezone: 'UTC', dailyCalorieGoal: 2000 });
      
      expect(res.status).toBe(200);
      expect(res.body.preferences.timezone).toBe('UTC');
      expect(res.body.preferences.dailyCalorieGoal).toBe(2000);
    });
  });
});
