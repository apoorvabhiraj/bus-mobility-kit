# Data Ingestion Design — Delhi DTC Bus GPS Traces (Problem 1)

**Task:** BUS-001 (Problem 1 — Bus Travel-Time Planner)
**Status:** Implemented
**Branch:** `feature/BUS-001-problem1-gps`

## 1. Overview

The ingestion layer loads two data sources into the Prisma/PostgreSQL schema (`packages/backend/prisma/schema.prisma`) used by the backend API:

1. **Static GTFS** — agency, routes, stops, trips, stop_times, calendar, shapes, feed_info from `delhi_buses_static_gtfs_v1.zip`. Loaded into `Stop`, `BusRoute`, and `RouteStop` tables.
2. **Real-time GTFS-RT** — `VehiclePositions.pb` polled from the Transport Stack API. Loaded into the `VehiclePosition` table.

The 124 GB historical GPS archive is NOT used — only the real-time VehiclePositions feed plus the static GTFS reference.

## 2. Source data

| Source | Location | Format | Notes |
|--------|----------|--------|-------|
| Static GTFS | `C:/Users/apoor/Downloads/delhi_buses_static_gtfs_v1.zip` | ZIP of CSV | agency.txt, routes.txt, stops.txt, trips.txt, stop_times.txt, calendar.txt, shapes.txt, feed_info.txt |
| Real-time GTFS-RT | `https://dts-backend.transportstack.in/api/dataset/otd/get-file?agency=delhi-buses&category=realtime_gtfs&filename=VehiclePositions.pb` | Protobuf (GTFS-realtime FeedMessage) | Header `x-api-key: <DTS_API_KEY>` |

## 3. Implementation files

| File | Purpose | Path |
|------|---------|------|
| Static GTFS ingestion script | Parses the GTFS zip, upserts Stop/BusRoute/RouteStop into Prisma | `scripts/ingest-gtfs-static.ts` |
| Real-time GTFS-RT ingestion service | Polls the API, decodes VehiclePositions protobuf, writes VehiclePosition rows | `packages/backend/src/services/gtfs-rt-ingestion.service.ts` |
| On-demand real-time ingestion script | Runs a single poll (`once`) or starts polling (`poll`) | `scripts/ingest-gtfs-realtime.ts` |
| GTFS static parsing test | Verifies routes/stops/trips/stop_times parse from the zip | `packages/backend/tests/gtfs-static-ingestion.test.ts` |

## 4. Database schema (Prisma PostgreSQL)

Relevant models in `packages/backend/prisma/schema.prisma`:

- `Stop(id, stopCode @unique, name, lat, lon, zone?, createdAt, updatedAt)`
- `BusRoute(id, routeNumber @unique, longName, busType, totalDistanceKm, ...)`
- `RouteStop(id, routeId, stopId, stopSequence, @@unique([routeId, stopSequence]))`
- `VehiclePosition(id, vehicleId, tripId?, routeId?, lat, lon, bearing?, speed?, timestamp, recordedAt, currentStopSequence?, stopId?, @@index([vehicleId]), @@index([routeId]), @@index([timestamp]), @@index([lat, lon]))`

`VehiclePosition` was added to the schema for the real-time feed (`prisma generate` run).

## 5. Column mappings — static GTFS → Prisma

| GTFS file | GTFS column | Prisma model | Prisma field | Notes |
|-----------|-------------|--------------|--------------|-------|
| stops.txt | stop_id | Stop | stopCode | unique |
| stops.txt | stop_name | Stop | name | |
| stops.txt | stop_lat | Stop | lat | Float |
| stops.txt | stop_lon | Stop | lon | Float |
| stops.txt | zone_id | Stop | zone | optional |
| routes.txt | route_short_name (fallback route_id) | BusRoute | routeNumber | unique |
| routes.txt | route_long_name | BusRoute | longName | |
| routes.txt | route_type | BusRoute | busType | default "Standard" |
| trips.txt / stop_times.txt | route_id + stop_id + stop_sequence | RouteStop | routeId, stopId, stopSequence | stop sequence derived from stop_times ordered per trip |

The static script reads all entries with `jszip`, parses each CSV (`parseCsv`), upserts stops then routes, then builds `RouteStop` rows from `stop_times` ordered by `stop_sequence` per trip (joined to `trips.txt` for `route_id`).

## 6. Protobuf schema — real-time GTFS-RT

Decoded with `gtfs-realtime-bindings` (`transit_realtime.FeedMessage.decode(buffer)`). Each `FeedMessage.entity[]` with a `vehicle` field yields one `VehiclePosition`:

| FeedMessage.entity.vehicle field | GTFS-RT proto field | VehiclePosition field |
|----------------------------------|---------------------|-----------------------|
| vehicle.id | VehicleDescriptor.id | vehicleId |
| trip.trip_id | TripDescriptor.tripId | tripId |
| trip.route_id | TripDescriptor.routeId | routeId |
| position.latitude | Position.latitude | lat |
| position.longitude | Position.longitude | lon |
| position.bearing | Position.bearing | bearing |
| position.speed | Position.speed (m/s) | speed |
| timestamp | VehiclePosition.timestamp (unix seconds) | timestamp |
| current_stop_sequence | VehiclePosition.currentStopSequence | currentStopSequence |
| stop_id | VehiclePosition.stopId | stopId |
| — | ingestion time | recordedAt (default now()) |

## 7. Polling interval

Default `GTFS_RT_POLL_INTERVAL_MS = 30000` (30 seconds), overridable via the `GTFS_RT_POLL_INTERVAL_MS` environment variable. The service exposes `startPolling()` / `stopPolling()` / `pollOnce()`. Authentication uses `x-api-key` header from `DTS_API_KEY` (or `API_KEY`) env var.

## 8. Running ingestion

Static GTFS (one-time load):
```
GTFS_ZIP_PATH=<path-to-zip> npx ts-node scripts/ingest-gtfs-static.ts
```

Real-time, one poll:
```
DTS_API_KEY=<key> npx ts-node scripts/ingest-gtfs-realtime.ts once
```

Real-time, continuous polling:
```
DTS_API_KEY=<key> npx ts-node scripts/ingest-gtfs-realtime.ts poll
```

## 9. Connection to the backend

Ingestion writes to the same Prisma PostgreSQL schema the Express backend (`packages/backend/`) reads. `VehiclePosition` rows are persisted via the shared `prisma` client (`packages/backend/src/services/prisma.service.ts`), so once data is ingested the journey planner (`/journeys/plan`) can be backed by real travel-time observations. The OpenAPI contracts were not modified.

## 10. Verification

- `pnpm --filter @delhi-transport/backend typecheck` — passes
- `pnpm --filter @delhi-transport/backend test` — 13 tests pass, including `gtfs-static-ingestion.test.ts` (routes=2574, stops=6862, trips=80357, stop_times=2,737,136 parsed from the live zip)

**Not yet end-to-end verified:** a live real-time poll against the Transport Stack API requires `DTS_API_KEY`, which the holder (the user) obtained separately and is not checked into the repo. The fetcher implementation is complete and type-checked; it needs the key to run against the live endpoint.

## 11. Constraints honored

- OpenAPI contracts and Biscuit's frontend not modified; existing backend API consumed.
- Work confined to `docs/problem1/`, `scripts/`, `packages/backend/src/services/` (ingestion service only), `packages/backend/tests/` (ingestion test), plus the Prisma schema (new `VehiclePosition` model).
- No teammate's assigned files touched.
- 124 GB historical GPS archive not downloaded or unpacked.
