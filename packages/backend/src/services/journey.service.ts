import { randomUUID } from 'crypto';
import {
  DELHI_STOPS,
  DELHI_ROUTES,
  TransitStopData,
  TransitRouteData,
  findNearestStop,
  haversineDistanceMeters
} from './mock-transit-data';
import {
  JourneyPlanRequest,
  JourneyPlanResponse,
  JourneyOption,
  JourneyLeg,
  Problem1TravelTimeMetrics,
  Problem2CrowdednessMetrics,
  RouteMetricsResponse,
  Stop
} from '../schemas/journey.schema';

export class JourneyService {
  public planJourney(request: JourneyPlanRequest): JourneyPlanResponse {
    const originStop = request.origin.stopId
      ? DELHI_STOPS.find(s => s.id === request.origin.stopId) || findNearestStop(request.origin.lat, request.origin.lon)
      : findNearestStop(request.origin.lat, request.origin.lon);

    const destStop = request.destination.stopId
      ? DELHI_STOPS.find(s => s.id === request.destination.stopId) || findNearestStop(request.destination.lat, request.destination.lon)
      : findNearestStop(request.destination.lat, request.destination.lon);

    const departureDate = request.departureTime ? new Date(request.departureTime) : new Date();
    const departureHour = departureDate.getHours();
    const isPeakHour = (departureHour >= 8 && departureHour <= 11) || (departureHour >= 17 && departureHour <= 20);

    const routes: JourneyOption[] = [];

    // 1. Direct Routes
    for (const route of DELHI_ROUTES) {
      const fromIdx = route.stops.indexOf(originStop.id);
      const toIdx = route.stops.indexOf(destStop.id);

      if (fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx) {
        const option = this.buildDirectOption(
          request,
          originStop,
          destStop,
          route,
          fromIdx,
          toIdx,
          departureDate,
          isPeakHour
        );
        routes.push(option);
      }
    }

    // 2. 1-Transfer Routes (if fewer than 3 direct options or to provide alternatives)
    if (routes.length < 3) {
      for (const routeA of DELHI_ROUTES) {
        const fromIdxA = routeA.stops.indexOf(originStop.id);
        if (fromIdxA === -1) continue;

        for (const routeB of DELHI_ROUTES) {
          if (routeA.id === routeB.id) continue;
          const toIdxB = routeB.stops.indexOf(destStop.id);
          if (toIdxB === -1) continue;

          // Find intersection stop
          for (let i = fromIdxA + 1; i < routeA.stops.length; i++) {
            const transferStopId = routeA.stops[i];
            const transferIdxB = routeB.stops.indexOf(transferStopId);

            if (transferIdxB !== -1 && transferIdxB < toIdxB) {
              const transferStop = DELHI_STOPS.find(s => s.id === transferStopId)!;
              const option = this.buildTransferOption(
                request,
                originStop,
                transferStop,
                destStop,
                routeA,
                fromIdxA,
                i,
                routeB,
                transferIdxB,
                toIdxB,
                departureDate,
                isPeakHour
              );
              routes.push(option);
              break;
            }
          }
        }
      }
    }

    // If still no routes found (e.g. same origin/destination or isolated stop), construct a direct simulated connection
    if (routes.length === 0) {
      const fallbackRoute = DELHI_ROUTES[0];
      routes.push(
        this.buildDirectOption(
          request,
          originStop,
          destStop,
          fallbackRoute,
          0,
          Math.min(3, fallbackRoute.stops.length - 1),
          departureDate,
          isPeakHour
        )
      );
    }

    // Sort according to optimizeFor preference
    const optimizeFor = request.preferences?.optimizeFor || 'balanced';
    routes.sort((a, b) => {
      switch (optimizeFor) {
        case 'fastest':
          return a.totalDurationMinutes - b.totalDurationMinutes;
        case 'least_crowded':
          return a.problem2CrowdednessMetrics.averageOccupancyProxy - b.problem2CrowdednessMetrics.averageOccupancyProxy;
        case 'least_transfers':
          return a.transfers !== b.transfers ? a.transfers - b.transfers : a.totalDurationMinutes - b.totalDurationMinutes;
        case 'balanced':
        default: {
          const scoreA = (a.totalDurationMinutes * 0.5) + (a.problem2CrowdednessMetrics.averageOccupancyProxy * 100 * 0.3) + (a.transfers * 15 * 0.2);
          const scoreB = (b.totalDurationMinutes * 0.5) + (b.problem2CrowdednessMetrics.averageOccupancyProxy * 100 * 0.3) + (b.transfers * 15 * 0.2);
          return scoreA - scoreB;
        }
      }
    });

    return {
      query: request,
      routesCount: routes.length,
      routes
    };
  }

  private buildDirectOption(
    request: JourneyPlanRequest,
    originStop: TransitStopData,
    destStop: TransitStopData,
    route: TransitRouteData,
    fromIdx: number,
    toIdx: number,
    departureDate: Date,
    isPeakHour: boolean
  ): JourneyOption {
    const stopsCount = toIdx - fromIdx;
    const baseMinutesPerStop = 4.5;
    const trafficDelayMinutes = isPeakHour ? Math.round(stopsCount * 2.2 * 10) / 10 : Math.round(stopsCount * 0.6 * 10) / 10;
    const busDuration = Math.round((stopsCount * baseMinutesPerStop + trafficDelayMinutes) * 10) / 10;
    const p50Duration = busDuration;
    const p90Duration = Math.round((busDuration * (isPeakHour ? 1.35 : 1.15)) * 10) / 10;

    // Walk legs
    const walkToFirstStopMeters = haversineDistanceMeters(request.origin.lat, request.origin.lon, originStop.lat, originStop.lon);
    const walkToFirstStopMinutes = Math.round((walkToFirstStopMeters / 80) * 10) / 10;

    const walkFromLastStopMeters = haversineDistanceMeters(destStop.lat, destStop.lon, request.destination.lat, request.destination.lon);
    const walkFromLastStopMinutes = Math.round((walkFromLastStopMeters / 80) * 10) / 10;

    const totalDuration = Math.round((walkToFirstStopMinutes + busDuration + walkFromLastStopMinutes) * 10) / 10;
    const totalWalkMeters = walkToFirstStopMeters + walkFromLastStopMeters;

    // Problem 2 Crowdedness metrics
    const baseOccupancy = isPeakHour ? 0.78 : 0.38;
    const occupancyRatio = Math.min(0.98, Math.round((baseOccupancy + (Math.random() * 0.1 - 0.05)) * 100) / 100);
    const crowdLevel = occupancyRatio > 0.8 ? 'very_high' : occupancyRatio > 0.6 ? 'high' : occupancyRatio > 0.4 ? 'moderate' : 'low';
    const standingLikelihood = occupancyRatio > 0.75 ? 'guaranteed' : occupancyRatio > 0.55 ? 'likely' : occupancyRatio > 0.35 ? 'possible' : 'unlikely';

    const departureIso = departureDate.toISOString();
    const arrivalDate = new Date(departureDate.getTime() + totalDuration * 60 * 1000);
    const arrivalIso = arrivalDate.toISOString();

    const legs: JourneyLeg[] = [
      {
        legType: 'WALK',
        durationMinutes: walkToFirstStopMinutes,
        distanceMeters: walkToFirstStopMeters,
        fromStop: {
          id: 'user-origin',
          name: request.origin.name || 'Origin Location',
          lat: request.origin.lat,
          lon: request.origin.lon
        },
        toStop: originStop
      },
      {
        legType: 'BUS',
        durationMinutes: busDuration,
        distanceMeters: stopsCount * 2200,
        fromStop: originStop,
        toStop: destStop,
        busDetails: {
          routeId: route.id,
          routeNumber: route.routeNumber,
          busType: route.busType,
          headsign: route.longName.split(' to ')[1] || destStop.name,
          intermediateStopsCount: stopsCount,
          segmentTravelTime: {
            estimatedMinutes: busDuration,
            expectedDelayMinutes: trafficDelayMinutes,
            confidence: 0.92
          },
          segmentCrowding: {
            level: crowdLevel,
            occupancyPercentage: Math.round(occupancyRatio * 100),
            peakStationName: route.stops[Math.floor((fromIdx + toIdx) / 2)] || originStop.name
          }
        }
      },
      {
        legType: 'WALK',
        durationMinutes: walkFromLastStopMinutes,
        distanceMeters: walkFromLastStopMeters,
        fromStop: destStop,
        toStop: {
          id: 'user-destination',
          name: request.destination.name || 'Destination Location',
          lat: request.destination.lat,
          lon: request.destination.lon
        }
      }
    ];

    const problem1Metrics: Problem1TravelTimeMetrics = {
      p50DurationMinutes: Math.round((p50Duration + walkToFirstStopMinutes + walkFromLastStopMinutes) * 10) / 10,
      p90DurationMinutes: Math.round((p90Duration + walkToFirstStopMinutes + walkFromLastStopMinutes) * 10) / 10,
      trafficDelayMinutes,
      historicalConfidenceScore: 0.91,
      gpsObservationCount: stopsCount * 320
    };

    const problem2Metrics: Problem2CrowdednessMetrics = {
      overallCrowdingLevel: crowdLevel,
      peakCrowdingLevel: isPeakHour ? 'very_high' : crowdLevel,
      averageOccupancyProxy: occupancyRatio,
      standingLikelihood,
      dataConfidenceScore: 0.88,
      dataCaveatNotice: 'Ticket issuance proxy estimate; boarding/alighting counts are approximated.'
    };

    return {
      id: randomUUID(),
      summary: `Route ${route.routeNumber} (${route.busType}) directly to ${destStop.name}`,
      totalDurationMinutes: totalDuration,
      totalWalkingDistanceMeters: totalWalkMeters,
      transfers: 0,
      fareInRupees: route.fareBaseRupees,
      departureTime: departureIso,
      estimatedArrivalTime: arrivalIso,
      problem1TravelTimeMetrics: problem1Metrics,
      problem2CrowdednessMetrics: problem2Metrics,
      legs
    };
  }

  private buildTransferOption(
    request: JourneyPlanRequest,
    originStop: TransitStopData,
    transferStop: TransitStopData,
    destStop: TransitStopData,
    routeA: TransitRouteData,
    fromIdxA: number,
    toIdxA: number,
    routeB: TransitRouteData,
    fromIdxB: number,
    toIdxB: number,
    departureDate: Date,
    isPeakHour: boolean
  ): JourneyOption {
    const stopsA = toIdxA - fromIdxA;
    const stopsB = toIdxB - fromIdxB;
    const delayA = isPeakHour ? Math.round(stopsA * 1.8 * 10) / 10 : Math.round(stopsA * 0.5 * 10) / 10;
    const delayB = isPeakHour ? Math.round(stopsB * 1.8 * 10) / 10 : Math.round(stopsB * 0.5 * 10) / 10;
    const busDurationA = Math.round((stopsA * 4.2 + delayA) * 10) / 10;
    const busDurationB = Math.round((stopsB * 4.2 + delayB) * 10) / 10;
    const transferWaitMinutes = isPeakHour ? 6 : 10;

    const walkToFirstStopMeters = haversineDistanceMeters(request.origin.lat, request.origin.lon, originStop.lat, originStop.lon);
    const walkToFirstStopMinutes = Math.round((walkToFirstStopMeters / 80) * 10) / 10;

    const walkFromLastStopMeters = haversineDistanceMeters(destStop.lat, destStop.lon, request.destination.lat, request.destination.lon);
    const walkFromLastStopMinutes = Math.round((walkFromLastStopMeters / 80) * 10) / 10;

    const totalDuration = Math.round(
      (walkToFirstStopMinutes + busDurationA + transferWaitMinutes + busDurationB + walkFromLastStopMinutes) * 10
    ) / 10;
    const totalWalkMeters = walkToFirstStopMeters + walkFromLastStopMeters;

    const occupancyRatio = isPeakHour ? 0.72 : 0.42;
    const crowdLevel = occupancyRatio > 0.7 ? 'high' : 'moderate';

    const departureIso = departureDate.toISOString();
    const arrivalDate = new Date(departureDate.getTime() + totalDuration * 60 * 1000);
    const arrivalIso = arrivalDate.toISOString();

    const legs: JourneyLeg[] = [
      {
        legType: 'WALK',
        durationMinutes: walkToFirstStopMinutes,
        distanceMeters: walkToFirstStopMeters,
        fromStop: {
          id: 'user-origin',
          name: request.origin.name || 'Origin Location',
          lat: request.origin.lat,
          lon: request.origin.lon
        },
        toStop: originStop
      },
      {
        legType: 'BUS',
        durationMinutes: busDurationA,
        distanceMeters: stopsA * 2100,
        fromStop: originStop,
        toStop: transferStop,
        busDetails: {
          routeId: routeA.id,
          routeNumber: routeA.routeNumber,
          busType: routeA.busType,
          headsign: transferStop.name,
          intermediateStopsCount: stopsA,
          segmentTravelTime: {
            estimatedMinutes: busDurationA,
            expectedDelayMinutes: delayA,
            confidence: 0.89
          },
          segmentCrowding: {
            level: crowdLevel,
            occupancyPercentage: Math.round(occupancyRatio * 100),
            peakStationName: originStop.name
          }
        }
      },
      {
        legType: 'BUS',
        durationMinutes: busDurationB,
        distanceMeters: stopsB * 2100,
        fromStop: transferStop,
        toStop: destStop,
        busDetails: {
          routeId: routeB.id,
          routeNumber: routeB.routeNumber,
          busType: routeB.busType,
          headsign: destStop.name,
          intermediateStopsCount: stopsB,
          segmentTravelTime: {
            estimatedMinutes: busDurationB,
            expectedDelayMinutes: delayB,
            confidence: 0.87
          },
          segmentCrowding: {
            level: 'moderate',
            occupancyPercentage: 55,
            peakStationName: transferStop.name
          }
        }
      },
      {
        legType: 'WALK',
        durationMinutes: walkFromLastStopMinutes,
        distanceMeters: walkFromLastStopMeters,
        fromStop: destStop,
        toStop: {
          id: 'user-destination',
          name: request.destination.name || 'Destination Location',
          lat: request.destination.lat,
          lon: request.destination.lon
        }
      }
    ];

    const problem1Metrics: Problem1TravelTimeMetrics = {
      p50DurationMinutes: totalDuration,
      p90DurationMinutes: Math.round((totalDuration * (isPeakHour ? 1.32 : 1.18)) * 10) / 10,
      trafficDelayMinutes: Math.round((delayA + delayB) * 10) / 10,
      historicalConfidenceScore: 0.88,
      gpsObservationCount: (stopsA + stopsB) * 280
    };

    const problem2Metrics: Problem2CrowdednessMetrics = {
      overallCrowdingLevel: crowdLevel,
      peakCrowdingLevel: isPeakHour ? 'high' : 'moderate',
      averageOccupancyProxy: occupancyRatio,
      standingLikelihood: isPeakHour ? 'likely' : 'possible',
      dataConfidenceScore: 0.85,
      dataCaveatNotice: 'Ticket issuance proxy estimate; boarding/alighting counts are approximated.'
    };

    return {
      id: randomUUID(),
      summary: `Route ${routeA.routeNumber} → Transfer at ${transferStop.name} → Route ${routeB.routeNumber}`,
      totalDurationMinutes: totalDuration,
      totalWalkingDistanceMeters: totalWalkMeters,
      transfers: 1,
      fareInRupees: routeA.fareBaseRupees + routeB.fareBaseRupees,
      departureTime: departureIso,
      estimatedArrivalTime: arrivalIso,
      problem1TravelTimeMetrics: problem1Metrics,
      problem2CrowdednessMetrics: problem2Metrics,
      legs
    };
  }

  public getRouteMetrics(routeId: string): RouteMetricsResponse | null {
    const route = DELHI_ROUTES.find(r => r.id === routeId || r.routeNumber === routeId);
    if (!route) return null;

    const hourlySpeedProfile = [];
    for (let h = 0; h < 24; h++) {
      const isPeak = (h >= 8 && h <= 11) || (h >= 17 && h <= 20);
      const isLateNight = h >= 23 || h <= 5;
      const speed = isLateNight ? 34.5 : isPeak ? 14.8 : 22.4;
      const crowd = isPeak ? 'very_high' : isLateNight ? 'low' : 'moderate';

      hourlySpeedProfile.push({
        hour: h,
        speedKmh: Math.round(speed * 10) / 10,
        crowdingLevel: crowd as 'low' | 'moderate' | 'high' | 'very_high'
      });
    }

    return {
      routeId: route.id,
      routeNumber: route.routeNumber,
      averageSpeedKmh: 19.8,
      p50TripDurationMinutes: 52.0,
      p90TripDurationMinutes: 71.5,
      averageOccupancyProxy: 0.64,
      crowdingCategory: 'high',
      hourlySpeedProfile
    };
  }

  public searchStops(query?: string, lat?: number, lon?: number, limit = 10): { count: number; stops: Stop[] } {
    let result = [...DELHI_STOPS];

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.zone.toLowerCase().includes(q));
    }

    if (lat !== undefined && lon !== undefined) {
      result.sort((a, b) => {
        const distA = haversineDistanceMeters(lat, lon, a.lat, a.lon);
        const distB = haversineDistanceMeters(lat, lon, b.lat, b.lon);
        return distA - distB;
      });
    }

    const sliced = result.slice(0, limit);
    return {
      count: sliced.length,
      stops: sliced
    };
  }
}

export const journeyService = new JourneyService();
