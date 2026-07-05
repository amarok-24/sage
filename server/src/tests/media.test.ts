import request from 'supertest';
import app from '../app';
import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs';

describe('Media Routes', () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'media@test.com',
      password: 'password123',
      name: 'Media User'
    });
    token = res.body.accessToken;
    
    // Create dummy file for upload test
    const dummyPath = path.join(__dirname, 'dummy.txt');
    fs.writeFileSync(dummyPath, 'test content');
  });

  describe('GET /api/media/presign', () => {
    it('should generate presigned URLs', async () => {
      const res = await request(app)
        .get('/api/media/presign?count=2')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.urls.length).toBe(2);
      expect(res.body.urls[0]).toHaveProperty('uploadUrl');
      expect(res.body.urls[0]).toHaveProperty('publicUrl');
    });
  });

  describe('POST /api/media/upload', () => {
    it('should upload a file and return publicUrl', async () => {
      const res = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', path.join(__dirname, 'dummy.txt'));
        
      expect(res.status).toBe(200);
      expect(res.body.publicUrl).toMatch(/\/uploads\//);
    });
    
    it('should fail if no file attached', async () => {
      const res = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${token}`);
        
      expect(res.status).toBe(400);
    });
  });
});
