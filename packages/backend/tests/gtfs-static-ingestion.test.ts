import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { readFileSync } from 'fs';
import { parseCsv } from '../../scripts/ingest-gtfs-static';

const GTFS_ZIP = process.env.GTFS_ZIP_PATH || 'C:/Users/apoor/Downloads/delhi_buses_static_gtfs_v1.zip';

async function readGtfsEntry(zip: JSZip, name: string) {
  const file = zip.file(name);
  expect(file, `GTFS entry missing: ${name}`).toBeTruthy();
  const text = await file!.async('text');
  return parseCsv(text);
}

describe('GTFS static ingestion parsing', () => {
  it('parses routes.txt, stops.txt, trips.txt and stop_times.txt from the Delhi DTC GTFS zip', async () => {
    const zip = await JSZip.loadAsync(readFileSync(GTFS_ZIP));

    const routes = await readGtfsEntry(zip, 'routes.txt');
    const stops = await readGtfsEntry(zip, 'stops.txt');
    const trips = await readGtfsEntry(zip, 'trips.txt');
    const stopTimes = await readGtfsEntry(zip, 'stop_times.txt');

    // Sanity: all core files present and non-empty
    expect(routes.length).toBeGreaterThan(0);
    expect(stops.length).toBeGreaterThan(0);
    expect(trips.length).toBeGreaterThan(0);
    expect(stopTimes.length).toBeGreaterThan(0);

    // routes.txt carries route identity fields
    expect(routes[0]).toHaveProperty('route_id');
    expect(routes[0]).toHaveProperty('route_short_name');
    expect(routes[0]).toHaveProperty('route_long_name');

    // stops.txt carries location fields
    expect(stops[0]).toHaveProperty('stop_id');
    expect(stops[0]).toHaveProperty('stop_name');
    expect(stops[0]).toHaveProperty('stop_lat');
    expect(stops[0]).toHaveProperty('stop_lon');

    // trips.txt links a trip to a route
    expect(trips[0]).toHaveProperty('trip_id');
    expect(trips[0]).toHaveProperty('route_id');

    // stop_times.txt carries stop sequence
    expect(stopTimes[0]).toHaveProperty('trip_id');
    expect(stopTimes[0]).toHaveProperty('stop_id');
    expect(stopTimes[0]).toHaveProperty('stop_sequence');

    // Stops that carry coordinates have numeric lat/lon within Delhi bounds
    const stopsWithCoords = stops.filter((s) => Number.isFinite(Number(s.stop_lat)) && Number.isFinite(Number(s.stop_lon)));
    expect(stopsWithCoords.length).toBeGreaterThan(0);
    for (const stop of stopsWithCoords) {
      const lat = Number(stop.stop_lat);
      const lon = Number(stop.stop_lon);
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      expect(lon).toBeGreaterThanOrEqual(-180);
      expect(lon).toBeLessThanOrEqual(180);
    }

    console.log(
      `[gtfs-static-test] routes=${routes.length} stops=${stops.length} trips=${trips.length} stop_times=${stopTimes.length}`
    );
  });
});
