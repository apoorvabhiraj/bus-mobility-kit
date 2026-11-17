// Types derived from OpenAPI contracts in schemas/contracts/
// These are consumed from the contracts, not modified.
// Source: schemas/contracts/journey-api-v1.yaml

export interface LocationPoint {
  lat: number;
  lon: number;
  name?: string;
  stopId?: string;
}

export interface JourneyPreferences {
  optimizeFor?: 'fastest' | 'least_crowded' | 'least_transfers' | 'balanced';
  maxTransfers?: number;
  maxWalkingDistanceMeters?: number;
  crowdingTolerance?: 'low' | 'medium' | 'high';
  includeCrowding?: boolean;
  includeTravelTimePercentiles?: boolean;
}

export interface JourneyPlanRequest {
  origin: LocationPoint;
  destination: LocationPoint;
  departureTime?: string;
  preferences?: JourneyPreferences;
}

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  zone?: string;
}

export interface Problem1TravelTimeMetrics {
  p50DurationMinutes: number;
  p90DurationMinutes: number;
  trafficDelayMinutes: number;
  historicalConfidenceScore: number;
  gpsObservationCount: number;
}

export interface Problem2CrowdednessMetrics {
  overallCrowdingLevel: 'low' | 'moderate' | 'high' | 'very_high';
  peakCrowdingLevel: 'low' | 'moderate' | 'high' | 'very_high';
  averageOccupancyProxy: number;
  standingLikelihood: 'unlikely' | 'possible' | 'likely' | 'guaranteed';
  dataConfidenceScore: number;
  dataCaveatNotice: string;
}

export interface TransitSegmentTravelTime {
  estimatedMinutes: number;
  expectedDelayMinutes: number;
  confidence: number;
}

export interface TransitSegmentCrowding {
  level: 'low' | 'moderate' | 'high' | 'very_high';
  occupancyPercentage: number;
  peakStationName?: string;
}

export interface BusLegDetails {
  routeId: string;
  routeNumber: string;
  busType: 'Standard' | 'AC' | 'Electric';
  headsign: string;
  intermediateStopsCount: number;
  segmentTravelTime: TransitSegmentTravelTime;
  segmentCrowding: TransitSegmentCrowding;
}

export interface JourneyLeg {
  legType: 'WALK' | 'BUS';
  durationMinutes: number;
  distanceMeters: number;
  fromStop: Stop;
  toStop: Stop;
  busDetails?: BusLegDetails;
}

export interface JourneyOption {
  id: string;
  summary: string;
  totalDurationMinutes: number;
  totalWalkingDistanceMeters: number;
  transfers: number;
  fareInRupees: number;
  departureTime: string;
  estimatedArrivalTime: string;
  problem1TravelTimeMetrics: Problem1TravelTimeMetrics;
  problem2CrowdednessMetrics: Problem2CrowdednessMetrics;
  legs: JourneyLeg[];
}

export interface JourneyPlanResponse {
  query: JourneyPlanRequest;
  routesCount: number;
  routes: JourneyOption[];
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationErrorResponse {
  code: string;
  message: string;
  issues: Array<{ path: string; message: string }>;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  service: string;
  version: string;
  database: { status: 'connected' | 'disconnected' | 'mock_fallback' };
}

export interface SearchStopsResponse {
  count: number;
  stops: Stop[];
}
