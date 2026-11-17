import { prisma } from './prisma.service';
import { config } from '../config';
import { transit_realtime } from 'gtfs-realtime-bindings';

const REALTIME_URL =
  'https://dts-backend.transportstack.in/api/dataset/otd/get-file?agency=delhi-buses&category=realtime_gtfs&filename=VehiclePositions.pb';

const POLL_INTERVAL_MS = parseInt(process.env.GTFS_RT_POLL_INTERVAL_MS || '30000', 10); // 30 seconds default

export interface VehiclePositionRecord {
  vehicleId: string;
  tripId?: string;
  routeId?: string;
  lat: number;
  lon: number;
  bearing?: number;
  speed?: number; // meters/second
  timestamp: Date;
  currentStopSequence?: number;
  stopId?: string;
}

export class GtfsRtIngestionService {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  /**
   * Fetch one batch of VehiclePositions from the Transport Stack API and persist them.
   * Returns the number of positions ingested.
   */
  async pollOnce(): Promise<number> {
    const apiKey = process.env.DTS_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error('DTS_API_KEY (or API_KEY) environment variable is required for GTFS-RT ingestion');
    }

    const response = await fetch(REALTIME_URL, {
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/x-protobuf',
      },
    });

    if (!response.ok) {
      throw new Error(`GTFS-RT API responded ${response.status}: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Parse the protobuf FeedMessage
    const feed = transit_realtime.FeedMessage.decode(buffer);

    const records: VehiclePositionRecord[] = [];
    for (const entity of feed.entity ?? []) {
      const vp = entity.vehicle;
      if (!vp) continue;
      const position = vp.position;
      const trip = vp.trip;
      const vehicle = vp.vehicle;

      records.push({
        vehicleId: vehicle?.id ?? `unknown-${entity.id ?? Math.random().toString(36).slice(2)}`,
        tripId: trip?.tripId ?? undefined,
        routeId: trip?.routeId ?? undefined,
        lat: position?.latitude ?? 0,
        lon: position?.longitude ?? 0,
        bearing: position?.bearing ?? undefined,
        speed: position?.speed ?? undefined,
        timestamp: vp.timestamp
          ? new Date(Number(vp.timestamp) * 1000)
          : new Date(),
        currentStopSequence: vp.currentStopSequence ?? undefined,
        stopId: vp.stopId ?? undefined,
      });
    }

    if (records.length === 0) {
      console.log('[gtfs-rt] no vehicle positions in feed');
      return 0;
    }

    // Persist in a transaction
    await prisma.$transaction(
      records.map((r) =>
        prisma.vehiclePosition.create({
          data: {
            vehicleId: r.vehicleId,
            tripId: r.tripId,
            routeId: r.routeId,
            lat: r.lat,
            lon: r.lon,
            bearing: r.bearing,
            speed: r.speed,
            timestamp: r.timestamp,
            currentStopSequence: r.currentStopSequence,
            stopId: r.stopId,
          },
        })
      )
    );

    console.log(`[gtfs-rt] ingested ${records.length} vehicle positions`);
    return records.length;
  }

  /**
   * Start polling at the configured interval. Safe to call multiple times (no-op if already running).
   */
  startPolling(): void {
    if (this.running || this.timer !== null) return;
    this.running = true;
    this.pollOnce().catch((err) => console.error('[gtfs-rt] initial poll failed:', err.message));
    this.timer = setInterval(() => {
      this.pollOnce().catch((err) => console.error('[gtfs-rt] poll failed:', err.message));
    }, POLL_INTERVAL_MS);
    console.log(`[gtfs-rt] polling started (interval ${POLL_INTERVAL_MS}ms)`);
  }

  stopPolling(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
    console.log('[gtfs-rt] polling stopped');
  }

  isRunning(): boolean {
    return this.running;
  }
}

export const gtfsRtIngestionService = new GtfsRtIngestionService();
