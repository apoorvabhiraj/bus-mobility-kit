import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Stops & Routes API', () => {
  it('GET /api/v1/stops returns list of Delhi bus stops', async () => {
    const res = await request(app).get('/api/v1/stops');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count');
    expect(res.body).toHaveProperty('stops');
    expect(res.body.stops.length).toBeGreaterThan(0);
    expect(res.body.stops[0]).toHaveProperty('id');
    expect(res.body.stops[0]).toHaveProperty('name');
  });

  it('GET /api/v1/stops with text query filters stops', async () => {
    const res = await request(app).get('/api/v1/stops?query=Kashmere');
    expect(res.status).toBe(200);
    expect(res.body.stops.length).toBeGreaterThan(0);
    expect(res.body.stops[0].name).toContain('Kashmere Gate');
  });

  it('GET /api/v1/routes/:routeId/metrics returns route speed & crowdedness profile', async () => {
    const res = await request(app).get('/api/v1/routes/502/metrics');
    expect(res.status).toBe(200);
    expect(res.body.routeNumber).toBe('502');
    expect(res.body).toHaveProperty('averageSpeedKmh');
    expect(res.body).toHaveProperty('hourlySpeedProfile');
    expect(res.body.hourlySpeedProfile.length).toBe(24);
  });

  it('GET /api/v1/routes/:routeId/metrics returns 404 for unknown route', async () => {
    const res = await request(app).get('/api/v1/routes/999999/metrics');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('ROUTE_NOT_FOUND');
  });
});
