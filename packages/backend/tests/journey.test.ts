import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Journey Planning API', () => {
  const sampleRequest = {
    origin: {
      lat: 28.6315,
      lon: 77.2167,
      name: 'Connaught Place'
    },
    destination: {
      lat: 28.6675,
      lon: 77.2285,
      name: 'Kashmere Gate ISBT'
    },
    departureTime: '2026-11-18T09:00:00.000Z',
    preferences: {
      optimizeFor: 'balanced',
      maxTransfers: 2,
      includeCrowding: true,
      includeTravelTimePercentiles: true
    }
  };

  it('POST /api/v1/journeys/plan successfully returns planned routes with Problem 1 & 2 metrics', async () => {
    const res = await request(app)
      .post('/api/v1/journeys/plan')
      .send(sampleRequest);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('routes');
    expect(res.body.routes.length).toBeGreaterThan(0);

    const firstRoute = res.body.routes[0];
    expect(firstRoute).toHaveProperty('id');
    expect(firstRoute).toHaveProperty('summary');
    expect(firstRoute).toHaveProperty('totalDurationMinutes');
    expect(firstRoute).toHaveProperty('fareInRupees');
    expect(firstRoute).toHaveProperty('legs');

    // Verify Problem 1: Travel Time Metrics
    expect(firstRoute).toHaveProperty('problem1TravelTimeMetrics');
    const p1 = firstRoute.problem1TravelTimeMetrics;
    expect(p1).toHaveProperty('p50DurationMinutes');
    expect(p1).toHaveProperty('p90DurationMinutes');
    expect(p1).toHaveProperty('trafficDelayMinutes');
    expect(p1).toHaveProperty('historicalConfidenceScore');
    expect(p1.p90DurationMinutes).toBeGreaterThanOrEqual(p1.p50DurationMinutes);
    expect(p1.historicalConfidenceScore).toBeGreaterThanOrEqual(0);
    expect(p1.historicalConfidenceScore).toBeLessThanOrEqual(1);

    // Verify Problem 2: Crowdedness Metrics
    expect(firstRoute).toHaveProperty('problem2CrowdednessMetrics');
    const p2 = firstRoute.problem2CrowdednessMetrics;
    expect(p2).toHaveProperty('overallCrowdingLevel');
    expect(p2).toHaveProperty('averageOccupancyProxy');
    expect(p2).toHaveProperty('standingLikelihood');
    expect(p2).toHaveProperty('dataCaveatNotice');
    expect(['low', 'moderate', 'high', 'very_high']).toContain(p2.overallCrowdingLevel);
    expect(p2.averageOccupancyProxy).toBeGreaterThanOrEqual(0);
    expect(p2.averageOccupancyProxy).toBeLessThanOrEqual(1);
    expect(p2.dataCaveatNotice).toContain('Ticket issuance proxy estimate');
  });

  it('Supports optimizeFor least_crowded ranking', async () => {
    const res = await request(app)
      .post('/api/v1/journeys/plan')
      .send({
        ...sampleRequest,
        preferences: { optimizeFor: 'least_crowded' }
      });

    expect(res.status).toBe(200);
    const routes = res.body.routes;
    if (routes.length > 1) {
      expect(routes[0].problem2CrowdednessMetrics.averageOccupancyProxy)
        .toBeLessThanOrEqual(routes[1].problem2CrowdednessMetrics.averageOccupancyProxy);
    }
  });

  it('Supports optimizeFor fastest ranking', async () => {
    const res = await request(app)
      .post('/api/v1/journeys/plan')
      .send({
        ...sampleRequest,
        preferences: { optimizeFor: 'fastest' }
      });

    expect(res.status).toBe(200);
    const routes = res.body.routes;
    if (routes.length > 1) {
      expect(routes[0].totalDurationMinutes).toBeLessThanOrEqual(routes[1].totalDurationMinutes);
    }
  });
});
