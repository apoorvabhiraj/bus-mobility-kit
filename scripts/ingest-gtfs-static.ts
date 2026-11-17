import { PrismaClient } from '@prisma/client';
import JSZip from 'jszip';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

const GTFS_ZIP = process.env.GTFS_ZIP_PATH || 'C:/Users/apoor/Downloads/delhi_buses_static_gtfs_v1.zip';

type CsvRow = Record<string, string>;

export function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row: CsvRow = {};
    header.forEach((h, i) => {
      row[h] = values[i] ?? '';
    });
    return row;
  });
}

async function readEntry(zip: JSZip, name: string): Promise<CsvRow[]> {
  const file = zip.file(name);
  if (!file) {
    console.warn(`[gtfs-static] missing entry: ${name}`);
    return [];
  }
  const text = await file.async('text');
  return parseCsv(text);
}

async function main() {
  console.log('[gtfs-static] reading zip:', GTFS_ZIP);
  const zip = await JSZip.loadAsync(readFileSync(GTFS_ZIP));

  const [agencyRows, routesRows, stopsRows, tripsRows, stopTimesRows, calendarRows, shapesRows, feedInfoRows] =
    await Promise.all([
      readEntry(zip, 'agency.txt'),
      readEntry(zip, 'routes.txt'),
      readEntry(zip, 'stops.txt'),
      readEntry(zip, 'trips.txt'),
      readEntry(zip, 'stop_times.txt'),
      readEntry(zip, 'calendar.txt'),
      readEntry(zip, 'shapes.txt'),
      readEntry(zip, 'feed_info.txt'),
    ]);

  console.log(
    `[gtfs-static] parsed agency=${agencyRows.length} routes=${routesRows.length} stops=${stopsRows.length} trips=${tripsRows.length} stop_times=${stopTimesRows.length} calendar=${calendarRows.length} shapes=${shapesRows.length} feed_info=${feedInfoRows.length}`
  );

  // --- Stops ---
  for (const s of stopsRows) {
    await prisma.stop.upsert({
      where: { stopCode: s.stop_id || s.stop_code || '' },
      update: {
        name: s.stop_name || s.name || '',
        lat: parseFloat(s.stop_lat || s.lat || '0'),
        lon: parseFloat(s.stop_lon || s.lon || '0'),
        zone: s.zone_id || s.zone || undefined,
      },
      create: {
        stopCode: s.stop_id || s.stop_code || '',
        name: s.stop_name || s.name || '',
        lat: parseFloat(s.stop_lat || s.lat || '0'),
        lon: parseFloat(s.stop_lon || s.lon || '0'),
        zone: s.zone_id || s.zone || undefined,
      },
    });
  }
  console.log(`[gtfs-static] upserted ${stopsRows.length} stops`);

  // --- Routes ---
  const routeMap = new Map<string, string>(); // route_id -> prisma BusRoute id
  for (const r of routesRows) {
    const routeId = r.route_id || '';
    const created = await prisma.busRoute.upsert({
      where: { routeNumber: r.route_short_name || r.route_id || '' },
      update: {
        longName: r.route_long_name || '',
        busType: r.route_type ? mapBusType(r.route_type) : 'Standard',
      },
      create: {
        routeNumber: r.route_short_name || r.route_id || '',
        longName: r.route_long_name || '',
        busType: r.route_type ? mapBusType(r.route_type) : 'Standard',
        totalDistanceKm: 0,
      },
    });
    routeMap.set(routeId, created.id);
  }
  console.log(`[gtfs-static] upserted ${routesRows.length} routes`);

  // --- RouteStop (from stop_times to derive stop sequence per route) ---
  // Build per (route_id, trip_id) ordered stop list, then merge into route stop sequence.
  const tripStopTimes = new Map<string, Array<{ stopId: string; stopSequence: number }>>();
  for (const st of stopTimesRows) {
    const tripId = st.trip_id || '';
    const seq = parseInt(st.stop_sequence || '0', 10);
    const stopId = st.stop_id || '';
    if (!tripId || !stopId) continue;
    if (!tripStopTimes.has(tripId)) tripStopTimes.set(tripId, []);
    tripStopTimes.get(tripId)!.push({ stopId, stopSequence: seq });
  }

  let routeStopCount = 0;
  for (const [tripId, stops] of tripStopTimes) {
    stops.sort((a, b) => a.stopSequence - b.stopSequence);
    // trips.txt maps trip_id -> route_id
    // We need route_id; derive from trips rows
    const tripRow = tripsRows.find((t) => t.trip_id === tripId);
    const routeId = tripRow?.route_id || '';
    const prismaRouteId = routeMap.get(routeId);
    if (!prismaRouteId) continue;

    for (const { stopId, stopSequence } of stops) {
      const stop = await prisma.stop.findUnique({ where: { stopCode: stopId } });
      if (!stop) continue;
      await prisma.routeStop.upsert({
        where: { routeId_stopSequence: { routeId: prismaRouteId, stopSequence } },
        update: { stopId: stop.id },
        create: { routeId: prismaRouteId, stopId: stop.id, stopSequence },
      });
      routeStopCount++;
    }
  }
  console.log(`[gtfs-static] upserted ${routeStopCount} route-stops`);

  console.log('[gtfs-static] ingestion complete');
  await prisma.$disconnect();
}

function mapBusType(routeType: string): 'Standard' | 'AC' | 'Electric' {
  const t = routeType.trim();
  // GTFS route_type: 3 = Bus, etc. We don't have DTC-specific typing; default Standard.
  return 'Standard';
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[gtfs-static] fatal:', err);
    process.exit(1);
  });
}

export { main };
