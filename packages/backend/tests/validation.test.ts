import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Validation Middleware & Contract Enforcement', () => {
  it('Rejects invalid request body with 422 Unprocessable Entity', async () => {
    const res = await request(app)
      .post('/api/v1/journeys/plan')
      .send({
        // Missing origin
        destination: { lat: 28.6, lon: 77.2 }
      });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body).toHaveProperty('issues');
    expect(res.body.issues.length).toBeGreaterThan(0);
    expect(res.body.issues.some((i: { path: string }) => i.path.includes('origin'))).toBe(true);
  });

  it('Rejects invalid coordinate ranges with 422', async () => {
    const res = await request(app)
      .post('/api/v1/journeys/plan')
      .send({
        origin: { lat: 999.0, lon: 77.2 }, // Invalid latitude > 90
        destination: { lat: 28.6, lon: 77.2 }
      });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.issues.some((i: { path: string }) => i.path.includes('lat'))).toBe(true);
  });

  it('Returns 404 for non-existent routes', async () => {
    const res = await request(app).get('/api/v1/non-existent-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
