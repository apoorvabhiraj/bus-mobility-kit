# Data Ingestion Design — Delhi DTC Bus GPS Traces

**Task:** BUS-001 (Problem 1 — Bus Travel-Time Planner)
**Scope:** Design only. No ingestion is performed and the 124 GB GPS dataset is NOT downloaded.
**Status:** Proposed design

## 1. Overview

The ingestion layer converts raw Delhi DTC bus GPS trace archives into one queryable SQLite database per day (1–31 October 2026). Each daily database stores vehicle positions, route reference data, and stop locations, validated and indexed so the travel-time estimation and route/topology modules can read them without re-parsing raw archives.

## 2. Source data layout (assumed)

Raw archives arrive as one `.7z` file per day:

```
data/raw/2026-10-01/dtc-gps-2026-10-01.7z   (~0.52 GB compressed)
```

Kit constraints (from PROJECT.md / brief):
- 31 daily archives, ~16.1 GB compressed total, ~124 GB unpacked total
- One SQLite database per day, built from that day's unpacked archive
- Design only — do not download or unpack

Assumed record shape inside each archive (to be confirmed against the actual kit schema):
- Vehicle position: `vehicle_id, route_id, trip_id, lat, lon, speed_kmh, heading_deg, timestamp_utc, recorded_at_utc`
- Route reference: `route_id, route_name, operator, direction`
- Stop reference: `stop_id, stop_name, lat, lon, zone`

## 3. Output: one SQLite database per day

```
data/warehouse/2026-10-01.sqlite
data/warehouse/2026-10-02.sqlite
...
data/warehouse/2026-10-31.sqlite
```

Each daily DB is self-contained for that day and carries an `ingestion_meta` table recording provenance so downstream modules can trust the data they read.

### 3.1 Schema

```sql
-- Provenance / quality metadata for this daily build
CREATE TABLE ingestion_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
-- example rows: source_archive, archive_sha256, record_count, valid_count,
-- rejected_count, ingested_at_utc, delhi_bbox, kit_version

CREATE TABLE vehicle_positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT NOT NULL,
    route_id TEXT,
    trip_id TEXT,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    speed_kmh REAL,
    heading_deg REAL,
    timestamp_utc TEXT NOT NULL,   -- ISO-8601, UTC
    recorded_at_utc TEXT NOT NULL,
    source_file TEXT NOT NULL,
    ingested_at_utc TEXT NOT NULL
);

CREATE TABLE routes (
    route_id TEXT PRIMARY KEY,
    route_name TEXT,
    operator TEXT DEFAULT 'DTC',
    direction TEXT
);

CREATE TABLE stops (
    stop_id TEXT PRIMARY KEY,
    stop_name TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    zone TEXT
);

CREATE TABLE route_stops (
    route_id TEXT NOT NULL,
    stop_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    PRIMARY KEY (route_id, stop_id),
    FOREIGN KEY (route_id) REFERENCES routes(route_id),
    FOREIGN KEY (stop_id) REFERENCES stops(stop_id)
);

-- Records that failed validation, kept for audit
CREATE TABLE ingestion_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file TEXT NOT NULL,
    line_no INTEGER,
    error TEXT NOT NULL,
    raw TEXT
);
```

### 3.2 Indexes (chosen for the travel-time + topology read patterns)

```sql
CREATE INDEX idx_pos_vehicle_time ON vehicle_positions(vehicle_id, timestamp_utc);
CREATE INDEX idx_pos_route_time   ON vehicle_positions(route_id, timestamp_utc);
CREATE INDEX idx_pos_time         ON vehicle_positions(timestamp_utc);
CREATE INDEX idx_pos_location     ON vehicle_positions(lat, lon);
CREATE INDEX idx_pos_speed        ON vehicle_positions(speed_kmh);
```

## 4. Ingestion pipeline (per day)

1. **Locate archive.** Resolve `data/raw/YYYY-MM-DD/*.7z`; record `source_archive` and SHA-256.
2. **Decompress to scratch.** Stream-decompress (do not keep unpacked 124 GB on disk longer than needed).
3. **Parse records.** Read each position record; normalize timestamp to UTC ISO-8601.
4. **Validate.** Apply Delhi-specific sanity checks (section 5).
5. **Deduplicate.** Drop duplicate `(vehicle_id, timestamp_utc)` rows, keeping the first.
6. **Enrich.** Join `route_id` against the master `routes` table and snap positions to the nearest known `stop_id` when within a stop snap radius (e.g. 50 m) for the topology module.
7. **Load.** Insert into the daily SQLite DB in transactions; write rejected rows to `ingestion_errors`.
8. **Write meta.** Populate `ingestion_meta` with counts and provenance.
9. **Release scratch.** Delete unpacked scratch for that day before starting the next.

## 5. Validation rules (Delhi DTC)

| Rule | Check | Action on fail |
|------|-------|----------------|
| Delhi bounding box | lat in [28.40, 28.90], lon in [76.80, 77.35] | Reject + log |
| Speed sanity | 0 <= speed_kmh <= 120 | Reject + log |
| Timestamp range | within the archive's day (UTC) | Reject + log |
| Monotonic per vehicle | timestamp >= previous for same vehicle | Warn, keep (do not hard reject) |
| Missing keys | vehicle_id or timestamp null | Reject + log |

## 6. How downstream modules read the data

- **Travel-time estimation:** reads `vehicle_positions` ordered by `(vehicle_id, timestamp_utc)` to build trajectories; joins `speed_kmh` and map-matches `(lat, lon)` to Delhi road segments.
- **Route/stop topology:** reads `routes`, `stops`, `route_stops` for the reference graph; uses enriched `stop_id` on positions where available.
- All reads are read-only against the daily SQLite file; no module writes back into another module's DB.

## 7. Assumptions & open questions

- The exact raw record schema (CSV/JSON/Parquet, column names) is not yet confirmed; the parser must be parameterized per archive format.
- Route and stop reference data may arrive in a separate reference archive; if not, they must be derived from GPS traces (see route-stop-topology design).
- One DB per day keeps each file manageable (~4 GB/day unpacked) and makes backfills/rebuilds cheap, but cross-day queries need a catalog of daily DB files.
