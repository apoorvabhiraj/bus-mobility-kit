# Travel-Time Estimation Model Design

**Task:** BUS-001 (Problem 1 — Bus Travel-Time Planner)
**Scope:** Design only. Derive road-segment travel times from Delhi DTC bus GPS traces.
**Status:** Proposed design

## 1. Overview

Given GPS traces of DTC buses, estimate the time a bus takes to traverse each road segment in Delhi, as a function of time-of-day and day-of-week. These segment travel times feed the journey optimization module as time-dependent edge weights on the road/time graph.

## 2. Core idea

Map-match each GPS fix to a road segment, then compute a per-segment travel time from consecutive fixes that fall on the same segment. Aggregate all observations for a segment into time buckets (e.g. 30-minute slots) and day types (weekday / weekend / holiday), producing a lookup table:

`segment_id x day_type x time_bucket -> {median_travel_time_s, p10, p90, observation_count, confidence}`

## 3. Input data

From the daily SQLite warehouse (see data-ingestion design): `vehicle_positions(lat, lon, speed_kmh, timestamp_utc, vehicle_id, route_id)`, plus `routes` / `stops` reference.

External reference (read-only, not part of the 124 GB kit): an OpenStreetMap-derived road network for Delhi with segment geometry and centerlines. This is used only for map-matching; it is not the GPS dataset and is not downloaded as part of this task.

## 4. Pipeline

### 4.1 Map-matching
For each GPS fix, snap `(lat, lon)` to the nearest road segment centerline within a snap radius (e.g. 25 m), constrained by heading where available. Fixes with no nearby segment within the radius are dropped from segment estimation but kept for topology.

### 4.2 Trajectory segmentation
Order fixes by `(vehicle_id, timestamp_utc)`. For each pair of consecutive fixes on the same vehicle:
- If both map-match to the same segment `s`, compute `travel_time = t2 - t1` and associate with `s`.
- If they map-match to different segments, the boundary between segments is a travel-time observation for the path between them (used as a cross-check, not a primary segment observation).
- Discard pairs where `speed_kmh` is implausible for the segment (e.g. > 60 kmh on a Delhi arterial) or where the gap exceeds a timeout (e.g. 5 min — likely a fix dropout).

### 4.3 Aggregation
Bucket each segment observation by:
- `day_type`: weekday, weekend, Delhi public holiday
- `time_bucket`: 30-minute slot of day (00:00–00:30, …, 23:30–00:00), local India time (UTC+5:30)

Compute per `(segment_id, day_type, time_bucket)`:
- `count`: number of observations
- `median_travel_time_s`: robust central tendency (resists outliers from traffic spikes)
- `p10_travel_time_s`, `p90_travel_time_s`: spread
- `mean_speed_kmh`
- `confidence`: function of `count` and recency (section 4.4)

### 4.4 Handling sparse observations

Delhi DTC GPS will not cover every road at every time. Sparse cells are filled by:

1. **Temporal smoothing:** blend with adjacent time buckets (weighted by proximity) when a bucket has few observations.
2. **Spatial smoothing:** fall back to the segment's road class average (e.g. arterial vs residential) for the same time bucket, weighted by segment length.
3. **Historical pattern:** use the same day_type/time_bucket from prior days within October 2026 (rolling 7-day profile).
4. **Default:** free-flow speed for the road class (from OSM `maxspeed` / highway tag) as a last resort, flagged with low confidence.

Cells with zero observations and no defensible fallback are marked `no_data`; journeys through them return high uncertainty rather than inventing a time.

### 4.5 Confidence scoring

```
confidence = min(1, sqrt(count) / sqrt(required_count))   -- count-based
             * recency_factor                              -- newer observations weigh more
             * map_match_quality_factor
```

`required_count` (e.g. 20 observations) is the count at which a cell is considered fully confident. Confidence is exposed in the API so journey options can be ranked by both time and certainty.

## 5. Output (travel-time table)

Stored per day in the warehouse or a derived serving table:

| segment_id | day_type | time_bucket_start | median_travel_time_s | p10_s | p90_s | count | confidence | updated_at_utc |

This is versioned (one build per day) so the journey service can pin a specific build date for reproducible quotes.

## 6. Assumptions & limitations

- GPS speed (`speed_kmh`) is trusted only as a sanity filter; travel time is derived from timestamps between map-matched fixes, not from `speed_kmh` alone.
- Map-matching accuracy limits segment attribution in dense urban canyons (central Delhi).
- Observations only exist for roads/times actually traversed by DTC buses with working GPS.
- No real-time traffic beyond what the GPS probes themselves show; estimates are historical/typical, not live.
