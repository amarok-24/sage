import request from 'supertest';
import app from '../app';
import { describe, it, expect } from 'vitest';

describe('Auth Routes', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User'
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);
        
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, email: 'invalid' });
        
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should fail if user already exists', async () => {
      await request(app).post('/api/auth/register').send(testUser);
      const response = await request(app).post('/api/auth/register').send(testUser);
        
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      await request(app).post('/api/auth/register').send(testUser);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });
        
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should fail with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });
        
      expect(response.status).toBe(401);
    });

    it('should fail with unregistered email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'password' });
        
      expect(response.status).toBe(401);
    });
  });

  describe('Auth Middleware', () => {
    it('should reject requests without token', async () => {
      const response = await request(app).get('/api/user/profile');
      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer invalidtoken');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token using cookie', async () => {
      const loginRes = await request(app).post('/api/auth/login').send(testUser);
      const cookie = loginRes.headers['set-cookie'][0];
      
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookie)
        .send();
        
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should fail without cookie', async () => {
      const response = await request(app).post('/api/auth/refresh').send();
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear refresh cookie', async () => {
      const response = await request(app).post('/api/auth/logout').send();
      expect(response.status).toBe(200);
      expect(response.headers['set-cookie'][0]).toMatch(/sage_refresh=;/);
    });
  });
});
