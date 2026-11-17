import { z } from 'zod';

export const LocationPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  name: z.string().optional(),
  stopId: z.string().optional()
});
export type LocationPoint = z.infer<typeof LocationPointSchema>;

export const JourneyPreferencesSchema = z.object({
  optimizeFor: z.enum(['fastest', 'least_crowded', 'least_transfers', 'balanced']).default('balanced'),
  maxTransfers: z.number().int().min(0).max(5).default(3),
  maxWalkingDistanceMeters: z.number().int().min(100).max(5000).default(1200),
  crowdingTolerance: z.enum(['low', 'medium', 'high']).default('medium'),
  includeCrowding: z.boolean().default(true),
  includeTravelTimePercentiles: z.boolean().default(true)
}).default({});
export type JourneyPreferences = z.infer<typeof JourneyPreferencesSchema>;

export const JourneyPlanRequestSchema = z.object({
  origin: LocationPointSchema,
  destination: LocationPointSchema,
  departureTime: z.string().datetime().optional(),
  preferences: JourneyPreferencesSchema.optional().default({})
});
export type JourneyPlanRequest = z.infer<typeof JourneyPlanRequestSchema>;

export const StopSchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number(),
  lon: z.number(),
  zone: z.string().optional()
});
export type Stop = z.infer<typeof StopSchema>;

// Problem 1: Travel time percentiles & traffic metrics
export const Problem1TravelTimeMetricsSchema = z.object({
  p50DurationMinutes: z.number().nonnegative(),
  p90DurationMinutes: z.number().nonnegative(),
  trafficDelayMinutes: z.number().nonnegative(),
  historicalConfidenceScore: z.number().min(0).max(1),
  gpsObservationCount: z.number().int().nonnegative()
});
export type Problem1TravelTimeMetrics = z.infer<typeof Problem1TravelTimeMetricsSchema>;

// Problem 2: E-Ticketing Crowdedness Metrics
export const Problem2CrowdednessMetricsSchema = z.object({
  overallCrowdingLevel: z.enum(['low', 'moderate', 'high', 'very_high']),
  peakCrowdingLevel: z.enum(['low', 'moderate', 'high', 'very_high']),
  averageOccupancyProxy: z.number().min(0).max(1),
  standingLikelihood: z.enum(['unlikely', 'possible', 'likely', 'guaranteed']),
  dataConfidenceScore: z.number().min(0).max(1),
  dataCaveatNotice: z.string()
});
export type Problem2CrowdednessMetrics = z.infer<typeof Problem2CrowdednessMetricsSchema>;

export const TransitSegmentTravelTimeSchema = z.object({
  estimatedMinutes: z.number().nonnegative(),
  expectedDelayMinutes: z.number().nonnegative(),
  confidence: z.number().min(0).max(1)
});

export const TransitSegmentCrowdingSchema = z.object({
  level: z.enum(['low', 'moderate', 'high', 'very_high']),
  occupancyPercentage: z.number().min(0).max(100),
  peakStationName: z.string().optional()
});

export const BusLegDetailsSchema = z.object({
  routeId: z.string(),
  routeNumber: z.string(),
  busType: z.enum(['Standard', 'AC', 'Electric']),
  headsign: z.string(),
  intermediateStopsCount: z.number().int().nonnegative(),
  segmentTravelTime: TransitSegmentTravelTimeSchema,
  segmentCrowding: TransitSegmentCrowdingSchema
});
export type BusLegDetails = z.infer<typeof BusLegDetailsSchema>;

export const JourneyLegSchema = z.object({
  legType: z.enum(['WALK', 'BUS']),
  durationMinutes: z.number().nonnegative(),
  distanceMeters: z.number().nonnegative(),
  fromStop: StopSchema,
  toStop: StopSchema,
  busDetails: BusLegDetailsSchema.optional()
});
export type JourneyLeg = z.infer<typeof JourneyLegSchema>;

export const JourneyOptionSchema = z.object({
  id: z.string().uuid(),
  summary: z.string(),
  totalDurationMinutes: z.number().nonnegative(),
  totalWalkingDistanceMeters: z.number().nonnegative(),
  transfers: z.number().int().nonnegative(),
  fareInRupees: z.number().nonnegative(),
  departureTime: z.string().datetime(),
  estimatedArrivalTime: z.string().datetime(),
  problem1TravelTimeMetrics: Problem1TravelTimeMetricsSchema,
  problem2CrowdednessMetrics: Problem2CrowdednessMetricsSchema,
  legs: z.array(JourneyLegSchema)
});
export type JourneyOption = z.infer<typeof JourneyOptionSchema>;

export const JourneyPlanResponseSchema = z.object({
  query: JourneyPlanRequestSchema,
  routesCount: z.number().int().nonnegative(),
  routes: z.array(JourneyOptionSchema)
});
export type JourneyPlanResponse = z.infer<typeof JourneyPlanResponseSchema>;

export const RouteMetricsResponseSchema = z.object({
  routeId: z.string(),
  routeNumber: z.string(),
  averageSpeedKmh: z.number().nonnegative(),
  p50TripDurationMinutes: z.number().nonnegative(),
  p90TripDurationMinutes: z.number().nonnegative(),
  averageOccupancyProxy: z.number().min(0).max(1),
  crowdingCategory: z.enum(['low', 'moderate', 'high', 'very_high']),
  hourlySpeedProfile: z.array(z.object({
    hour: z.number().int().min(0).max(23),
    speedKmh: z.number().nonnegative(),
    crowdingLevel: z.enum(['low', 'moderate', 'high', 'very_high'])
  }))
});
export type RouteMetricsResponse = z.infer<typeof RouteMetricsResponseSchema>;
