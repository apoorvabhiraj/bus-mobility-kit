# Boarding/Alighting Load Estimation Method

**Project**: Intelligent Bus Mobility & Crowdedness-Aware Journey Planner (Delhi)
**Task**: BUS-001 — Problem 2: Crowdedness-Aware Journey Planner
**Branch**: feature/BUS-001-problem2-crowdedness
**Version**: 1.0 (Design Phase)

---

## 1. Purpose

Define the method to convert **boarding and alighting records** (from e-ticketing/ETM) into **on-vehicle load by segment and time band**, which feeds the crowdedness estimation model.

This document specifies:
- How to handle complete (board + alight) vs. partial (board only) records
- Trip reconstruction from sparse ticket data
- Segment load computation algorithms
- Uncertainty propagation

---

## 2. Input Data Requirements

### 2.1 Minimum Required Fields (Per Ticket)
| Field | Required | Notes |
|-------|----------|-------|
| `ticket_id` | Yes | Unique key |
| `route_id` | Yes | |
| `direction` | Yes | UP/DOWN |
| `bus_id` | Preferred | For trip grouping; fallback: time window |
| `boarding_stop_id` | Yes | |
| `boarding_stop_seq` | Yes | From GTFS join |
| `boarding_time` | Yes | IST timestamp |
| `alighting_stop_id` | No | **Critical gap** — see Section 4 |
| `alighting_stop_seq` | No | From GTFS join if stop_id present |
| `alighting_time` | No | |
| `passenger_weight` | Yes | Derived from `ticket_type` |

### 2.2 Reference Data (Joins Required)
| Table | Key | Provides |
|-------|-----|----------|
| `gtfs_stop_times` | `(route_id, direction, stop_id)` | `stop_sequence`, `shape_dist_traveled` |
| `gtfs_trips` | `(route_id, direction, trip_id)` | Scheduled trip times, `shape_id` |
| `fleet_registry` | `bus_id` | `vehicle_type`, `capacity` |
| `stop_master` | `stop_id` | `stop_name`, `lat`, `lon` |

---

## 3. Trip Reconstruction

### 3.1 Definition: Vehicle Trip
A **vehicle trip** = one bus (`bus_id`) completing one route-direction journey on a `service_date`.

**Identification Strategy** (in priority order):
1. **Ideal**: `bus_id` + scheduled trip match (GTFS `trip_id` via time proximity)
2. **Good**: `bus_id` + `route_id` + `direction` + `service_date` + time window clustering
3. **Fallback**: `route_id` + `direction` + `service_date` + boarding time clusters (no bus_id)

### 3.2 Clustering Algorithm (When bus_id Available)
```python
def reconstruct_trips(tickets: DataFrame, max_gap_minutes: int = 90) -> DataFrame:
    """
    Group tickets by bus_id, route, direction, date.
    Split into trips where boarding_time gap > max_gap_minutes.
    """
    tickets = tickets.sort_values(['bus_id', 'route_id', 'direction', 'service_date', 'boarding_time'])
    
    # Time gap between consecutive boardings on same bus
    tickets['time_gap'] = tickets.groupby(['bus_id', 'route_id', 'direction', 'service_date'])['boarding_time'].diff().dt.total_seconds() / 60
    
    # New trip when gap > threshold (bus returned to depot / layover)
    tickets['trip_num'] = (tickets['time_gap'] > max_gap_minutes).cumsum()
    
    tickets['trip_id'] = (
        tickets['bus_id'] + '_' + 
        tickets['route_id'] + '_' + 
        tickets['direction'] + '_' + 
        tickets['service_date'].dt.strftime('%Y%m%d') + '_' + 
        tickets['trip_num'].astype(str)
    )
    
    return tickets
```

### 3.3 Trip Validation
| Check | Threshold |
|-------|-----------|
| Min boardings per trip | ≥ 3 (otherwise likely noise) |
| Trip duration | 30 min – 4 hours (route-dependent) |
| Boarding sequence monotonic | ≥ 95% of tickets |

---

## 4. Handling Missing Alighting Data

### 4.1 Data Reality (Per Problem 3 Background)
- E-ticketing captures **~3–4% of total tickets**
- **Alighting stop recorded only for**: Mobile app tickets (tap-off), some ETM configurations
- **Typical coverage**: Boarding = 100% of e-tickets; Alighting = 10–30% of e-tickets

### 4.2 Strategy Matrix

| Alighting Data Available | Method | Output Level |
|--------------------------|--------|--------------|
| **Yes** (stop + time) | Direct cumulative sum (Section 5.1) | `measured_occupancy` |
| **Stop only, no time** | Cumulative sum with inferred alighting time (Section 5.2) | `measured_occupancy` |
| **No** (boarding only) | Inference via alighting distribution (Section 5.3) | `inferred_occupancy` |
| **No alighting + no stop seq** | Boarding demand proxy (Section 5.4) | `boarding_demand_proxy` |

---

## 5. Segment Load Computation Algorithms

### 5.1 Method A: Direct Cumulative Sum (Complete Board + Alight)

**Input**: Tickets with `boarding_seq`, `boarding_time`, `alighting_seq`, `alighting_time`, `trip_id`, `passenger_weight`

**Algorithm**:
```python
def compute_segment_load_direct(tickets: DataFrame) -> DataFrame:
    """
    For each trip, create events at each stop sequence:
    - Boarding: +weight at boarding_seq, boarding_time
    - Alighting: -weight at alighting_seq, alighting_time
    Sort by trip_id, stop_seq, event_time.
    Cumulative sum = onboard after each stop.
    """
    events = []
    
    for row in tickets.itertuples():
        # Boarding event
        events.append({
            'trip_id': row.trip_id,
            'stop_seq': row.boarding_seq,
            'event_time': row.boarding_time,
            'delta': row.passenger_weight,
            'event_type': 'board'
        })
        # Alighting event
        events.append({
            'trip_id': row.trip_id,
            'stop_seq': row.alighting_seq,
            'event_time': row.alighting_time,
            'delta': -row.passenger_weight,
            'event_type': 'alight'
        })
    
    events_df = DataFrame(events)
    events_df = events_df.sort_values(['trip_id', 'stop_seq', 'event_time'])
    
    # Cumulative onboard per trip
    events_df['onboard'] = events_df.groupby('trip_id')['delta'].cumsum()
    
    # Onboard AFTER leaving stop_seq = load on segment (stop_seq, stop_seq+1)
    # So we shift: segment load = onboard at stop_seq
    segment_loads = events_df[['trip_id', 'stop_seq', 'onboard', 'event_time']].copy()
    segment_loads['segment_id'] = segment_loads['trip_id'] + '_seg_' + segment_loads['stop_seq'].astype(str)
    
    # Add route, direction, time_band from trip_id or join
    segment_loads['time_band'] = segment_loads['event_time'].dt.floor('30min')
    
    return segment_loads
```

**Output per trip-segment**: `onboard` passenger count (weighted)

### 5.2 Method B: Alighting Stop Known, Time Missing

**Assumption**: Travel time between stops follows scheduled GTFS travel time + buffer.

```python
def infer_alighting_time(boarding_time: datetime, boarding_seq: int, alighting_seq: int, 
                          gtfs_stop_times: DataFrame) -> datetime:
    """
    Sum scheduled inter-stop times from boarding_seq to alighting_seq.
    Add 10% buffer for traffic.
    """
    inter_stop_times = gtfs_stop_times[
        (gtfs_stop_times['stop_sequence'] > boarding_seq) & 
        (gtfs_stop_times['stop_sequence'] <= alighting_seq)
    ]['travel_time_seconds'].sum()  # from GTFS shape_dist_traveled or scheduled
    
    return boarding_time + timedelta(seconds=inter_stop_times * 1.1)
```

Then apply Method A.

### 5.3 Method C: Alighting Inference via Distribution (Boarding Only)

**Core Idea**: Use historical / aggregate alighting patterns to probabilistically distribute boardings.

#### Step 1: Build Alighting Probability Matrix
```python
def build_alighting_matrix(historical_tickets: DataFrame) -> DataFrame:
    """
    historical_tickets: must have boarding_seq, alighting_seq, route_id, direction, time_band
    
    Returns: P(alight_seq | board_seq, route, direction, time_band)
    """
    # Only use tickets WITH alighting data
    with_alight = historical_tickets.dropna(subset=['alighting_seq'])
    
    counts = with_alight.groupby([
        'route_id', 'direction', 'boarding_seq', 'time_band', 'alighting_seq'
    ]).size().reset_index(name='count')
    
    totals = counts.groupby([
        'route_id', 'direction', 'boarding_seq', 'time_band'
    ])['count'].transform('sum')
    
    counts['prob'] = counts['count'] / totals
    
    # Smoothing: add pseudocount for unseen pairs (Laplace)
    # Merge with all possible (board_seq, alight_seq) pairs per route
    return counts[['route_id', 'direction', 'boarding_seq', 'time_band', 'alighting_seq', 'prob']]
```

#### Step 2: Apply to Boarding-Only Tickets
```python
def expand_boardings_with_alighting_probs(boardings: DataFrame, alighting_matrix: DataFrame) -> DataFrame:
    """
    Each boarding ticket expands into probabilistic alighting events.
    """
    expanded = boardings.merge(alighting_matrix, on=['route_id', 'direction', 'boarding_seq', 'time_band'])
    
    # Weight each alighting by probability
    expanded['alight_weight'] = expanded['passenger_weight'] * expanded['prob']
    
    # Create event stream
    events = []
    for row in expanded.itertuples():
        events.append({
            'route_id': row.route_id,
            'direction': row.direction,
            'time_band': row.time_band,
            'stop_seq': row.boarding_seq,
            'delta': row.passenger_weight,
            'source': 'board'
        })
        events.append({
            'route_id': row.route_id,
            'direction': row.direction,
            'time_band': row.time_band,
            'stop_seq': row.alighting_seq,
            'delta': -row.alight_weight,
            'source': 'alight_inferred'
        })
    
    events_df = DataFrame(events)
    events_df = events_df.groupby(['route_id', 'direction', 'time_band', 'stop_seq'])['delta'].sum().reset_index()
    events_df = events_df.sort_values(['route_id', 'direction', 'time_band', 'stop_seq'])
    
    # Cumulative sum = expected onboard
    events_df['expected_onboard'] = events_df.groupby(['route_id', 'direction', 'time_band'])['delta'].cumsum()
    
    return events_df
```

#### Step 3: Uncertainty Quantification
```python
def compute_load_variance(boardings: DataFrame, alighting_matrix: DataFrame) -> DataFrame:
    """
    Variance of onboard load per segment.
    For each boarding, variance contribution = weight^2 * p * (1-p) at each possible alight stop.
    Sum variances across independent boardings.
    """
    expanded = boardings.merge(alighting_matrix, on=['route_id', 'direction', 'boarding_seq', 'time_band'])
    
    # Variance of delta at each alight stop
    expanded['var_delta'] = (expanded['passenger_weight'] ** 2) * expanded['prob'] * (1 - expanded['prob'])
    
    # Aggregate variance per stop_seq
    var_by_stop = expanded.groupby(['route_id', 'direction', 'time_band', 'alighting_seq'])['var_delta'].sum().reset_index()
    var_by_stop.rename(columns={'alighting_seq': 'stop_seq', 'var_delta': 'var_at_stop'}, inplace=True)
    
    # Boarding variance (deterministic = 0, but include for completeness)
    board_var = boardings.groupby(['route_id', 'direction', 'time_band', 'boarding_seq'])['passenger_weight'].apply(
        lambda x: 0  # deterministic
    ).reset_index()
    board_var.rename(columns={'boarding_seq': 'stop_seq', 'passenger_weight': 'var_at_stop'}, inplace=True)
    
    all_var = pd.concat([var_by_stop, board_var]).groupby(['route_id', 'direction', 'time_band', 'stop_seq'])['var_at_stop'].sum().reset_index()
    all_var = all_var.sort_values(['route_id', 'direction', 'time_band', 'stop_seq'])
    
    # Cumulative variance = sum of variances up to that stop (independent events)
    all_var['cum_var'] = all_var.groupby(['route_id', 'direction', 'time_band'])['var_at_stop'].cumsum()
    all_var['std_dev'] = np.sqrt(all_var['cum_var'])
    
    return all_var[['route_id', 'direction', 'time_band', 'stop_seq', 'std_dev']]
```

### 5.4 Method D: Boarding Demand Proxy (No Alighting Data at All)

See `crowdedness-estimation-model.md` Section 6. Cumulative boarding count along route.

---

## 6. Aggregation to Route-Segment-Timeband Level

### 6.1 Input
Per-trip or per-route-direction segment loads (from Methods A–D)

### 6.2 Aggregation Function
```python
def aggregate_segment_loads(segment_loads: DataFrame, capacity_lookup: dict) -> DataFrame:
    """
    segment_loads columns: route_id, direction, segment_id, time_band, onboard, estimation_level
    capacity_lookup: {vehicle_type: capacity} or {route_id: typical_capacity}
    """
    # Percentiles per segment-timeband
    agg = segment_loads.groupby(['route_id', 'direction', 'segment_id', 'time_band', 'estimation_level'])['onboard'].agg([
        ('p10', lambda x: x.quantile(0.10)),
        ('p50', 'median'),
        ('p80', lambda x: x.quantile(0.80)),
        ('p90', lambda x: x.quantile(0.90)),
        ('p95', lambda x: x.quantile(0.95)),
        ('mean', 'mean'),
        ('std', 'std'),
        ('sample_count', 'count')
    ]).reset_index()
    
    # Add capacity
    agg['capacity'] = agg['route_id'].map(capacity_lookup).fillna(50)  # default standard bus
    
    # Load factors
    for pct in ['p50', 'p80', 'p95']:
        agg[f'load_factor_{pct}'] = agg[pct] / agg['capacity']
    
    # Crowdedness level (based on p80)
    def classify(lf):
        if lf < 0.3: return 1
        elif lf < 0.5: return 2
        elif lf < 0.7: return 3
        elif lf < 0.9: return 4
        else: return 5
    
    agg['crowdedness_level'] = agg['load_factor_p80'].apply(classify)
    agg['crowdedness_label'] = agg['crowdedness_level'].map({
        1: 'comfortable', 2: 'moderate', 3: 'crowded', 4: 'very_crowded', 5: 'crush'
    })
    
    # Uncertainty flag
    agg['uncertainty_flag'] = (agg['std'] / agg['p50'] > 0.3) | (agg['sample_count'] < 10)
    
    return agg
```

---

## 7. Output Schema (Final Load Estimates)

| Column | Type | Description |
|--------|------|-------------|
| `route_id` | string | e.g., `724` |
| `direction` | string | `UP` / `DOWN` |
| `segment_id` | string | `724_UP_seg_12` (stop_seq 12→13) |
| `from_stop_id` | string | Boarding stop of segment |
| `to_stop_id` | string | Alighting stop of segment |
| `segment_length_m` | int | Geodesic meters |
| `time_band` | string | `08:00-08:30` |
| `day_type` | enum | `weekday` / `saturday` / `sunday` |
| `estimation_level` | enum | `measured_occupancy` / `inferred_occupancy` / `boarding_demand_proxy` / `ticket_volume_proxy` |
| `p10_load` | float | 10th percentile onboard |
| `p50_load` | float | Median onboard |
| `p80_load` | float | 80th percentile (design load) |
| `p90_load` | float | 90th percentile |
| `p95_load` | float | 95th percentile |
| `mean_load` | float | Mean onboard |
| `std_load` | float | Std deviation |
| `capacity` | int | Vehicle capacity |
| `load_factor_p50` | float | `p50_load / capacity` |
| `load_factor_p80` | float | `p80_load / capacity` |
| `load_factor_p95` | float | `p95_load / capacity` |
| `crowdedness_level` | int | 1–5 |
| `crowdedness_label` | string | `comfortable` ... `crush` |
| `sample_count` | int | Number of trips / observations |
| `uncertainty_flag` | bool | High uncertainty warning |
| `last_updated` | timestamp | IST |

---

## 8. Data Quality & Validation Rules

| Rule | Check | Action |
|------|-------|--------|
| Load ≤ capacity × 1.5 | `p95_load <= capacity * 1.5` | Flag if violated (data error or crush) |
| Monotonic segment load | `p50_load(seg_i) >= p50_load(seg_{i-1}) - boardings_at_i` | Warn if violated |
| Minimum samples | `sample_count >= 5` for Level 1; `>= 20` for Level 2 | Suppress or flag |
| Time band coverage | All 40 bands (04:00–24:00) present per route-daytype | Fill gaps with interpolation |

---

## 9. Computational Considerations

| Aspect | Estimate |
|--------|----------|
| Input tickets (Oct) | 2.56M |
| Expanded events (Method C) | ~2.56M × avg_alighting_options (≈5) = ~12M rows |
| Groupby aggregation | < 30 sec on 8-core / 32GB (polars/DuckDB) |
| Output rows (segments × timebands × daytypes) | ~500 routes × 40 segments × 40 bands × 3 daytypes ≈ 2.4M rows |

**Recommended Engine**: Polars (streaming) or DuckDB (out-of-core) for aggregation; Python for probabilistic expansion.

---

## 10. Integration Points

| Upstream | Downstream |
|----------|------------|
| `eticketing-ingestion-design.md` (validated, enriched tickets) | `crowdedness-estimation-model.md` (consumes segment loads) |
| GTFS stop_times, trips, shapes | Journey Planner API (`crowdedness-api.yaml`) |
| Fleet registry (capacity) | Analytics / Dashboard |

---

## 11. Open Questions

1. **GTFS alignment**: Do ETM `stop_id` codes match GTFS `stop_id`? Mapping table needed?
2. **Bus_id reliability**: Is `bus_id` consistently recorded? What % missing?
3. **Trip detection**: What's the actual layover time distribution? (Affects `max_gap_minutes`)
4. **Alighting matrix sparsity**: For rare boarding stops, how to handle zero observations?
5. **Capacity per trip**: Can we join `bus_id` → fleet registry for actual capacity vs. route default?