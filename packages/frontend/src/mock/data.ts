// Mock data for development — mirrors the OpenAPI response shapes from schemas/contracts/.
// This lets the frontend work end-to-end before the backend is implemented.
// Not a contract file; only used by the frontend store when the API is unavailable.

import type { JourneyPlanResponse, LocationPoint, Stop } from '@/api/types';

const MOCK_STOPS: Stop[] = [
  { id: 'STP-001', name: 'Kashmere Gate', lat: 28.6622, lon: 77.2288, zone: 'North Delhi' },
  { id: 'STP-002', name: 'Connaught Place', lat: 28.6289, lon: 77.2191, zone: 'Central Delhi' },
  { id: 'STP-003', name: 'AIIMS', lat: 28.5672, lon: 77.2100, zone: 'South Delhi' },
  { id: 'STP-004', name: 'Anand Vihar', lat: 28.6415, lon: 77.3167, zone: 'East Delhi' },
  { id: 'STP-005', name: 'Dwarka Sector 21', lat: 28.5891, lon: 77.0508, zone: 'West Delhi' },
  { id: 'STP-006', name: 'Hauz Khas', lat: 28.5506, lon: 77.1783, zone: 'South Delhi' },
  { id: 'STP-007', name: 'Karol Bagh', lat: 28.6573, lon: 77.1879, zone: 'Central Delhi' },
  { id: 'STP-008', name: 'Lajpat Nagar', lat: 28.5668, lon: 77.2418, zone: 'South Delhi' },
  { id: 'STP-009', name: 'Rajiv Chowk', lat: 28.6268, lon: 77.2189, zone: 'Central Delhi' },
  { id: 'STP-010', name: 'Yamuna Vihar', lat: 28.6995, lon: 77.2773, zone: 'North East Delhi' },
];

const now = new Date();
const departureTime = now.toISOString();

function makeRoute(
  id: string,
  summary: string,
  totalDuration: number,
  walking: number,
  transfers: number,
  fare: number,
  p50: number,
  p90: number,
  trafficDelay: number,
  confidence: number,
  gpsCount: number,
  crowding: 'low' | 'moderate' | 'high' | 'very_high',
  peakCrowding: 'low' | 'moderate' | 'high' | 'very_high',
  occupancy: number,
  standing: 'unlikely' | 'possible' | 'likely' | 'guaranteed',
  confidenceScore: number
): JourneyPlanResponse['routes'][number] {
  const arrival = new Date(now.getTime() + totalDuration * 60000).toISOString();
  return {
    id,
    summary,
    totalDurationMinutes: totalDuration,
    totalWalkingDistanceMeters: walking,
    transfers,
    fareInRupees: fare,
    departureTime,
    estimatedArrivalTime: arrival,
    problem1TravelTimeMetrics: {
      p50DurationMinutes: p50,
      p90DurationMinutes: p90,
      trafficDelayMinutes: trafficDelay,
      historicalConfidenceScore: confidence,
      gpsObservationCount: gpsCount,
    },
    problem2CrowdednessMetrics: {
      overallCrowdingLevel: crowding,
      peakCrowdingLevel: peakCrowding,
      averageOccupancyProxy: occupancy,
      standingLikelihood: standing,
      dataConfidenceScore: confidenceScore,
      dataCaveatNotice:
        'This is a demand/crowding proxy based on e-ticketing data covering ~3–4% of total tickets. Not measured segment occupancy.',
    },
    legs: [
      {
        legType: 'WALK',
        durationMinutes: 5,
        distanceMeters: 400,
        fromStop: MOCK_STOPS[0],
        toStop: MOCK_STOPS[1],
      },
      {
        legType: 'BUS',
        durationMinutes: totalDuration - 10,
        distanceMeters: Math.max(0, (totalDuration - 10) * 400),
        fromStop: MOCK_STOPS[1],
        toStop: MOCK_STOPS[3],
        busDetails: {
          routeId: 'R-724',
          routeNumber: '724',
          busType: 'Standard',
          headsign: 'Anand Vihar',
          intermediateStopsCount: 6,
          segmentTravelTime: {
            estimatedMinutes: totalDuration - 10,
            expectedDelayMinutes: trafficDelay,
            confidence,
          },
          segmentCrowding: {
            level: crowding,
            occupancyPercentage: Math.round(occupancy * 100),
            peakStationName: 'Connaught Place',
          },
        },
      },
    ],
  };
}

export const MOCK_JOURNEY_RESPONSE: JourneyPlanResponse = {
  query: {
    origin: { lat: 28.6622, lon: 77.2288, name: 'Kashmere Gate', stopId: 'STP-001' },
    destination: { lat: 28.6415, lon: 77.3167, name: 'Anand Vihar', stopId: 'STP-004' },
    departureTime,
    preferences: {
      optimizeFor: 'balanced',
      maxTransfers: 3,
      maxWalkingDistanceMeters: 1200,
      crowdingTolerance: 'medium',
      includeCrowding: true,
      includeTravelTimePercentiles: true,
    },
  },
  routesCount: 3,
  routes: [
    makeRoute(
      'route-1',
      'Via Route 724 — fastest',
      38,
      400,
      0,
      25,
      32,
      48,
      12,
      0.87,
      1420,
      'moderate',
      'high',
      0.62,
      'possible',
      0.87
    ),
    makeRoute(
      'route-2',
      'Via Route 102A — least crowded',
      45,
      600,
      0,
      25,
      40,
      58,
      15,
      0.81,
      1180,
      'low',
      'moderate',
      0.41,
      'unlikely',
      0.81
    ),
    makeRoute(
      'route-3',
      'Via Route ECO-1 — balanced',
      41,
      500,
      1,
      30,
      36,
      52,
      13,
      0.84,
      1310,
      'moderate',
      'moderate',
      0.55,
      'possible',
      0.84
    ),
  ],
};

export async function mockPlanJourney(): Promise<JourneyPlanResponse> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 600));
  return MOCK_JOURNEY_RESPONSE;
}

export async function mockSearchStops(query?: string): Promise<Stop[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (!query) return MOCK_STOPS.slice(0, 5);
  const q = query.toLowerCase();
  return MOCK_STOPS.filter((s) => s.name.toLowerCase().includes(q));
}

export function mockLocationPoint(name: string, lat: number, lon: number, stopId?: string): LocationPoint {
  return { lat, lon, name, stopId };
}
