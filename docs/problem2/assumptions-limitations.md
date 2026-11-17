# Assumptions, Data Limitations & Uncertainty Documentation

**Project**: Intelligent Bus Mobility & Crowdedness-Aware Journey Planner (Delhi)
**Task**: BUS-001 — Problem 2: Crowdedness-Aware Journey Planner
**Branch**: feature/BUS-001-problem2-crowdedness
**Version**: 1.0 (Design Phase)

---

## 1. Core Assumptions

### 1.1 E-Ticketing Data Representativeness
| Assumption | Rationale | Risk if Wrong |
|------------|-----------|---------------|
| E-ticketing passengers have similar boarding/alighting patterns as cash passengers | No evidence of systematic difference; both use same stops | If e-ticket users concentrate on certain corridors (e.g., metro feeders), load estimates biased |
| Ticket `passenger_weight` (1.0 adult, 0.5 child) approximates space occupancy | Standard practice in transit planning | Children may occupy more space per person (strollers, accompanying adult) |
| `bus_id` in ETM data reliably identifies a physical vehicle | Required for trip reconstruction | If `bus_id` is conductor ID or depot code, trip clustering fails |
| October 2026 is representative of typical operations | Single month design baseline | Festival season (Diwali ~Oct 20), exams, weather may distort |

### 1.2 Alighting Inference
| Assumption | Method | Risk if Wrong |
|------------|--------|---------------|
| Historical alighting distribution (from partial data) applies to boarding-only tickets | Method C in boarding-alighting-load-estimation.md | If alighting patterns shift (new metro station, land use change), inference drifts |
| Travel time between stops follows GTFS schedule + 10% buffer | Method B | Real traffic highly variable; 10% may be low for peak, high for off-peak |
| Unobserved alighting pairs have uniform low probability (Laplace smoothing) | Method C matrix building | May create "ghost alightings" at terminal stops |

### 1.3 Vehicle Capacity
| Assumption | Source | Risk if Wrong |
|------------|--------|---------------|
| Standard bus = 50, Articulated = 80, Mini = 30 (pax) | Delhi fleet norms | Actual crush capacity may be 1.5×; load factors underestimated |
| Capacity per trip = route typical (not bus-specific) | Fleet registry join may be incomplete | Articulated on standard route → overestimates crowding |

### 1.4 Time Band Aggregation
| Assumption | Detail | Risk if Wrong |
|------------|--------|---------------|
| 30-minute buckets capture meaningful variation | 48 bands/day (04:00–24:00) | Short peaks (15 min) smoothed out; may miss "crush" windows |
| Weekday / Saturday / Sunday sufficient day types | 3 profiles | Holiday, exam season, special events not captured |

---

## 2. Data Limitations (Per PROJECT.md & Problem 3 Background)

### 2.1 Coverage Limitation — **Critical**
> **E-ticketing captures only ~3–4% of total bus tickets** (Problem 3 background).

Implications:
- **Sample size**: 2.56M tickets / month ≈ 85k/day. At 3–4% coverage → ~2.5M total daily tickets.
- **Per route-day-band**: Many route-timeband cells will have **< 10 observed tickets**.
- **Statistical power**: Low for rare routes, off-peak, weekends.
- **Bias risk**: E-ticket adoption likely higher on:
  - Metro feeder routes (tech-savvy commuters)
  - AC/premium routes
  - Younger demographic corridors
  - → **Systematic underestimation** of crowding on cash-heavy routes (trunk routes, low-income areas)

### 2.2 Alighting Data Gap
- **Boarding stop**: Recorded for ~100% of e-tickets (tap-on)
- **Alighting stop**: Recorded only for:
  - Mobile app tickets with tap-off (~15–20% of e-tickets)
  - ETM devices with alighting registration (rare in Delhi)
- **Result**: >80% of e-tickets are **boarding-only** → Level 2/3 estimation for most data.

### 2.3 Trip Reconstruction Uncertainty
- `bus_id` may not equal vehicle ID (could be conductor, depot, or ETM device ID)
- Layover detection threshold (`max_gap_minutes`) is heuristic
- No GPS validation of trip boundaries in this phase

### 2.4 Stop & Route Alignment
- ETM `stop_id` codes may not match GTFS `stop_id`
- Route variants (express, limited-stop) may share `route_id` but differ in stop sequence
- Direction coding (UP/DOWN vs 1/2) may be inconsistent

### 2.5 Temporal Limitations
- **Single month** (October 2026) — no seasonal validation
- **No year-over-year** comparison
- **Special events** in October (Diwali, festivals) may distort "typical" patterns

---

## 3. Uncertainty Quantification by Estimation Level

| Level | Method | Typical Uncertainty (CV*) | Primary Uncertainty Sources |
|-------|--------|---------------------------|----------------------------|
| **L1: Measured** | Direct board+alight cumulative | 15–25% | Trip reconstruction errors, weight assumptions, small sample |
| **L2: Inferred** | Boarding + alighting prob matrix | 30–50% | Alighting matrix sparsity, stationarity assumption, smoothing |
| **L3: Boarding Proxy** | Cumulative boardings only | 50–100%+ | **No alighting data** → upper bound only, not actual load |
| **L4: Volume Proxy** | Aggregate ticket count | N/A (not comparable) | **No stop/segment resolution** — only temporal pattern |

*CV = Coefficient of Variation (std/mean) of load estimate across samples.

### 3.1 Uncertainty Flags in Output
Every API response includes:
- `estimation_level` — **must be checked by consumers**
- `sample_count` — raw observation count
- `uncertainty_flag` — `true` if `std/p50 > 0.3` OR `sample_count < 10` (L1) / `< 20` (L2)
- `disclaimer` — mandatory text per PROJECT.md

---

## 4. Where Uncertainty is Highest (Priority Order)

### 4.1 Highest Uncertainty
1. **Routes with zero e-ticketing coverage** → Level 4 only (or no data)
2. **Off-peak / night time bands** (22:00–04:00) → Very low samples
3. **Weekend / holiday profiles** → 2–3× fewer weekdays in month
4. **Long routes with many segments** → Sparse boarding per segment
5. **Cash-heavy corridors** (low e-ticket adoption) → Systematic bias

### 4.2 Moderate Uncertainty
6. **Peak hours on trunk routes** → Better samples but alighting inference still dominant
7. **Routes with partial alighting data** → Level 2, matrix sparsity at tail stops
8. **Articulated bus routes** → Capacity uncertainty if fleet registry incomplete

### 4.3 Lower Uncertainty (Relatively)
9. **Peak AM/PM on metro-feeder routes** → High e-ticket adoption, decent alighting data
10. **Short routes (≤15 km)** → Fewer segments, more boardings per segment

---

## 5. Mitigation Strategies (Design Phase)

| Limitation | Mitigation in Design |
|------------|---------------------|
| Low coverage (3–4%) | Explicit `estimation_level` + `sample_count` in every output; journey planner weights by confidence |
| Alighting gap | Probabilistic inference (Method C) with uncertainty propagation; never present Level 3 as actual load |
| Single month | Design for incremental daily updates; weekly model retrain; seasonal coefficients placeholder |
| Stop/route misalignment | Mapping tables as separate data product; validation checks in ingestion |
| Trip reconstruction | Multiple strategies (bus_id, time clustering); validation metrics logged |
| Capacity uncertainty | Per-bus capacity from fleet registry join; default conservative (50) |

---

## 6. Required Disclaimers (Non-Negotiable)

### 6.1 In Every API Response
> "This is a demand/crowding proxy based on e-ticketing data covering ~3–4% of total tickets. Not measured segment occupancy."

### 6.2 In Documentation / Dashboard
> **Crowdedness estimates are derived from electronic ticketing data representing approximately 3–4% of total bus ridership. They reflect boarding demand patterns, not measured on-vehicle passenger counts. Actual crowdedness may differ significantly, especially on routes with low e-ticket adoption. Use for relative comparison (route A vs route B, 8 AM vs 11 AM) only. Do not use for capacity planning or safety decisions without validation.**

### 6.3 In Journey Planner UI
> ⚠️ "Crowdedness levels are estimates based on limited ticketing data. Actual conditions may vary."

---

## 7. Validation Requirements (Before Production)

| Validation | Method | Success Criterion |
|------------|--------|-------------------|
| **Ride-check surveys** | Manual onboard counts on sample trips | L1 estimates within ±20% of observed |
| **Alighting matrix holdout** | Train on 80%, test on 20% of tickets with alighting | Top-1 alighting stop accuracy > 65% |
| **Temporal stability** | Compare Week 1 vs Week 4 estimates | Correlation > 0.8 for peak bands |
| **Cross-route consistency** | Parallel routes serving same OD | Relative ranking matches expectation |
| **Capacity sanity** | `p95_load` should not exceed 1.5× capacity | < 5% of segment-timebands violated |

---

## 8. Future Improvements (Out of Scope for Design Phase)

1. **GPS-APC fusion**: Combine vehicle location + automatic passenger counters (if deployed)
2. **Smart card tap-off**: Expand alighting coverage via NCMC / Metro card integration
3. **Deep learning imputation**: Spatio-temporal GNN for alighting inference
4. **Real-time adjustment**: GTFS-RT trip updates + current load → nowcast
5. **Passenger survey calibration**: Stated preference for crowding tolerance → weight factors
6. **Multi-month seasonality**: Annual model with Fourier terms / holiday calendar

---

## 9. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-11-18 | 4-level estimation hierarchy | Transparent degradation from measured → proxy |
| 2026-11-18 | p80_load for classification | Design for "typical busy" not median |
| 2026-11-18 | Mandatory `estimation_level` in API | Consumers must know confidence |
| 2026-11-18 | 30-min time bands | Balance granularity vs sample size |
| 2026-11-18 | Disclaimer in every response | PROJECT.md compliance; legal/ethical |

---

## 10. References

- `PROJECT.md` — Data caveats (Sections 10–12)
- `ARCHITECTURE.md` — Module 3: Ticketing/passenger processing and occupancy estimation
- `eticketing-ingestion-design.md` — Input data pipeline
- `crowdedness-estimation-model.md` — Estimation algorithms
- `boarding-alighting-load-estimation.md` — Load computation methods
- `schemas/contracts/crowdedness-api.yaml` — API contract with disclaimers