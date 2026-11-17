# Assumptions, Data Limitations & Uncertainty

**Task:** BUS-001 (Problem 1 — Bus Travel-Time Planner)
**Scope:** Problem 1 (GPS / travel-time). Problem 2 (ticketing/crowding) is a separate task.
**Status:** Proposed design

## 1. Governing data caveat (from PROJECT.md)

> GPS observations only support road/time estimates for the roads and periods actually observed.

Every estimate in this design is bounded by that rule. Where a road or time of day has no GPS observations, the system must report uncertainty or `no_data` rather than invent a travel time.

## 2. Assumptions

| # | Assumption | Basis / status |
|---|------------|----------------|
| A1 | One SQLite database per day, 1–31 October 2026 | Task brief |
| A2 | Raw data arrives as one `.7z` archive per day, ~16.1 GB compressed / ~124 GB unpacked total | Task brief |
| A3 | GPS records include vehicle_id, route_id, lat, lon, speed_kmd, timestamp | Assumed; actual schema to be confirmed |
| A4 | Route + stop reference data available (separate or derivable from GPS) | Assumed |
| A5 | An OpenStreetMap-derived Delhi road network exists for map-matching | External; not part of the 124 GB kit |
| A6 | India time (UTC+05:30) used for time buckets | Delhi local time |
| A7 | Design only — no data download or ingestion performed | Task constraint |

## 3. Data limitations

1. **Road coverage.** Only roads actually traversed by DTC buses with working GPS are supported. Residential streets, minor roads, and roads without bus routes have no observations.
2. **Time coverage.** Only periods when buses run and report GPS are supported. Late-night/early-morning windows and low-frequency routes are sparsely observed.
3. **Map-matching error.** GPS fixes are snapped to the nearest road segment; in dense central Delhi (urban canyon, overlapping roads) a fix may attach to the wrong segment, biasing that segment's travel time.
4. **No live traffic.** Estimates are derived from historical GPS traces within October 2026, not real-time feed. A sudden jam or incident is not reflected unless similar conditions appeared in the observed window.
5. **No passenger/crowding data (Problem 1 scope).** Ticket records are not a complete passenger count (PROJECT.md); Problem 1 produces bus travel time, not segment occupancy. Crowding-aware planning is Problem 2's domain.
6. **No dwell/boarding data.** Without stop-level boarding/alighting, stop-to-stop time is bus movement time only; dwell and transfer penalties are modelled assumptions, not measured.
7. **Route reference completeness.** Routes missing declared stops/order must be derived from GPS traces, which are approximations.

## 4. Where uncertainty is highest (per kit)

| Area | Why uncertainty is high | Mitigation |
|------|------------------------|------------|
| Minor/residential roads | Few or no bus GPS observations | Return `no_data`; fall back to road-class free-flow speed with low confidence |
| Late night / early morning | Low bus frequency, sparse GPS | Temporal + historical smoothing; low confidence |
| Central Delhi (dense grid) | Map-matching ambiguity between nearby parallel roads | Snap radius tuned; flag segments with low map-match quality |
| Low-frequency routes | Few observed stop-to-stop traversals | Derive stop order from GPS; aggregate across days; low confidence |
| Holidays / special days | Patterns differ from regular weekdays | Treat as separate day_type; if unobserved, use nearest day_type + low confidence |
| Cross-day journeys | Daily DBs are independent | Query each day's DB; note boundary uncertainty |

## 5. How uncertainty is surfaced

- Every journey option carries `confidence` (0–1) and `uncertainty_note`.
- Every segment carries its own `confidence`.
- The response carries a `coverage_note` describing which roads/times in the query lacked GPS observations.
- Options through `no_data` segments are either excluded or returned with low confidence and an explicit note.

## 6. Boundaries with Problem 2

Problem 1 does not estimate passenger occupancy or crowding. Any `crowdedness` field in the journey response is explicitly a placeholder/not-implemented marker until Problem 2 (ticketing/passenger processing) provides boarding/alighting-derived load estimates. Per PROJECT.md, results must be labelled as proxies, not measured segment occupancy.
