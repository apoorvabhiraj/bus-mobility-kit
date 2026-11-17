# Problem 1 — GPS Data Pipeline & Travel-Time Estimation: Design Summary

**Bot:** Tuli (Personal bot, OpenMausBot)
**Task:** BUS-001 (Problem 1 — Bus Travel-Time Planner)
**Branch:** `feature/BUS-001-problem1-gps`
**Working folder:** `C:\Users\apoor\.openmausbot\task-workspaces\e9434573-4ccf-40c0-a8dd-745dcbb3f6d8\dce72348-57ee-49cc-aa0e-11bebd0000e0`
**Date:** 2026-11-18

## Deliverables produced (design only)

| # | Deliverable | File |
|---|-------------|------|
| 1 | Data ingestion design (one SQLite DB per day, 1–31 Oct 2026; vehicle positions, routes, stops) | `docs/data-ingestion-design.md` |
| 2 | Travel-time estimation model (road-segment times from GPS, sparse handling, historical patterns) | `docs/travel-time-estimation-design.md` |
| 3 | Route/stop topology extraction (road/time graph from GPS + route + stop) | `docs/route-stop-topology-design.md` |
| 4 | API contract — travel-time service (two locations → journey options with times) | `schemas/contracts/travel-time-openapi.yaml` |
| 5 | Assumptions, data limitations, uncertainty | `docs/limitations-and-uncertainty.md` |

## Key design decisions

- **One SQLite database per day** (`data/warehouse/YYYY-MM-DD.sqlite`), each self-contained with `vehicle_positions`, `routes`, `stops`, `route_stops`, `ingestion_meta`, `ingestion_errors`; indexed by `(vehicle_id, timestamp)`, `(route_id, timestamp)`, and location.
- **Travel time derived from timestamps between map-matched consecutive fixes on the same road segment** (not from `speed_kmh` alone), aggregated by segment × day_type × 30-minute time bucket, with median/p10/p90 and confidence.
- **Sparse observations handled by temporal smoothing, spatial (road-class) smoothing, rolling 7-day historical profile, and free-flow fallback**, with `no_data` where nothing is defensible.
- **Graph nodes = stops + road junctions; edges = road / route / walk / transfer**, all time-dependent from the travel-time table.
- **API:** `POST /journey/travel-time` (OpenAPI 3.0) → journey options with `estimated_travel_time_s`, confidence, segment breakdown, coverage note.

## Constraints honored

- AGENTS.md: dedicated branch `feature/BUS-001-problem1-gps`; one active editor (this bot); no shared-file overwrite.
- SOUL.md / PROJECT.md: design documents only; repository truth outranks conversation assumptions; unknowns reported; the governing caveat (GPS supports only observed roads/times) is documented.
- **The 124 GB GPS dataset was NOT downloaded or unpacked.** Design only.
- Did not touch another teammate's assigned files (Problem 2 / ticketing is out of scope here).

## What remains unverified

- Raw GPS record schema (column names, file format) — parser must be parameterized once the kit schema is confirmed.
- Route/stop reference data source (separate archive vs derived from GPS).
- The external Delhi road network for map-matching is assumed to exist but has not been confirmed as available.
- No code has been written or run; this is a design specification awaiting implementation.
