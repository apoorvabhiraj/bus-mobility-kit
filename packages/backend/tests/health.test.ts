import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Health Check API', () => {
  it('GET /health returns 200 with service information', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('database');
    expect(['ok', 'degraded']).toContain(res.body.status);
    expect(['connected', 'mock_fallback']).toContain(res.body.database.status);
  });

  it('GET /api/v1/health returns 200 with matching schema', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('delhi-transport-journey-backend');
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
