# Crowdedness Estimation Model Design

**Project**: Intelligent Bus Mobility & Crowdedness-Aware Journey Planner (Delhi)
**Task**: BUS-001 — Problem 2: Crowdedness-Aware Journey Planner
**Branch**: feature/BUS-001-problem2-crowdedness
**Version**: 1.0 (Design Phase)

---

## 1. Problem Statement

Estimate **on-vehicle crowdedness** (occupancy level) for each bus route, direction, segment, and time band using e-ticketing / ETM data, acknowledging that:

> **Per PROJECT.md**: "Ticket records are not automatically a complete count of onboard passengers. Segment occupancy requires boarding and alighting information or another defensible load-estimation source. Without boarding/alighting stop data, label results as **demand/crowding proxies**, not measured segment occupancy."

---

## 2. Estimation Hierarchy (Best → Fallback)

| Level | Input Data | Method | Output Label |
|-------|------------|--------|--------------|
| **L1: Measured Segment Load** | Boarding + alighting stop + time per ticket | Cumulative sum per vehicle trip | `measured_occupancy` |
| **L2: Inferred Segment Load** | Boarding stop + time only; alighting inferred from route pattern | Probabilistic alighting distribution + cumulative sum | `inferred_occupancy` |
| **L3: Boarding Demand Proxy** | Boarding stop + time only (no alighting) | Boarding count per route/time band | `boarding_demand_proxy` |
| **L4: Ticket Volume Proxy** | Aggregated ticket count per route/time band | Simple ticket count normalization | `ticket_volume_proxy` |

**Rule**: Always emit the **highest available level** per route-segment-timeband, with explicit `estimation_level` field.

---

## 3. Core Concepts

### 3.1 Time Bands
- **Granularity**: 30-minute buckets (configurable: 15/30/60 min)
- **Window**: 04:00–24:00 (Delhi bus operating hours)
- **Labels**: `04:00-04:30`, `04:30-05:00`, ..., `23:30-24:00`
- **Weekday vs Weekend**: Separate profiles (Mon–Fri, Sat, Sun/holiday)

### 3.2 Segments
- **Definition**: Ordered pair of consecutive stops on a route-direction: `(stop_i, stop_{i+1})`
- **Identifier**: `segment_id = route_direction_id + "_" + stop_sequence_i + "_" + stop_sequence_{i+1}`
- **Length**: Geodesic distance (meters) from GTFS shapes or stop lat/lon

### 3.3 Vehicle Trip
- **Definition**: One bus completing one full route-direction journey
- **Key**: `(bus_id, route_id, direction, service_date, trip_start_time)`
- **Note**: ETM data may not reliably link tickets to specific vehicle trips; use `bus_id` + time window as proxy.

---

## 4. Level 1: Measured Segment Load (Gold Standard)

### 4.1 Requirements
- Each ticket has: `boarding_stop_seq`, `boarding_time`, `alighting_stop_seq`, `alighting_time`
- Tickets linkable to same vehicle trip (`bus_id` + time window)

### 4.2 Algorithm
```python
def compute_measured_load(tickets: DataFrame) -> DataFrame:
    """
    tickets columns: trip_id, boarding_seq, alighting_seq, passenger_weight, boarding_time
    """
    # For each trip, create boarding (+weight) and alighting (-weight) events at stop sequences
    events = []
    for row in tickets.itertuples():
        events.append((row.trip_id, row.boarding_seq, row.boarding_time, +row.passenger_weight))
        events.append((row.trip_id, row.alighting_seq, row.alighting_time, -row.passenger_weight))
    
    events_df = DataFrame(events, columns=['trip_id', 'stop_seq', 'event_time', 'delta'])
    events_df = events_df.sort_values(['trip_id', 'stop_seq', 'event_time'])
    
    # Cumulative sum per trip across stop sequence
    events_df['onboard'] = events_df.groupby('trip_id')['delta'].cumsum()
    
    # Map to segments: onboard after leaving stop_i = load on segment (i, i+1)
    segments = events_df[['trip_id', 'stop_seq', 'onboard']].copy()
    segments['segment_id'] = segments['trip_id'] + '_seg_' + segments['stop_seq'].astype(str)
    
    # Aggregate: median/percentiles per route-direction-segment-timeband
    segments['time_band'] = segments['event_time'].dt.floor('30min')
    result = segments.groupby(['route_id', 'direction', 'segment_id', 'time_band'])['onboard'].agg([
        ('p50', 'median'),
        ('p80', lambda x: x.quantile(0.8)),
        ('p95', lambda x: x.quantile(0.95)),
        ('sample_count', 'count')
    ]).reset_index()
    
    result['estimation_level'] = 'measured_occupancy'
    return result
```

### 4.3 Output Metrics per Segment-Timeband
| Metric | Description |
|--------|-------------|
| `p50_load` | Median onboard passengers |
| `p80_load` | 80th percentile (design for "typical busy") |
| `p95_load` | 95th percentile (design for "peak crush") |
| `capacity` | Vehicle capacity (from fleet registry: standard=50, articulated=80, mini=30) |
| `load_factor_p50` | `p50_load / capacity` |
| `load_factor_p80` | `p80_load / capacity` |
| `sample_trips` | Number of observed trips in this bucket |

---

## 5. Level 2: Inferred Segment Load (Alighting Inference)

### 5.1 When to Use
- Boarding stop + time present
- Alighting stop **missing** or unreliable
- Route has stable alighting patterns (e.g., major destinations)

### 5.2 Alighting Inference Methods

#### Method A: Historical Alighting Distribution (Preferred)
```python
# From historical data (or GTFS ride-check surveys), compute:
# P(alight_at_stop_j | board_at_stop_i, route, direction, time_band)
alighting_probs = historical_tickets.groupby(
    ['route_id', 'direction', 'boarding_stop_seq', 'time_band', 'alighting_stop_seq']
).size().reset_index(name='count')

alighting_probs['prob'] = alighting_probs.groupby(
    ['route_id', 'direction', 'boarding_stop_seq', 'time_band']
)['count'].transform(lambda x: x / x.sum())
```

#### Method B: Gravity Model (If No Historical Alighting)
- Attractiveness ∝ stop activity (total boardings + alightings at stop)
- Distance decay: `exp(-α * stop_distance)`
- Normalize per boarding stop

#### Method C: Uniform to Terminal (Fallback)
- Assume all passengers alight at last stop (overestimates load)

### 5.3 Algorithm
```python
def compute_inferred_load(boardings: DataFrame, alighting_probs: DataFrame) -> DataFrame:
    """
    boardings: ticket_id, route_id, direction, boarding_seq, boarding_time, passenger_weight
    alighting_probs: route_id, direction, boarding_seq, time_band, alighting_seq, prob
    """
    # Expand each boarding into probabilistic alighting events
    expanded = boardings.merge(alighting_probs, on=['route_id', 'direction', 'boarding_seq', 'time_band'])
    expanded['weighted_delta_board'] = expanded['passenger_weight']  # at boarding_seq
    expanded['weighted_delta_alight'] = -expanded['passenger_weight'] * expanded['prob']  # at alighting_seq
    
    # Create event stream
    events = []
    for row in expanded.itertuples():
        events.append((row.route_id, row.direction, row.time_band, row.boarding_seq, row.weighted_delta_board))
        events.append((row.route_id, row.direction, row.time_band, row.alighting_seq, row.weighted_delta_alight))
    
    events_df = DataFrame(events, columns=['route_id', 'direction', 'time_band', 'stop_seq', 'delta'])
    events_df = events_df.groupby(['route_id', 'direction', 'time_band', 'stop_seq'])['delta'].sum().reset_index()
    events_df = events_df.sort_values(['route_id', 'direction', 'time_band', 'stop_seq'])
    
    # Cumulative sum per route-direction-timeband
    events_df['onboard'] = events_df.groupby(['route_id', 'direction', 'time_band'])['delta'].cumsum()
    
    # Map to segments
    result = events_df[['route_id', 'direction', 'time_band', 'stop_seq', 'onboard']].copy()
    result['segment_id'] = result['route_id'] + '_' + result['direction'] + '_seg_' + result['stop_seq'].astype(str)
    result['estimation_level'] = 'inferred_occupancy'
    
    return result.groupby(['route_id', 'direction', 'segment_id', 'time_band'])['onboard'].agg([
        ('p50_load', 'median'),  # actually expected value
        ('sample_count', 'count')
    ]).reset_index()
```

### 5.4 Uncertainty Quantification
- Propagate alighting probability variance
- Output: `load_std_dev` per segment-timeband
- Flag: `high_uncertainty = (load_std_dev / p50_load > 0.3)`

---

## 6. Level 3: Boarding Demand Proxy (No Alighting Data)

### 6.1 When to Use
- Only boarding stop + time available
- No reliable alighting inference possible

### 6.2 Method
```python
def compute_boarding_demand_proxy(boardings: DataFrame) -> DataFrame:
    """
    Aggregate boardings per route-direction-stop-timeband
    """
    boardings['time_band'] = boardings['boarding_time'].dt.floor('30min')
    
    # Boarding count per stop per timeband
    stop_boardings = boardings.groupby([
        'route_id', 'direction', 'boarding_stop_id', 'time_band'
    ])['passenger_weight'].sum().reset_index()
    stop_boardings.rename(columns={'passenger_weight': 'boarding_demand'}, inplace=True)
    
    # Cumulative boarding demand along route (proxy for load leaving each stop)
    stop_boardings = stop_boardings.sort_values(['route_id', 'direction', 'time_band', 'stop_sequence'])
    stop_boardings['cumulative_boarding'] = stop_boardings.groupby(
        ['route_id', 'direction', 'time_band']
    )['boarding_demand'].cumsum()
    
    # Map to segments: cumulative after stop_i = demand proxy for segment (i, i+1)
    stop_boardings['segment_id'] = stop_boardings['route_id'] + '_' + stop_boardings['direction'] + '_seg_' + stop_boardings['stop_sequence'].astype(str)
    stop_boardings['estimation_level'] = 'boarding_demand_proxy'
    
    return stop_boardings[['route_id', 'direction', 'segment_id', 'time_band', 'boarding_demand', 'cumulative_boarding', 'estimation_level']]
```

### 6.3 Interpretation
- `cumulative_boarding` = **upper bound** on segment load (assumes no one alights)
- Use only for **relative comparison** (route A vs route B at same time)
- **Never** present as absolute occupancy

---

## 7. Level 4: Ticket Volume Proxy (Aggregate Only)

### 7.1 When to Use
- No stop-level data (only route + time aggregates)
- Fallback for routes with zero e-ticketing coverage

### 7.2 Method
```python
def compute_ticket_volume_proxy(tickets: DataFrame) -> DataFrame:
    tickets['time_band'] = tickets['boarding_time'].dt.floor('30min')
    
    result = tickets.groupby(['route_id', 'direction', 'time_band']).agg(
        ticket_count=('ticket_id', 'count'),
        total_weight=('passenger_weight', 'sum')
    ).reset_index()
    
    result['estimation_level'] = 'ticket_volume_proxy'
    return result
```

### 7.3 Interpretation
- Only usable for **temporal patterns** on same route (e.g., "8 AM is 3× busier than 11 AM")
- **Not comparable across routes** (different lengths, demand, e-ticketing adoption)

---

## 8. Crowdedness Level Classification (Output for Journey Planner)

| Load Factor (p80 / capacity) | Level | Label | Journey Planner Weight |
|------------------------------|-------|-------|------------------------|
| < 0.3 | 1 | `comfortable` | 1.0 (base) |
| 0.3 – 0.5 | 2 | `moderate` | 1.15 |
| 0.5 – 0.7 | 3 | `crowded` | 1.35 |
| 0.7 – 0.9 | 4 | `very_crowded` | 1.6 |
| ≥ 0.9 | 5 | `crush` | 2.0 |

> **Note**: Load factor uses `p80_load` (design for typical busy conditions), not median.

### 8.1 Output Schema (Per Route-Direction-Segment-Timeband)
```json
{
  "route_id": "724",
  "direction": "UP",
  "segment_id": "724_UP_seg_12",
  "time_band": "08:00-08:30",
  "day_type": "weekday",
  "estimation_level": "inferred_occupancy",
  "p50_load": 28.4,
  "p80_load": 42.1,
  "p95_load": 55.3,
  "capacity": 50,
  "load_factor_p50": 0.57,
  "load_factor_p80": 0.84,
  "load_factor_p95": 1.11,
  "crowdedness_level": 4,
  "crowdedness_label": "very_crowded",
  "sample_trips": 47,
  "uncertainty_flag": false,
  "last_updated": "2026-10-31T00:00:00+05:30"
}
```

---

## 9. Model Training / Calibration (Future)

| Component | Approach |
|-----------|----------|
| **Alighting distribution** | EM algorithm on boarding-only data + partial alighting observations |
| **Capacity per trip** | Join with fleet registry (bus_id → vehicle_type → capacity) |
| **Seasonal adjustment** | Monthly coefficients (Oct baseline, adjust for Dec/Jan winter, Apr/May summer) |
| **Special events** | Calendar overlay (holidays, cricket matches, metro closures) |
| **Validation** | Compare against manual ride-check surveys (if available) |

---

## 10. Pipeline Schedule

| Stage | Frequency | Trigger |
|-------|-----------|---------|
| Raw ingestion | Daily (next-day) | ETM dump arrival |
| Level 1–4 computation | Daily | After ingestion complete |
| Aggregation to API tables | Daily | After computation |
| Model retraining (alighting probs) | Weekly | Sunday 03:00 |

---

## 11. Data Limitations & Labels (Mandatory)

Per **PROJECT.md**, every output **must** include:
1. `estimation_level` field (one of 4 levels above)
2. `sample_trips` or `sample_count` — transparency on data support
3. `uncertainty_flag` — true if high uncertainty (Level 2+ with low samples)
4. **Documentation**: "This is a **demand/crowding proxy**, not measured segment occupancy. Based on e-ticketing data covering ~3–4% of total tickets."

---

## 12. Open Questions

1. **Vehicle capacity data** — source? Per-bus or per-route-type?
2. **Trip identification** — can we reliably group tickets by vehicle trip (`bus_id` + time window)?
3. **Alighting data coverage** — what % of October tickets have alighting stop?
4. **GTFS alignment** — stop sequences from GTFS `stop_times` vs ETM stop codes?
5. **Minimum sample threshold** — below what `sample_trips` do we suppress output?