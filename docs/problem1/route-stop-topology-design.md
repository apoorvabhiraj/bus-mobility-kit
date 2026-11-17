# Route/Stop Topology Extraction Design

**Task:** BUS-001 (Problem 1 — Bus Travel-Time Planner)
**Scope:** Design only. Build the road/time graph from GPS + route + stop data.
**Status:** Proposed design

## 1. Overview

The journey planner needs a graph whose nodes are stops and road junctions and whose edges carry time-dependent travel costs. This module builds that graph from three sources:
- GPS traces (`vehicle_positions`) — observed bus movement
- Routes (`routes`) — declared DTC route identity
- Stops (`stops`, `route_stops`) — declared stop locations and per-route stop order

## 2. Graph model

**Nodes:**
- `stop` nodes — each `stop_id` with lat/lon
- `junction` nodes — road intersections from the Delhi road network (for road-segment edges)

**Edges (typed):**
| Edge type | From | To | Weight | Meaning |
|-----------|------|----|--------|---------|
| `road` | junction | junction | travel_time_s (time-dependent) | Drive along a road segment |
| `route` | stop | stop (same route, consecutive in route_stops) | travel_time_s (from GPS) | Bus travels between consecutive stops on a route |
| `walk` | stop | junction | walking_time_s | Passenger walks from stop to road network |
| `walk` | stop | stop | walking_time_s | Passenger walks between nearby stops (transfer) |
| `transfer` | stop | stop | transfer_penalty_s | Alight/board penalty at a shared stop |

## 3. Extraction steps

### 3.1 Stop nodes
Use the `stops` table as the authoritative stop set. For routes missing stop reference data, derive candidate stops by clustering GPS fixes (DBSCAN on lat/lon, e.g. 30 m radius, min 5 fixes) near the route's trace, then snap clusters to the nearest declared stop or create a derived stop.

### 3.2 Route stop order
Use `route_stops.sequence` where present. Where absent, infer order from GPS traces on that `route_id`: sort fixes by timestamp, project onto the polyline of stops, and assign increasing sequence numbers by progression along the route.

### 3.3 Route (stop-to-stop) edges
For each consecutive stop pair on a route, collect GPS-based travel times between those stops (trajectory segments bounded by snap events at each stop). Aggregate into `median_travel_time_s` by time bucket, exactly as in the travel-time estimation model. Edge weight = time-dependent travel time.

### 3.4 Road (junction-to-junction) edges
From the Delhi road reference network, each road segment becomes a `road` edge weighted by the travel-time estimation table (median time by time bucket). Road edges exist independently of bus routes — they serve walk and any-road fallback routing.

### 3.5 Walk edges
- Stop → nearest junction: straight-line walking distance / walking speed (4 kmh), capped (e.g. 300 m).
- Stop → nearby stop (within ~400 m): walking edge for transfers between routes.

## 4. Time-dependence

All `road` and `route` edge weights are functions of `(day_type, time_bucket)` drawn from the travel-time estimation output. The journey optimization module queries edge weights at the relevant departure time.

## 5. Output

A versioned graph artifact (e.g. `data/graph/2026-10-01.graph.json` or loaded into the journey service):

```
nodes: [{id, type, lat, lon}]
edges: [{id, type, from, to, weight_s, confidence, day_type, time_bucket}]
```

## 6. Assumptions & limitations

- Stop-to-stop GPS travel times require buses to actually be observed stopping at both ends; low-frequency routes may have few or no observations.
- Derived stops from GPS clustering are approximations; they are flagged as `derived` (not authoritative `declared`).
- Road network reference data is external to the GPS kit and is used for geometry only.
- Without boarding/alighting data, stop-to-stop travel time is bus-movement time, not passenger journey time (dwell/transfer added separately by journey optimization).
