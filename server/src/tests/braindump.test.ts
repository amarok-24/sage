import request from 'supertest';
import app from '../app';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as agentService from '../services/agent.service';

// Mock the processBrainDump service so it doesn't make real network calls
vi.mock('../services/agent.service', () => ({
  processBrainDump: vi.fn()
}));

describe('Braindump Routes', () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'braindump@test.com',
      password: 'password123',
      name: 'Braindump User'
    });
    token = res.body.accessToken;
  });

  describe('POST /api/braindump', () => {
    it('should process braindump text and save entries', async () => {
      // Set up mock return value
      const mockProcessText = vi.mocked(agentService.processBrainDump);
      mockProcessText.mockResolvedValueOnce({
        nutrition: [{ action: 'create', data: { food: 'Apple', calories: 100 } }],
        expenses: [],
        time_logs: [],
        sleep_logs: [],
        somatic_logs: [],
        habits_completed: []
      } as any);

      const res = await request(app)
        .post('/api/braindump')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Ate an apple', timezone: 'UTC' });
      
      expect(res.status).toBe(200);
      expect(res.body.entries_created.length).toBe(1);
      
      // Verify mock was called correctly
      expect(mockProcessText).toHaveBeenCalledWith(expect.any(String), 'Ate an apple');
    });

    it('should fail if text is not provided', async () => {
      const res = await request(app)
        .post('/api/braindump')
        .set('Authorization', `Bearer ${token}`)
        .send({ timezone: 'UTC' }); // missing text
        
      expect(res.status).toBe(400);
    });

    it('should handle service errors gracefully', async () => {
      const mockProcessText = vi.mocked(agentService.processBrainDump);
      mockProcessText.mockRejectedValueOnce(new Error('Agent down'));

      const res = await request(app)
        .post('/api/braindump')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Ate an apple', timezone: 'UTC' });
        
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to process braindump');
    });
  });
});
