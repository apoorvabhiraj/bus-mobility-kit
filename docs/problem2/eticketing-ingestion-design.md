# E-Ticketing / ETM Data Ingestion Design

**Project**: Intelligent Bus Mobility & Crowdedness-Aware Journey Planner (Delhi)
**Task**: BUS-001 — Problem 2: Crowdedness-Aware Journey Planner
**Branch**: feature/BUS-001-problem2-crowdedness
**Version**: 1.0 (Design Phase — No Data Download)

---

## 1. Dataset Overview

| Property | Value |
|----------|-------|
| **Source** | Delhi bus e-ticketing system (October 2026) |
| **Period** | 1–31 October 2026 |
| **Volume** | ~2.56 million ticket records |
| **Format** | Single CSV (66 MB compressed .zip, 290 MB unpacked) |
| **Coverage** | ~3–4% of total bus tickets (per Problem 3 background) |

> **Note**: This is a **design-only** document. No data download or ingestion occurs in this phase.

---

## 2. Expected CSV Schema

Based on typical Delhi e-ticketing / ETM (Electronic Ticketing Machine) exports, the CSV is expected to contain the following fields. Actual schema must be validated on first load.

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `ticket_id` | string | Unique ticket identifier | `TKT-20261015-001234` |
| `route_id` | string | Bus route identifier | `724`, `102A`, `ECO-1` |
| `direction` | enum | `UP` / `DOWN` (or numeric 1/2) | `UP` |
| `bus_id` | string | Vehicle / bus identifier | `DL-1PC-1234` |
| `conductor_id` | string | Conductor / ETM operator ID | `COND-5678` |
| `boarding_stop_id` | string | Stop code where passenger boarded | `STP-045` |
| `boarding_stop_name` | string | Stop name (denormalized) | `Connaught Place` |
| `boarding_time` | datetime (ISO 8601) | Timestamp of boarding | `2026-10-15T08:23:12+05:30` |
| `alighting_stop_id` | string | Stop code where passenger alighted | `STP-078` |
| `alighting_stop_name` | string | Stop name (denormalized) | `AIIMS` |
| `alighting_time` | datetime (ISO 8601) | Timestamp of alighting (if recorded) | `2026-10-15T08:47:05+05:30` |
| `ticket_type` | enum | `ADULT`, `CHILD`, `SENIOR`, `STUDENT`, `PASS`, `DAILY_PASS` | `ADULT` |
| `fare_paid` | decimal | Fare amount in INR | `15.00` |
| `payment_mode` | enum | `UPI`, `CARD`, `CASH`, `NCMC`, `WALLET` | `UPI` |
| `distance_km` | decimal | Charged distance (may be zonal) | `12.5` |

### 2.1 Schema Variants & Edge Cases

- **Missing alighting data**: Many ETM systems only record boarding; alighting may be inferred or absent.
- **Zonal fares**: Distance may be fare zones, not geodesic km.
- **Route variants**: Same `route_id` may have sub-variants (express, limited-stop); check `direction` + stop sequence.
- **Time zone**: All timestamps in IST (UTC+05:30), no DST.
- **Duplicate tickets**: Possible re-prints or corrections; deduplicate on `ticket_id`.

---

## 3. Ingestion Pipeline Design

### 3.1 High-Level Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Raw CSV    │────▶│  Validation  │────▶│  Normalization  │────▶│  Partitioned     │
│  (290 MB)   │     │  & Parsing   │     │  & Enrichment   │     │  Parquet (by    │
└─────────────┘     └──────────────┘     └─────────────────┘     │  date + route)   │
                                                                    └──────────────────┘
                                                                             │
                                                                             ▼
                                                                    ┌──────────────────┐
                                                                    │  PostgreSQL      │
                                                                    │  (staging +      │
                                                                    │   analytics)     │
                                                                    └──────────────────┘
```

### 3.2 Stage 1: Validation & Parsing

**Tooling**: Python (pandas / polars) or DuckDB for fast CSV scanning.

**Checks**:
- Row count ≈ 2.56M ± 5%
- Required columns present, no null `ticket_id`, `route_id`, `boarding_time`
- `boarding_time` within October 2026 bounds
- `route_id` matches known route registry (from GTFS / schedule data)
- `boarding_stop_id` / `alighting_stop_id` exist in stop master
- Deduplication: `ticket_id` uniqueness
- Fare sanity: `fare_paid` within expected range for route

**Output**: Validated DataFrame + rejected rows log (CSV/Parquet).

### 3.3 Stage 2: Normalization & Enrichment

| Transformation | Detail |
|----------------|--------|
| **Time bucketing** | Add `time_band` (e.g., 30-min buckets: `06:00-06:30`, `06:30-07:00`...) |
| **Date partition** | Add `service_date` (date component of `boarding_time`) |
| **Route canonicalization** | Map `route_id` + `direction` → canonical `route_direction_id` |
| **Stop sequence** | Join with GTFS `stop_times` to get `stop_sequence` for boarding/alighting |
| **Segment derivation** | If both stops present: derive `segment_id = (route_direction_id, boarding_seq, alighting_seq)` |
| **Passenger weight** | `ticket_type` → weight (ADULT=1.0, CHILD=0.5, SENIOR=1.0, PASS=1.0, etc.) |

### 3.4 Stage 3: Partitioned Storage

**Format**: Apache Parquet (columnar, compression, predicate pushdown)

**Partitioning**:
```
s3://bucket/eticketing/
  year=2026/month=10/day=01/route=724/part-000.parquet
  year=2026/month=10/day=01/route=102A/part-000.parquet
  ...
```

**Alternative (PostgreSQL staging)**:
```sql
CREATE TABLE eticketing_raw (
  ticket_id       TEXT PRIMARY KEY,
  route_id        TEXT NOT NULL,
  direction       TEXT NOT NULL,
  bus_id          TEXT,
  conductor_id    TEXT,
  boarding_stop_id    TEXT NOT NULL,
  boarding_time        TIMESTAMPTZ NOT NULL,
  alighting_stop_id    TEXT,
  alighting_time       TIMESTAMPTZ,
  ticket_type      TEXT NOT NULL,
  fare_paid        NUMERIC(8,2),
  payment_mode     TEXT,
  distance_km      NUMERIC(6,2),
  -- enriched
  service_date     DATE GENERATED ALWAYS AS (boarding_time::date) STORED,
  time_band        TEXT GENERATED ALWAYS AS (
    to_char(boarding_time, 'HH24:MI') -- 30-min buckets computed in view
  ) STORED,
  passenger_weight NUMERIC(3,2) GENERATED ALWAYS AS (
    CASE ticket_type
      WHEN 'CHILD' THEN 0.5
      ELSE 1.0
    END
  ) STORED
) PARTITION BY RANGE (service_date);

-- Monthly partitions
CREATE TABLE eticketing_raw_2026_10 PARTITION OF eticketing_raw
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
```

**Indexes**:
- `(route_id, direction, service_date, boarding_time)`
- `(boarding_stop_id, service_date)`
- `(bus_id, service_date)` — for vehicle-level analysis

---

## 4. Incremental / Daily Ingestion (Future)

| Aspect | Design |
|--------|--------|
| **Trigger** | Daily batch (next-day ETM dump) or hourly micro-batches |
| **Idempotency** | Upsert on `ticket_id` (PK) |
| **Late arrivals** | 3-day lookback window for corrections |
| **Schema evolution** | Additive columns only; breaking changes → new table version |

---

## 5. Data Quality Metrics (to Track)

| Metric | Target |
|--------|--------|
| Row completeness (vs expected daily volume) | > 95% |
| Null `boarding_stop_id` rate | < 0.1% |
| Null `alighting_stop_id` rate | Documented (expected high) |
| Duplicate `ticket_id` rate | 0% |
| `boarding_time` out-of-range | 0% |
| Route coverage (routes with >0 tickets / total routes) | > 80% |

---

## 6. Downstream Consumers

| Consumer | Data Needed |
|----------|-------------|
| **Crowdedness Estimation Model** | Boarding/alighting by route, segment, time band |
| **Journey Planner** | Aggregated demand proxies per route + time band |
| **Analytics / Dashboard** | Daily/weekly trends, route load profiles |

---

## 7. Open Questions (Resolve Before Implementation)

1. **Actual CSV schema** — confirm column names, types, encoding (UTF-8? BOM?)
2. **Alighting data availability** — what % of records have alighting stop/time?
3. **Route registry** — authoritative list of `route_id` + direction + stop sequence (GTFS?)
4. **Stop master** — canonical stop IDs, names, lat/lon
4. **Fare zones** — mapping from `distance_km` or fare to actual km
5. **ETM vs. mobile app tickets** — are both in same CSV? Different schemas?
6. **Data access** — S3, SFTP, API? Authentication? Update frequency?

---

## 8. References

- `PROJECT.md` — Data caveats (ticket records ≠ complete passenger count)
- `ARCHITECTURE.md` — Logical module 3: "Ticketing/passenger processing and occupancy estimation"
- `STACK_DECISION.md` — Python/uv for data pipeline, PostgreSQL + Prisma for storage